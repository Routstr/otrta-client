use crate::{
    db::{
        user_search_groups::{
            create_conversation, delete_search_group, get_search_groups, update_search_group_name,
        },
        user_searches::{
            complete_search, create_pending_search, delete_search, get_pending_searches,
            get_search_by_id, get_searches, update_search_status,
        },
    },
    models::AppState,
    search::{perform_web_search, perform_web_search_with_llm, SearchRequest},
};
use axum::extract::Path;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{self, json};
use std::sync::Arc;

#[derive(Deserialize)]
pub struct SearchParams {
    group_id: Option<String>,
}

#[derive(Serialize)]
pub struct SearchResultResponse {
    id: String,
    query: String,
    response: serde_json::Value,
    created_at: String,
}

#[derive(Serialize)]
pub struct GetSearchesResponse {
    group_id: String,
    searches: Vec<SearchResultResponse>,
}

async fn process_search_background(
    state: Arc<AppState>,
    search_id: uuid::Uuid,
    request: SearchRequest,
    user_context: crate::models::UserContext,
) {
    update_search_status(
        &state.db,
        search_id,
        "processing",
        Some(chrono::Utc::now().naive_utc()),
        None,
        None,
    )
    .await;

    let user_id = user_context.npub.clone();
    let _group_id = uuid::Uuid::parse_str(&request.group_id).unwrap();

    let (response, error_msg) = if request.model_id.is_some() {
        match perform_web_search_with_llm(
            &state,
            &request.message,
            request.urls,
            request.conversation.as_deref(),
            request.model_id.as_deref(),
            &user_context.organization_id,
            Some(&user_id),
        )
        .await
        {
            Ok(resp) => (Some(resp), None),
            Err(e) => (None, Some(format!("{}", e))),
        }
    } else {
        match perform_web_search(&request.message, request.urls).await {
            Ok(resp) => (Some(resp), None),
            Err(e) => (None, Some(format!("{}", e))),
        }
    };

    if let Some(response) = response {
        if response.message.contains("{\"error\"") || response.message.contains("\"type\":\"") {
            update_search_status(
                &state.db,
                search_id,
                "failed",
                None,
                Some(chrono::Utc::now().naive_utc()),
                Some("Search processing failed"),
            )
            .await;
        } else {
            complete_search(&state.db, search_id, response).await;
        }
    } else if let Some(error_message) = error_msg {
        update_search_status(
            &state.db,
            search_id,
            "failed",
            None,
            Some(chrono::Utc::now().naive_utc()),
            Some(&error_message),
        )
        .await;
    }
}

pub async fn search_handler(
    State(state): State<Arc<AppState>>,
    axum::extract::Extension(user_context): axum::extract::Extension<crate::models::UserContext>,
    Json(request): Json<SearchRequest>,
) -> Response {
    let user_id = user_context.npub.clone();
    let group_id = match uuid::Uuid::parse_str(&request.group_id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": {
                        "message": "Invalid group_id format",
                        "type": "invalid_request"
                    }
                })),
            )
                .into_response()
        }
    };

    let search_id =
        create_pending_search(&state.db, &request.message, user_id.clone(), group_id).await;

    let state_clone = state.clone();
    let request_clone = request.clone();
    let user_context_clone = user_context.clone();

    tokio::spawn(async move {
        process_search_background(state_clone, search_id, request_clone, user_context_clone).await;
    });

    let response = SearchResultResponse {
        id: search_id.to_string(),
        query: request.message,
        response: serde_json::to_value(&json!({
            "message": "Search queued for processing",
            "sources": null
        }))
        .unwrap(),
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    Json(response).into_response()
}

pub async fn get_searches_handler(
    State(state): State<Arc<AppState>>,
    axum::extract::Extension(user_context): axum::extract::Extension<crate::models::UserContext>,
    Query(params): Query<SearchParams>,
) -> Response {
    let user_id = user_context.npub.clone();
    let group_id = if let Some(gid) = params.group_id {
        match uuid::Uuid::parse_str(&gid) {
            Ok(id) => Some(id),
            Err(_) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({
                        "error": {
                            "message": "Invalid group_id format",
                            "type": "invalid_request"
                        }
                    })),
                )
                    .into_response()
            }
        }
    } else {
        None
    };

    let result = get_searches(&state.db, group_id, user_id).await;

    let searches: Vec<SearchResultResponse> = result
        .user_search
        .into_iter()
        .map(|search| SearchResultResponse {
            id: search.id.to_string(),
            query: search.name,
            response: serde_json::to_value(&search.search).unwrap(),
            created_at: search.created_at.to_rfc3339(),
        })
        .collect();

    let response = GetSearchesResponse {
        group_id: result.group_id.to_string(),
        searches,
    };

    Json(response).into_response()
}

#[derive(Deserialize)]
pub struct DeleteSearchRequest {
    id: String,
    group_id: String,
}

pub async fn delete_search_handler(
    State(state): State<Arc<AppState>>,
    axum::extract::Extension(user_context): axum::extract::Extension<crate::models::UserContext>,
    Json(request): Json<DeleteSearchRequest>,
) -> Response {
    let user_id = user_context.npub.clone();
    let search_id = match uuid::Uuid::parse_str(&request.id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": {
                        "message": "Invalid search_id format",
                        "type": "invalid_request"
                    }
                })),
            )
                .into_response()
        }
    };

    let group_id = match uuid::Uuid::parse_str(&request.group_id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": {
                        "message": "Invalid group_id format",
                        "type": "invalid_request"
                    }
                })),
            )
                .into_response()
        }
    };

    delete_search(&state.db, user_id, group_id, search_id).await;

    Json(json!({"success": true})).into_response()
}

#[derive(Deserialize)]
pub struct SaveSearchRequest {
    encrypted_query: String,
    encrypted_response: String,
    group_id: String,
}

pub async fn temporary_search_handler(
    State(state): State<Arc<AppState>>,
    axum::extract::Extension(user_context): axum::extract::Extension<crate::models::UserContext>,
    Json(request): Json<SearchRequest>,
) -> Response {
    let user_id = user_context.npub.clone();

    let search_id = uuid::Uuid::new_v4();

    let search_result = if let Some(model_id) = &request.model_id {
        perform_web_search_with_llm(
            &state,
            &request.message,
            request.urls.clone(),
            request.conversation.as_deref(),
            Some(model_id.as_str()),
            &user_context.organization_id,
            Some(&user_id),
        )
        .await
    } else {
        perform_web_search(&request.message, request.urls.clone()).await
    };

    let search_response = match search_result {
        Ok(result) => result,
        Err(error) => {
            let error_message = format!("Search failed: {}", error);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": error_message,
                        "type": "search_error"
                    }
                })),
            )
                .into_response();
        }
    };

    let response = SearchResultResponse {
        id: search_id.to_string(),
        query: request.message,
        response: serde_json::to_value(&search_response).unwrap(),
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    Json(response).into_response()
}

pub async fn save_search_handler(
    State(state): State<Arc<AppState>>,
    axum::extract::Extension(user_context): axum::extract::Extension<crate::models::UserContext>,
    Json(request): Json<SaveSearchRequest>,
) -> Response {
    use crate::db::user_search_groups::{create_conversation, get_search_group};

    let user_id = user_context.npub.clone();

    // Check if group_id is empty, if so create a new group
    let group_id = if request.group_id.is_empty() {
        let new_group = create_conversation(&state.db, user_id.clone()).await;
        new_group.id
    } else {
        let parsed_group_id = match uuid::Uuid::parse_str(&request.group_id) {
            Ok(id) => id,
            Err(_) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({
                        "error": {
                            "message": "Invalid group_id format",
                            "type": "invalid_request"
                        }
                    })),
                )
                    .into_response()
            }
        };

        // Check if group exists, if not create a new one
        match get_search_group(&state.db, user_id.clone(), parsed_group_id).await {
            Ok(_) => parsed_group_id, // Group exists, use it
            Err(_) => {
                // Group doesn't exist, create a new one
                let new_group = create_conversation(&state.db, user_id.clone()).await;
                new_group.id
            }
        }
    };

    let search_data = json!({
        "message": request.encrypted_response,
        "sources": null
    });

    let search_id = uuid::Uuid::new_v4();

    match sqlx::query!(
        r#"
        INSERT INTO user_searches (id, name, search, user_search_group_id, user_id, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        "#,
        search_id,
        request.encrypted_query,
        search_data,
        group_id,
        user_id,
    )
    .execute(&state.db)
    .await
    {
        Ok(_) => {
            let response = json!({
                "id": search_id.to_string(),
                "query": request.encrypted_query,
                "response": search_data,
                "created_at": chrono::Utc::now().to_rfc3339(),
                "group_id": group_id.to_string(),
            });
            Json(response).into_response()
        }
        Err(error) => {
            eprintln!("Failed to save search: {}", error);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to save search",
                        "type": "database_error"
                    }
                })),
            )
                .into_response()
        }
    }
}

#[derive(Serialize)]
pub struct SearchGroupResponse {
    id: String,
    name: String,
    created_at: String,
}

pub async fn get_search_groups_handler(
    State(state): State<Arc<AppState>>,
    axum::extract::Extension(user_context): axum::extract::Extension<crate::models::UserContext>,
) -> Response {
    let user_id = user_context.npub.clone();
    let groups = get_search_groups(&state.db, user_id).await;

    let response: Vec<SearchGroupResponse> = groups
        .into_iter()
        .map(|group| SearchGroupResponse {
            id: group.id.to_string(),
            name: group.name,
            created_at: group.created_at.to_rfc3339(),
        })
        .collect();

    Json(response).into_response()
}

pub async fn create_search_group_handler(
    State(state): State<Arc<AppState>>,
    axum::extract::Extension(user_context): axum::extract::Extension<crate::models::UserContext>,
) -> Response {
    let user_id = user_context.npub.clone();
    let group = create_conversation(&state.db, user_id).await;

    let response = SearchGroupResponse {
        id: group.id.to_string(),
        name: group.name,
        created_at: group.created_at.to_rfc3339(),
    };

    Json(response).into_response()
}

#[derive(Deserialize)]
pub struct UpdateSearchGroupRequest {
    id: String,
    name: String,
}

pub async fn update_search_group_handler(
    State(state): State<Arc<AppState>>,
    axum::extract::Extension(user_context): axum::extract::Extension<crate::models::UserContext>,
    Json(request): Json<UpdateSearchGroupRequest>,
) -> Response {
    let user_id = user_context.npub.clone();
    let group_id = match uuid::Uuid::parse_str(&request.id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": {
                        "message": "Invalid group_id format",
                        "type": "invalid_request"
                    }
                })),
            )
                .into_response()
        }
    };

    update_search_group_name(&state.db, user_id.clone(), group_id, &request.name).await;

    // Return the updated group info
    let response = SearchGroupResponse {
        id: request.id,
        name: request.name,
        created_at: chrono::Utc::now().to_rfc3339(), // This would ideally be fetched from DB
    };

    Json(response).into_response()
}

#[derive(Deserialize)]
pub struct DeleteSearchGroupRequest {
    id: String,
}

pub async fn delete_search_group_handler(
    State(state): State<Arc<AppState>>,
    axum::extract::Extension(user_context): axum::extract::Extension<crate::models::UserContext>,
    Json(request): Json<DeleteSearchGroupRequest>,
) -> Response {
    let user_id = user_context.npub.clone();
    let group_id = match uuid::Uuid::parse_str(&request.id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": {
                        "message": "Invalid group_id format",
                        "type": "invalid_request"
                    }
                })),
            )
                .into_response()
        }
    };

    match delete_search_group(&state.db, user_id, group_id).await {
        Ok(deleted) => {
            if deleted {
                Json(json!({"success": true})).into_response()
            } else {
                (
                    StatusCode::NOT_FOUND,
                    Json(json!({
                        "error": {
                            "message": "Conversation group not found or you don't have permission to delete it",
                            "type": "not_found"
                        }
                    })),
                )
                    .into_response()
            }
        }
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": {
                    "message": "Failed to delete conversation group",
                    "type": "database_error"
                }
            })),
        )
            .into_response(),
    }
}

pub async fn get_search_status_handler(
    State(state): State<Arc<AppState>>,
    axum::extract::Extension(user_context): axum::extract::Extension<crate::models::UserContext>,
    Path(search_id): Path<String>,
) -> Response {
    let user_id = user_context.npub.clone();
    let search_uuid = match uuid::Uuid::parse_str(&search_id) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": {
                        "message": "Invalid search_id format",
                        "type": "invalid_request"
                    }
                })),
            )
                .into_response()
        }
    };

    match get_search_by_id(&state.db, search_uuid, &user_id).await {
        Some(search) => {
            let status = search
                .status
                .clone()
                .unwrap_or_else(|| "completed".to_string());
            Json(json!({
                "id": search.id.to_string(),
                "status": status,
                "query": search.name,
                "started_at": search.started_at,
                "completed_at": search.completed_at,
                "error_message": search.error_message,
                "response": if search.status.as_deref() == Some("completed") {
                    Some(serde_json::to_value(&search.search).unwrap())
                } else {
                    None
                }
            }))
            .into_response()
        }
        None => (
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": {
                    "message": "Search not found",
                    "type": "not_found"
                }
            })),
        )
            .into_response(),
    }
}

pub async fn get_pending_searches_handler(
    State(state): State<Arc<AppState>>,
    axum::extract::Extension(user_context): axum::extract::Extension<crate::models::UserContext>,
) -> Response {
    let user_id = user_context.npub.clone();
    let pending_searches = get_pending_searches(&state.db, &user_id).await;

    let response: Vec<serde_json::Value> = pending_searches
        .into_iter()
        .map(|search| {
            json!({
                "id": search.id.to_string(),
                "status": search.status.unwrap_or_else(|| "completed".to_string()),
                "query": search.name,
                "group_id": search.user_search_group_id.to_string(),
                "started_at": search.started_at,
                "created_at": search.created_at,
                "error_message": search.error_message
            })
        })
        .collect();

    Json(response).into_response()
}
