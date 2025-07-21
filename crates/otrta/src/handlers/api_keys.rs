use crate::{
    handlers::credits::PaginationParams,
    models::{AppState, UserContext},
};
use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    Json,
};
use serde_json::{self, json};
use std::sync::Arc;

pub async fn get_all_api_keys_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    params: Query<PaginationParams>,
) -> Result<Json<crate::db::api_keys::ApiKeyListResponse>, (StatusCode, Json<serde_json::Value>)> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);

    match crate::db::api_keys::get_all_api_keys(
        &state.db,
        Some(&user_ctx.organization_id.to_string()),
        page,
        page_size,
    )
    .await
    {
        Ok(response) => Ok(Json(response)),
        Err(e) => {
            eprintln!("Error getting API keys: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to get API keys",
                        "type": "internal_server_error"
                    }
                })),
            ))
        }
    }
}

pub async fn get_api_key_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Path(id): Path<String>,
) -> Result<Json<crate::db::api_keys::ApiKey>, (StatusCode, Json<serde_json::Value>)> {
    match crate::db::api_keys::get_api_key_by_id_for_user(
        &state.db,
        &id,
        &user_ctx.organization_id.to_string(),
    )
    .await
    {
        Ok(Some(api_key)) => Ok(Json(api_key)),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": {
                    "message": "API key not found",
                    "type": "not_found"
                }
            })),
        )),
        Err(e) => {
            eprintln!("Error getting API key: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to get API key",
                        "type": "internal_server_error"
                    }
                })),
            ))
        }
    }
}

pub async fn create_api_key_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Json(request): Json<crate::db::api_keys::CreateApiKeyRequest>,
) -> Result<Json<crate::db::api_keys::ApiKey>, (StatusCode, Json<serde_json::Value>)> {
    if request.name.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "API key name is required",
                    "type": "validation_error"
                }
            })),
        ));
    }

    match crate::db::api_keys::create_api_key(&state.db, request, &user_ctx).await {
        Ok(api_key) => Ok(Json(api_key)),
        Err(e) => {
            eprintln!("Error creating API key: {}", e);
            if e.to_string().contains("unique constraint") {
                Err((
                    StatusCode::CONFLICT,
                    Json(json!({
                        "error": {
                            "message": "API key already exists",
                            "type": "conflict"
                        }
                    })),
                ))
            } else {
                Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({
                        "error": {
                            "message": "Failed to create API key",
                            "type": "internal_server_error"
                        }
                    })),
                ))
            }
        }
    }
}

pub async fn update_api_key_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Path(id): Path<String>,
    Json(request): Json<crate::db::api_keys::UpdateApiKeyRequest>,
) -> Result<Json<crate::db::api_keys::ApiKey>, (StatusCode, Json<serde_json::Value>)> {
    match crate::db::api_keys::update_api_key_for_user(
        &state.db,
        &id,
        &user_ctx.organization_id.to_string(),
        request,
    )
    .await
    {
        Ok(Some(api_key)) => Ok(Json(api_key)),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": {
                    "message": "API key not found",
                    "type": "not_found"
                }
            })),
        )),
        Err(e) => {
            eprintln!("Error updating API key: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to update API key",
                        "type": "internal_server_error"
                    }
                })),
            ))
        }
    }
}

pub async fn delete_api_key_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    match crate::db::api_keys::delete_api_key_for_user(
        &state.db,
        &id,
        &user_ctx.organization_id.to_string(),
    )
    .await
    {
        Ok(true) => Ok(Json(json!({
            "message": "API key deleted successfully"
        }))),
        Ok(false) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": {
                    "message": "API key not found",
                    "type": "not_found"
                }
            })),
        )),
        Err(e) => {
            eprintln!("Error deleting API key: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to delete API key",
                        "type": "internal_server_error"
                    }
                })),
            ))
        }
    }
}
