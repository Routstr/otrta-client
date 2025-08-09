use crate::{
    db::{
        mint::{
            create_mint_for_organization, create_mint_units, discover_mint_keysets,
            get_mint_by_url_for_organization, CreateMintRequest,
        },
        provider::{
            activate_provider_for_organization, create_custom_provider,
            create_custom_provider_for_organization, deactivate_provider_for_organization,
            delete_custom_provider, delete_custom_provider_for_organization,
            get_active_providers_for_organization, get_available_providers_for_organization,
            get_default_provider_for_organization_new, get_provider_by_id_for_organization,
            refresh_providers_from_nostr, set_default_provider_for_organization_new,
            update_custom_provider, update_custom_provider_for_organization,
            CreateCustomProviderRequest, ProviderError, ProviderListResponse, ProviderWithStatus,
            RefreshProvidersResponse, UpdateCustomProviderRequest,
        },
    },
    handlers::{models::refresh_models_internal, select_preferred_keyset},
    models::{AppState, UserContext},
};
use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{self, json};
use std::sync::Arc;

fn is_valid_provider_url(url: &str, use_onion: bool) -> bool {
    if url.trim().is_empty() {
        return false;
    }

    if url.contains(".onion") {
        if !use_onion {
            return false;
        }
        // For onion URLs, accept with or without protocol
        if url.starts_with("http://") || url.starts_with("https://") {
            return true;
        }
        // Accept bare onion addresses (without protocol)
        // Onion v3 addresses are 56 characters, v2 are 16 characters
        let onion_regex = regex::Regex::new(r"^[a-z0-9]{16,56}\.onion$").unwrap();
        return onion_regex.is_match(url);
    }

    url.starts_with("http://") || url.starts_with("https://")
}

async fn validate_tor_availability() -> bool {
    let tor_proxy_url =
        std::env::var("TOR_SOCKS_PROXY").unwrap_or_else(|_| "socks5://127.0.0.1:9050".to_string());

    reqwest::Client::builder()
        .proxy(reqwest::Proxy::all(&tor_proxy_url).unwrap())
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .is_ok()
}

async fn auto_create_mints_for_provider(
    db: &crate::db::Pool,
    organization_id: &uuid::Uuid,
    mints: &[String],
    multimint_manager: &crate::multimint_manager::MultimintManager,
) -> Result<(), Box<dyn std::error::Error>> {
    for mint_url in mints {
        if let Ok(None) = get_mint_by_url_for_organization(db, mint_url, organization_id).await {
            eprintln!("Creating mint for provider: {}", mint_url);

            let keysets = match discover_mint_keysets(mint_url).await {
                Ok(keysets) => keysets,
                Err(e) => {
                    eprintln!(
                        "Failed to discover keysets for mint {}: {}. Skipping mint creation.",
                        mint_url, e
                    );
                    continue;
                }
            };

            let selected_keyset = match select_preferred_keyset(&keysets) {
                Some(keyset) => keyset,
                None => {
                    eprintln!(
                        "No suitable keyset (msat or sat) found for mint {}. Skipping mint creation.",
                        mint_url
                    );
                    continue;
                }
            };

            let mint_request = CreateMintRequest {
                mint_url: mint_url.clone(),
                currency_unit: Some(selected_keyset.unit.clone()),
                name: None,
            };

            match create_mint_for_organization(db, mint_request, organization_id).await {
                Ok(mint) => {
                    if let Err(e) = create_mint_units(db, mint.id, &[selected_keyset.clone()]).await
                    {
                        eprintln!("Failed to create mint units for mint {}: {}", mint.id, e);
                    }

                    if let Ok(wallet) = multimint_manager
                        .get_or_create_multimint(organization_id)
                        .await
                    {
                        let currency_unit = selected_keyset
                            .unit
                            .parse::<cdk::nuts::CurrencyUnit>()
                            .unwrap_or(cdk::nuts::CurrencyUnit::Msat);
                        if let Err(e) = wallet.add_mint(&mint.mint_url, currency_unit).await {
                            eprintln!("Failed to add mint to wallet {}: {:?}", mint.mint_url, e);
                        }
                    }

                    eprintln!(
                        "Successfully created mint: {} with {} unit",
                        mint_url, selected_keyset.unit
                    );
                }
                Err(e) => {
                    eprintln!("Failed to create mint {}: {}", mint_url, e);
                }
            }
        }
    }
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProviderWithStatusListResponse {
    pub providers: Vec<ProviderWithStatus>,
    pub total: i32,
}

pub async fn get_providers(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
) -> Result<Json<ProviderWithStatusListResponse>, (StatusCode, Json<serde_json::Value>)> {
    match get_available_providers_for_organization(
        &state.db,
        &user_ctx.organization_id,
        user_ctx.is_admin,
    )
    .await
    {
        Ok(providers) => {
            let total = providers.len() as i32;
            Ok(Json(ProviderWithStatusListResponse { providers, total }))
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

pub async fn get_active_providers(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
) -> Result<Json<ProviderListResponse>, (StatusCode, Json<serde_json::Value>)> {
    match get_active_providers_for_organization(&state.db, &user_ctx.organization_id).await {
        Ok(providers) => {
            let total = providers.len() as i32;
            Ok(Json(ProviderListResponse { providers, total }))
        }
        Err(e) => {
            eprintln!("Failed to get active providers: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to retrieve active providers",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn activate_provider(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Path(provider_id): Path<i32>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    match activate_provider_for_organization(&state.db, &user_ctx.organization_id, provider_id)
        .await
    {
        Ok(_) => Ok(Json(json!({
            "success": true,
            "message": "Provider activated successfully"
        }))),
        Err(sqlx::Error::RowNotFound) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": {
                    "message": "Provider not found or not available to your organization",
                    "type": "not_found"
                }
            })),
        )),
        Err(e) => {
            eprintln!("Failed to activate provider {}: {}", provider_id, e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to activate provider",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn deactivate_provider(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Path(provider_id): Path<i32>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    match deactivate_provider_for_organization(&state.db, &user_ctx.organization_id, provider_id)
        .await
    {
        Ok(true) => Ok(Json(json!({
            "success": true,
            "message": "Provider deactivated successfully"
        }))),
        Ok(false) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": {
                    "message": "Provider not found or not active for your organization",
                    "type": "not_found"
                }
            })),
        )),
        Err(sqlx::Error::RowNotFound) => Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": "Cannot deactivate the default provider. Please set another provider as default first.",
                    "type": "constraint_violation"
                }
            })),
        )),
        Err(e) => {
            eprintln!("Failed to deactivate provider {}: {}", provider_id, e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to deactivate provider",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn get_provider(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Path(id): Path<i32>,
) -> Result<Json<crate::db::provider::Provider>, (StatusCode, Json<serde_json::Value>)> {
    match get_provider_by_id_for_organization(&state.db, id, &user_ctx.organization_id).await {
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
    Extension(user_ctx): Extension<UserContext>,
    Json(request): Json<CreateCustomProviderRequest>,
) -> Result<Json<crate::db::provider::Provider>, (StatusCode, Json<serde_json::Value>)> {
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

    if !is_valid_provider_url(&request.url, request.use_onion) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": if request.use_onion && request.url.contains(".onion") {
                        "Invalid onion URL format. Use format: example.onion or http://example.onion"
                    } else {
                        "Provider URL must be a valid HTTP(S) URL"
                    },
                    "type": "validation_error"
                }
            })),
        ));
    }

    if request.use_onion && !validate_tor_availability().await {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({
                "error": {
                    "message": "Tor proxy not available. Cannot create .onion provider.",
                    "type": "service_unavailable"
                }
            })),
        ));
    }

    let result = if user_ctx.is_admin {
        create_custom_provider(&state.db, request).await
    } else {
        create_custom_provider_for_organization(&state.db, request, &user_ctx.organization_id).await
    };

    match result {
        Ok(provider) => {
            if let Err(e) = auto_create_mints_for_provider(
                &state.db,
                &user_ctx.organization_id,
                &provider.mints,
                &state.multimint_manager,
            )
            .await
            {
                eprintln!(
                    "Warning: Failed to auto-create mints for provider {}: {}",
                    provider.id, e
                );
            }

            if let Err(e) = activate_provider_for_organization(
                &state.db,
                &user_ctx.organization_id,
                provider.id,
            )
            .await
            {
                eprintln!(
                    "Warning: Failed to automatically activate new provider {}: {}",
                    provider.id, e
                );
            }
            Ok(Json(provider))
        }
        Err(ProviderError::DuplicateUrl(msg)) => Err((
            StatusCode::CONFLICT,
            Json(json!({
                "error": {
                    "message": msg,
                    "type": "duplicate_error"
                }
            })),
        )),
        Err(ProviderError::Database(e)) => {
            eprintln!("Failed to create custom provider: {}", e);
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

pub async fn update_custom_provider_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Path(id): Path<i32>,
    Json(request): Json<UpdateCustomProviderRequest>,
) -> Result<Json<crate::db::provider::Provider>, (StatusCode, Json<serde_json::Value>)> {
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

    if !is_valid_provider_url(&request.url, request.use_onion) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": {
                    "message": if request.use_onion && request.url.contains(".onion") {
                        "Invalid onion URL format. Use format: example.onion or http://example.onion"
                    } else {
                        "Provider URL must be a valid HTTP(S) URL"
                    },
                    "type": "validation_error"
                }
            })),
        ));
    }

    if request.use_onion && !validate_tor_availability().await {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({
                "error": {
                    "message": "Tor proxy not available. Cannot update .onion provider.",
                    "type": "service_unavailable"
                }
            })),
        ));
    }

    let result = if user_ctx.is_admin {
        update_custom_provider(&state.db, id, request).await
    } else {
        update_custom_provider_for_organization(&state.db, id, request, &user_ctx.organization_id)
            .await
    };

    match result {
        Ok(provider) => Ok(Json(provider)),
        Err(ProviderError::DuplicateUrl(msg)) => Err((
            StatusCode::CONFLICT,
            Json(json!({
                "error": {
                    "message": msg,
                    "type": "duplicate_error"
                }
            })),
        )),
        Err(ProviderError::Database(sqlx::Error::RowNotFound)) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": {
                    "message": "Custom provider not found or cannot be updated",
                    "type": "not_found"
                }
            })),
        )),
        Err(ProviderError::Database(e)) => {
            eprintln!("Failed to update custom provider {}: {}", id, e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": {
                        "message": "Failed to update custom provider",
                        "type": "database_error"
                    }
                })),
            ))
        }
    }
}

pub async fn delete_custom_provider_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Path(id): Path<i32>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let result = if user_ctx.is_admin {
        delete_custom_provider(&state.db, id).await
    } else {
        delete_custom_provider_for_organization(&state.db, id, &user_ctx.organization_id).await
    };

    match result {
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
    Extension(user_ctx): Extension<UserContext>,
) -> Result<Json<Option<crate::db::provider::Provider>>, (StatusCode, Json<serde_json::Value>)> {
    match get_default_provider_for_organization_new(&state.db, &user_ctx.organization_id).await {
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

pub async fn set_provider_default(
    State(state): State<Arc<AppState>>,
    Extension(user_ctx): Extension<UserContext>,
    Path(id): Path<i32>,
) -> Result<Json<crate::db::provider::Provider>, (StatusCode, Json<serde_json::Value>)> {
    // First, get the provider to access its mints
    let provider =
        match get_provider_by_id_for_organization(&state.db, id, &user_ctx.organization_id).await {
            Ok(Some(provider)) => provider,
            Ok(None) => {
                return Err((
                    StatusCode::NOT_FOUND,
                    Json(json!({
                        "error": {
                            "message": "Provider not found",
                            "type": "not_found"
                        }
                    })),
                ));
            }
            Err(e) => {
                eprintln!("Failed to get provider {}: {}", id, e);
                return Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({
                        "error": {
                            "message": "Failed to retrieve provider",
                            "type": "database_error"
                        }
                    })),
                ));
            }
        };

    // Auto-create mints for the provider if they don't exist
    if let Err(e) = auto_create_mints_for_provider(
        &state.db,
        &user_ctx.organization_id,
        &provider.mints,
        &state.multimint_manager,
    )
    .await
    {
        eprintln!(
            "Warning: Failed to auto-create mints for default provider {}: {}",
            provider.id, e
        );
    }

    match set_default_provider_for_organization_new(&state.db, &user_ctx.organization_id, id).await
    {
        Ok(_) => {
            if let Err(e) = refresh_models_internal(&state.db, &user_ctx.organization_id).await {
                eprintln!(
                    "Warning: Failed to refresh models after setting default provider: {}",
                    e
                );
            }

            match get_provider_by_id_for_organization(&state.db, id, &user_ctx.organization_id)
                .await
            {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_provider_url_validation() {
        // Regular URLs
        assert!(is_valid_provider_url("http://example.com", false));
        assert!(is_valid_provider_url("https://example.com", false));

        // Onion URLs with protocol (when onion enabled)
        assert!(is_valid_provider_url("http://example.onion", true));
        assert!(is_valid_provider_url("https://example.onion", true));

        // Bare onion URLs (when onion enabled)
        assert!(is_valid_provider_url(
            "zdnt2juw6htljsu25ftnbvdicgvr4s3ts4ldlx2myjcuyz4woaf4l7id.onion",
            true
        ));
        assert!(is_valid_provider_url("facebookcorewwwi.onion", true)); // v2 onion

        // Invalid cases
        assert!(!is_valid_provider_url("", false));
        assert!(!is_valid_provider_url("ftp://example.com", false));
        assert!(!is_valid_provider_url("http://example.onion", false)); // onion disabled
        assert!(!is_valid_provider_url(
            "zdnt2juw6htljsu25ftnbvdicgvr4s3ts4ldlx2myjcuyz4woaf4l7id.onion",
            false
        )); // onion disabled
        assert!(!is_valid_provider_url("invalid.onion.format", true)); // invalid onion format
    }

    #[test]
    fn test_select_preferred_keyset() {
        use crate::db::mint::KeysetInfo;

        // Test with active msat keyset (should be preferred)
        let keysets = vec![
            KeysetInfo {
                id: "keyset1".to_string(),
                unit: "sat".to_string(),
                active: true,
            },
            KeysetInfo {
                id: "keyset2".to_string(),
                unit: "msat".to_string(),
                active: true,
            },
        ];
        let selected = select_preferred_keyset(&keysets);
        assert!(selected.is_some());
        assert_eq!(selected.unwrap().unit, "msat");

        // Test with only active sat keyset
        let keysets = vec![
            KeysetInfo {
                id: "keyset1".to_string(),
                unit: "sat".to_string(),
                active: true,
            },
            KeysetInfo {
                id: "keyset2".to_string(),
                unit: "usd".to_string(),
                active: true,
            },
        ];
        let selected = select_preferred_keyset(&keysets);
        assert!(selected.is_some());
        assert_eq!(selected.unwrap().unit, "sat");

        // Test with only inactive msat keyset
        let keysets = vec![
            KeysetInfo {
                id: "keyset1".to_string(),
                unit: "msat".to_string(),
                active: false,
            },
            KeysetInfo {
                id: "keyset2".to_string(),
                unit: "usd".to_string(),
                active: true,
            },
        ];
        let selected = select_preferred_keyset(&keysets);
        assert!(selected.is_some());
        assert_eq!(selected.unwrap().unit, "msat");

        // Test with no suitable keysets
        let keysets = vec![
            KeysetInfo {
                id: "keyset1".to_string(),
                unit: "usd".to_string(),
                active: true,
            },
            KeysetInfo {
                id: "keyset2".to_string(),
                unit: "eur".to_string(),
                active: false,
            },
        ];
        let selected = select_preferred_keyset(&keysets);
        assert!(selected.is_none());

        // Test with empty keysets
        let keysets = vec![];
        let selected = select_preferred_keyset(&keysets);
        assert!(selected.is_none());
    }
}
