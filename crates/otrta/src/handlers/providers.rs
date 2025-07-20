use crate::{
    db::provider::{
        create_custom_provider, delete_custom_provider, get_all_providers, get_default_provider,
        get_provider_by_id, refresh_providers_from_nostr, set_default_provider,
        CreateCustomProviderRequest, ProviderListResponse, RefreshProvidersResponse,
    },
    handlers::models::refresh_models_internal,
    models::AppState,
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde_json::{self, json};
use std::sync::Arc;

pub async fn get_providers(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ProviderListResponse>, (StatusCode, Json<serde_json::Value>)> {
    match get_all_providers(&state.db).await {
        Ok(providers) => {
            let total = providers.len() as i32;
            Ok(Json(ProviderListResponse { providers, total }))
        }
        Err(e) => {
            eprintln!("Failed to get providers: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to retrieve providers",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn get_provider(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<Json<crate::db::provider::Provider>, (StatusCode, Json<serde_json::Value>)> {
    match get_provider_by_id(&state.db, id).await {
        Ok(Some(provider)) => Ok(Json(provider)),
        Ok(None) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": {
                    "message": "Provider not found",
                    "type": "not_found"
                }
            })),
        )),
        Err(e) => {
            eprintln!("Failed to get provider {}: {}", id, e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to retrieve provider",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn set_provider_default(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<Json<crate::db::provider::Provider>, (StatusCode, Json<serde_json::Value>)> {
    match set_default_provider(&state.db, id).await {
        Ok(_) => {
            if let Err(e) = refresh_models_internal(&state.db).await {
                eprintln!(
                    "Warning: Failed to refresh models after setting default provider: {}",
                    e
                );
            }

            match get_provider_by_id(&state.db, id).await {
                Ok(Some(provider)) => Ok(Json(provider)),
                Ok(None) => Err((
                    StatusCode::NOT_FOUND,
                    Json(json!({
                        "error": {
                            "message": "Provider not found",
                            "type": "not_found"
                        }
                    })),
                )),
                Err(e) => {
                    eprintln!("Failed to get updated provider {}: {}", id, e);
                    Err((
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(json!({
                            "error": {
                                "message": "Failed to retrieve updated provider",
                                "type": "database_error"
                            }
                        })),
                    ))
                }
            }
        }
        Err(e) => {
            eprintln!("Failed to set default provider {}: {}", id, e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to set default provider",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn refresh_providers(
    State(state): State<Arc<AppState>>,
) -> Result<Json<RefreshProvidersResponse>, (StatusCode, Json<serde_json::Value>)> {
    match refresh_providers_from_nostr(&state.db).await {
        Ok(response) => Ok(Json(response)),
        Err(e) => {
            eprintln!("Failed to refresh providers: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to refresh providers from Nostr marketplace",
                        "type": "refresh_error"
                    }
                })),
            ))
        }
    }
}

pub async fn create_custom_provider_handler(
    State(state): State<Arc<AppState>>,
    Json(request): Json<CreateCustomProviderRequest>,
) -> Result<Json<crate::db::provider::Provider>, (StatusCode, Json<serde_json::Value>)> {
    // Validate the request
    if request.name.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "Provider name cannot be empty",
                    "type": "validation_error"
                }
            })),
        ));
    }

    if request.url.trim().is_empty() || !request.url.starts_with("http") {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "Provider URL must be a valid HTTP(S) URL",
                    "type": "validation_error"
                }
            })),
        ));
    }

    match create_custom_provider(&state.db, request).await {
        Ok(provider) => Ok(Json(provider)),
        Err(e) => {
            eprintln!("Failed to create custom provider: {}", e);
            // Check if it's a unique constraint violation
            if e.to_string()
                .contains("duplicate key value violates unique constraint")
            {
                Err((
                    StatusCode::CONFLICT,
                    Json(json!({
                        "error": {
                            "message": "A provider with this URL already exists",
                            "type": "duplicate_error"
                        }
                    })),
                ))
            } else {
                Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({
                        "error": {
                            "message": "Failed to create custom provider",
                            "type": "database_error"
                        }
                    })),
                ))
            }
        }
    }
}

pub async fn delete_custom_provider_handler(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i32>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    match delete_custom_provider(&state.db, id).await {
        Ok(deleted) => {
            if deleted {
                Ok(Json(json!({
                    "success": true,
                    "message": "Custom provider deleted successfully"
                })))
            } else {
                Err((
                    StatusCode::NOT_FOUND,
                    Json(json!({
                        "error": {
                            "message": "Custom provider not found or cannot be deleted",
                            "type": "not_found"
                        }
                    })),
                ))
            }
        }
        Err(e) => {
            eprintln!("Failed to delete custom provider {}: {}", id, e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to delete custom provider",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn get_default_provider_handler(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Option<crate::db::provider::Provider>>, (StatusCode, Json<serde_json::Value>)> {
    match get_default_provider(&state.db).await {
        Ok(provider) => Ok(Json(provider)),
        Err(e) => {
            eprintln!("Failed to get default provider: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to get default provider",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}
