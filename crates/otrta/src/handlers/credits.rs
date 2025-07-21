use crate::{
    db::{
        credit::{get_credits, CreditListResponse},
        transaction::{
            get_api_key_statistics_for_user, get_transactions_for_user, ApiKeyStatistics,
            TransactionListResponse,
        },
    },
    models::{AppState, UserContext},
};
use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::{self, json};
use std::sync::Arc;

#[derive(Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    #[serde(rename = "pageSize")]
    pub page_size: Option<i64>,
}

#[derive(Deserialize)]
pub struct StatisticsParams {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

pub async fn get_all_credits(
    State(state): State<Arc<AppState>>,
    params: Query<PaginationParams>,
) -> Result<Json<CreditListResponse>, StatusCode> {
    match get_credits(&state.db, params.page, params.page_size).await {
        Ok(response) => Ok(Json(response)),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub async fn get_all_transactions(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    params: Query<PaginationParams>,
) -> Result<Json<TransactionListResponse>, StatusCode> {
    match get_transactions_for_user(
        &state.db,
        &user_ctx.organization_id.to_string(),
        params.page,
        params.page_size,
    )
    .await
    {
        Ok(response) => Ok(Json(response)),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

pub async fn get_api_key_statistics_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Path(api_key_id): Path<String>,
    params: Query<StatisticsParams>,
) -> Result<Json<ApiKeyStatistics>, (StatusCode, Json<serde_json::Value>)> {
    let start_date = params.start_date.as_ref().and_then(|d| {
        chrono::DateTime::parse_from_rfc3339(d)
            .ok()
            .map(|dt| dt.with_timezone(&chrono::Utc))
    });

    let end_date = params.end_date.as_ref().and_then(|d| {
        chrono::DateTime::parse_from_rfc3339(d)
            .ok()
            .map(|dt| dt.with_timezone(&chrono::Utc))
    });

    match get_api_key_statistics_for_user(
        &state.db,
        &api_key_id,
        &user_ctx.organization_id.to_string(),
        start_date,
        end_date,
    )
    .await
    {
        Ok(statistics) => Ok(Json(statistics)),
        Err(sqlx::Error::RowNotFound) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": {
                    "message": "API key not found or no statistics available",
                    "type": "not_found"
                }
            })),
        )),
        Err(e) => {
            eprintln!("Failed to get API key statistics: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to retrieve statistics",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}
