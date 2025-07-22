use crate::{
    db::{
        user_search_groups::{create_conversation, delete_search_group, get_search_groups},
        user_searches::{delete_search, get_searches, insert_search},
    },
    models::AppState,
    search::{perform_web_search, perform_web_search_with_llm, SearchRequest},
};
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

    // Create a unique search identifier to prevent duplicate processing
    // let search_key = format!("{}:{}:{}", user_id, group_id, request.message);

    // Check if this search is already being processed or was recently processed
    // {
    //     let mut cache = state.search_cache.lock().unwrap();
    //     let now = Instant::now();

    //     // Clean up old entries (older than 30 seconds)
    //     cache.retain(|_, &mut timestamp| now.duration_since(timestamp) < Duration::from_secs(30));

    //     // Check if this search was attempted recently
    //     if let Some(&last_attempt) = cache.get(&search_key) {
    //         if now.duration_since(last_attempt) < Duration::from_secs(30) {
    //             return (
    //                 StatusCode::TOO_MANY_REQUESTS,
    //                 Json(json!({
    //                     "error": {
    //                         "message": "Search request is already being processed or was recently attempted",
    //                         "type": "duplicate_request"
    //                     }
    //                 })),
    //             )
    //                 .into_response();
    //         }
    //     }

    //     // Mark this search as being processed
    //     cache.insert(search_key.clone(), now);
    // }

    // Perform web search with optional LLM integration
    let search_response = if request.model_id.is_some() {
        match perform_web_search_with_llm(
            &state,
            &request.message,
            request.urls,
            request.conversation.as_deref(),
            request.model_id.as_deref(),
            &user_context.organization_id,
        )
        .await
        {
            Ok(response) => response,
            Err(e) => {
                // Remove from cache on error to allow retry later
                // {
                //     let mut cache = state.search_cache.lock().unwrap();
                //     cache.remove(&search_key);
                // }
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({
                        "error": {
                            "message": format!("Search with LLM failed: {}", e),
                            "type": "search_error"
                        }
                    })),
                )
                    .into_response();
            }
        }
    } else {
        match perform_web_search(&request.message, request.urls).await {
            Ok(response) => response,
            Err(e) => {
                // Remove from cache on error to allow retry later
                // {
                //     let mut cache = state.search_cache.lock().unwrap();
                //     cache.remove(&search_key);
                // }
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({
                        "error": {
                            "message": format!("Search failed: {}", e),
                            "type": "search_error"
                        }
                    })),
                )
                    .into_response();
            }
        }
    };

    // Validate search response before saving to database
    // Never save error responses - they should always be valid search results
    if search_response.message.contains("{\"error\"")
        || search_response.message.contains("\"type\":\"")
    {
        eprintln!(
            "Warning: Detected error response in search result, not saving to database: {}",
            search_response.message
        );
        // Remove from cache on validation error
        // {
        //     let mut cache = state.search_cache.lock().unwrap();
        //     cache.remove(&search_key);
        // }
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": {
                    "message": "Search processing failed",
                    "type": "search_error"
                }
            })),
        )
            .into_response();
    }

    // Save search to database
    let search_id = insert_search(
        &state.db,
        &request.message,
        search_response.clone(),
        user_id,
        group_id,
    )
    .await;

    // Remove from cache since search completed successfully
    // {
    //     let mut cache = state.search_cache.lock().unwrap();
    //     cache.remove(&search_key);
    // }

    let response = SearchResultResponse {
        id: search_id.to_string(),
        query: request.message,
        response: serde_json::to_value(&search_response).unwrap(),
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
