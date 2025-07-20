use crate::models::{AppState, Organization, User};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde_json::{self, json};
use std::sync::Arc;

pub async fn get_user_profile_handler(
    State(app_state): State<Arc<AppState>>,
    Path(npub): Path<String>,
) -> Result<Json<User>, (StatusCode, Json<serde_json::Value>)> {
    use crate::db::users;

    let user = match users::get_user_by_npub(&app_state.db, &npub).await {
        Ok(Some(user)) => user,
        Ok(None) => {
            return Err((
                StatusCode::NOT_FOUND,
                Json(json!({
                    "error": "user_not_found",
                    "message": "User not found",
                    "type": "not_found"
                })),
            ));
        }
        Err(e) => {
            tracing::error!("Failed to get user: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "get_user_failed",
                    "message": "Failed to get user",
                    "type": "internal_server_error"
                })),
            ));
        }
    };

    Ok(Json(user))
}

pub async fn get_user_organizations_handler(
    State(app_state): State<Arc<AppState>>,
    Path(npub): Path<String>,
) -> Result<Json<Vec<Organization>>, (StatusCode, Json<serde_json::Value>)> {
    use crate::db::organizations;

    let organizations = match organizations::get_organization_for_user(&app_state.db, &npub).await {
        Ok(Some(org)) => vec![org],
        Ok(None) => vec![],
        Err(e) => {
            tracing::error!("Failed to get user organization: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "get_organization_failed",
                    "message": "Failed to get user organizations",
                    "type": "internal_server_error"
                })),
            ));
        }
    };

    Ok(Json(organizations))
}
