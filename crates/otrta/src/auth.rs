use axum::{
    extract::{Request, State},
    http::header::AUTHORIZATION,
    middleware::Next,
    response::{IntoResponse, Response},
};
use base64::Engine;
use nostr::{Event, Kind, ToBech32};
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::{info, warn};

use crate::db::api_keys::{get_api_key_by_key, update_last_used_at};
use crate::db::mint::create_mint_for_organization;
use crate::db::provider::{
    activate_provider_for_organization, get_available_providers_for_organization,
    get_default_provider_for_organization_new, set_default_provider_for_organization_new,
};
use crate::db::{organizations, users};
use crate::error::AppError;
use crate::models::{AppState, CreateOrganizationRequest, UserContext};
use chrono::{DateTime, Utc};
use std::sync::Arc;

#[derive(Clone)]
pub struct AuthConfig {
    pub enabled: bool,
    pub max_age_seconds: u64,
    pub whitelisted_npubs: Vec<String>,
}

impl Default for AuthConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            max_age_seconds: 300,
            whitelisted_npubs: vec![],
        }
    }
}

#[derive(Clone)]
pub struct AuthState {
    pub config: AuthConfig,
    pub app_state: Arc<AppState>,
}

pub async fn bearer_auth_middleware(
    State(auth_state): State<AuthState>,
    request: Request,
    next: Next,
) -> Response {
    if !auth_state.config.enabled {
        return next.run(request).await;
    }

    let auth_header = match request.headers().get(AUTHORIZATION) {
        Some(header) => header,
        None => return AppError::Unauthorized.into_response(),
    };

    let auth_str = match auth_header.to_str() {
        Ok(str) => str,
        Err(_) => return AppError::Unauthorized.into_response(),
    };

    if let Some(token) = auth_str.strip_prefix("Bearer ") {
        match validate_bearer_token(&auth_state.app_state.db, token).await {
            Ok(api_key_id) => {
                let mut request = request;
                request.extensions_mut().insert(api_key_id);
                info!("Bearer token authentication successful");
                return next.run(request).await;
            }
            Err(err) => return err.into_response(),
        }
    }

    warn!(
        "Bearer token required but {} provided",
        if auth_str.starts_with("Nostr ") {
            "Nostr token"
        } else {
            "invalid format"
        }
    );
    AppError::Unauthorized.into_response()
}

pub async fn nostr_auth_middleware(
    State(auth_state): State<AuthState>,
    request: Request,
    next: Next,
) -> Response {
    if !auth_state.config.enabled {
        return next.run(request).await;
    }

    let auth_header = match request.headers().get(AUTHORIZATION) {
        Some(header) => header,
        None => return AppError::Unauthorized.into_response(),
    };

    let auth_str = match auth_header.to_str() {
        Ok(str) => str,
        Err(_) => return AppError::Unauthorized.into_response(),
    };

    if let Some(encoded_event) = auth_str.strip_prefix("Nostr ") {
        let decoded_bytes = match base64::engine::general_purpose::STANDARD.decode(encoded_event) {
            Ok(bytes) => bytes,
            Err(_) => return AppError::Unauthorized.into_response(),
        };

        let event_json = match std::str::from_utf8(&decoded_bytes) {
            Ok(json) => json,
            Err(_) => return AppError::Unauthorized.into_response(),
        };

        let event: Event = match serde_json::from_str(event_json) {
            Ok(event) => event,
            Err(_) => return AppError::Unauthorized.into_response(),
        };

        if let Err(err) = validate_auth_event(&event, &request, &auth_state.config) {
            return err.into_response();
        }

        // Extract user ID (public key) from the event and add it as an extension
        let user_id = event.pubkey.to_hex();
        info!("Nostr authentication successful for user: {}", user_id);

        let mut request = request;
        request.extensions_mut().insert(user_id);
        return next.run(request).await;
    }

    warn!(
        "Nostr token required but {} provided",
        if auth_str.starts_with("Bearer ") {
            "Bearer token"
        } else {
            "invalid format"
        }
    );
    AppError::Unauthorized.into_response()
}

pub async fn nostr_auth_middleware_with_context(
    State(auth_state): State<AuthState>,
    mut request: Request,
    next: Next,
) -> Response {
    if !auth_state.config.enabled {
        return next.run(request).await;
    }

    let auth_header = match request.headers().get(AUTHORIZATION) {
        Some(header) => header,
        None => return AppError::Unauthorized.into_response(),
    };

    let auth_str = match auth_header.to_str() {
        Ok(str) => str,
        Err(_) => return AppError::Unauthorized.into_response(),
    };

    if !auth_str.starts_with("Nostr ") {
        warn!(
            "Nostr token required but {} provided",
            if auth_str.starts_with("Bearer ") {
                "Bearer token"
            } else {
                "invalid format"
            }
        );
        return AppError::Unauthorized.into_response();
    }

    let encoded_event = &auth_str[6..];
    let decoded_bytes = match base64::engine::general_purpose::STANDARD.decode(encoded_event) {
        Ok(bytes) => bytes,
        Err(_) => return AppError::Unauthorized.into_response(),
    };

    let event_json = match std::str::from_utf8(&decoded_bytes) {
        Ok(json) => json,
        Err(_) => return AppError::Unauthorized.into_response(),
    };

    let event: Event = match serde_json::from_str(event_json) {
        Ok(event) => event,
        Err(_) => return AppError::Unauthorized.into_response(),
    };

    if let Err(err) = validate_auth_event(&event, &request, &auth_state.config) {
        return err.into_response();
    }

    let npub = event.pubkey.to_bech32().unwrap_or_default();

    let user_context = match create_or_get_user_context(
        &auth_state.app_state,
        &npub,
        &auth_state.config.whitelisted_npubs,
    )
    .await
    {
        Ok(ctx) => ctx,
        Err(e) => {
            warn!("Failed to create user context: {}", e);
            return e.into_response();
        }
    };

    if let Err(e) =
        ensure_organization_multimint(&auth_state.app_state, &user_context.organization_id).await
    {
        warn!("Failed to ensure organization multimint: {}", e);
        return e.into_response();
    }

    request.extensions_mut().insert(user_context);

    info!("Nostr authentication successful with user context");
    next.run(request).await
}

fn validate_auth_event(
    event: &Event,
    request: &Request,
    config: &AuthConfig,
) -> Result<(), AppError> {
    if event.kind != Kind::Custom(27235) {
        warn!("Invalid event kind: expected 27235, got {}", event.kind);
        return Err(AppError::Unauthorized);
    }

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let event_age = now.saturating_sub(event.created_at.as_u64());
    if event_age > config.max_age_seconds {
        warn!("Event too old: {} seconds", event_age);
        return Err(AppError::Unauthorized);
    }

    if event.verify().is_err() {
        warn!("Invalid event signature");
        return Err(AppError::Unauthorized);
    }

    // Admin validation is now handled in create_or_get_user_context function
    // This allows non-admin users to authenticate but admin status is tracked separately

    let mut url_found = false;
    let mut method_found = false;

    for tag in &event.tags {
        let values = tag.as_vec();
        if values.len() >= 2 {
            match values[0].as_str() {
                "u" => {
                    // TODO: FIX ME
                    let _expected_url = format!(
                        "{}://{}{}",
                        request
                            .uri()
                            .scheme()
                            .map(|s| s.as_str())
                            .unwrap_or("https"),
                        request
                            .uri()
                            .authority()
                            .map(|a| a.as_str())
                            .unwrap_or("localhost"),
                        request.uri().path()
                    );

                    // if values[1] != expected_url {
                    //     warn!("URL mismatch: expected {}, got {}", expected_url, values[1]);
                    //     return Err(AppError::Unauthorized);
                    // }
                    url_found = true;
                }
                "method" => {
                    let expected_method = request.method().as_str();
                    if values[1] != expected_method {
                        warn!(
                            "Method mismatch: expected {}, got {}",
                            expected_method, values[1]
                        );
                        return Err(AppError::Unauthorized);
                    }
                    method_found = true;
                }
                _ => {}
            }
        }
    }

    if !url_found || !method_found {
        warn!("Missing required tags (u or method)");
        return Err(AppError::Unauthorized);
    }

    Ok(())
}

async fn validate_bearer_token(db: &sqlx::PgPool, token: &str) -> Result<String, AppError> {
    let api_key = match get_api_key_by_key(db, token).await {
        Ok(Some(key)) => key,
        Ok(None) => {
            warn!("Invalid API key provided");
            return Err(AppError::Unauthorized);
        }
        Err(e) => {
            warn!("Database error while validating API key: {}", e);
            return Err(AppError::InternalServerError);
        }
    };

    if !api_key.is_active {
        warn!("Inactive API key used: {}", api_key.id);
        return Err(AppError::Unauthorized);
    }

    if let Some(expires_at_str) = &api_key.expires_at {
        let expires_at = DateTime::parse_from_rfc3339(expires_at_str)
            .map_err(|_| AppError::InternalServerError)?
            .with_timezone(&Utc);

        let now = Utc::now();
        if now > expires_at {
            warn!(
                "Expired API key used: {} (expired at {})",
                api_key.id, expires_at
            );
            return Err(AppError::Unauthorized);
        }
    }

    if let Err(e) = update_last_used_at(db, &api_key.id).await {
        warn!(
            "Failed to update last_used_at for API key {}: {}",
            api_key.id, e
        );
    } else {
        info!("Updated last_used_at for API key: {}", api_key.id);
    }

    Ok(api_key.id)
}

pub fn is_user_admin(npub: &str, whitelisted_npubs: &[String]) -> bool {
    !whitelisted_npubs.is_empty() && whitelisted_npubs.contains(&npub.to_string())
}

async fn create_or_get_user_context(
    app_state: &Arc<AppState>,
    npub: &str,
    whitelisted_npubs: &[String],
) -> Result<UserContext, AppError> {
    if let Some(user) = users::get_user_by_npub(&app_state.db, npub).await? {
        let organization =
            organizations::get_organization_by_id(&app_state.db, &user.organization_id)
                .await?
                .ok_or_else(|| {
                    warn!(
                        "User {} has invalid organization_id: {}",
                        npub, user.organization_id
                    );
                    AppError::InternalServerError
                })?;
        let is_admin = is_user_admin(npub, whitelisted_npubs);
        return Ok(UserContext::new_with_admin_status(
            npub.to_string(),
            organization,
            is_admin,
        ));
    }

    // User doesn't exist, assign them to default organization and create user
    info!(
        "User {} not found, creating user and assigning to default organization",
        npub
    );
    let organization = ensure_default_organization_exists(app_state).await?;

    let create_user_request = crate::models::CreateUserRequest {
        npub: npub.to_string(),
        display_name: None,
        email: None,
        organization_id: organization.id,
    };
    users::create_user(&app_state.db, &create_user_request).await?;

    // Setup default provider and wallet for new user
    if let Err(e) = setup_first_time_user_defaults(app_state, &organization.id).await {
        warn!("Failed to setup defaults for new user {}: {}", npub, e);
        // Don't fail the entire authentication if default setup fails
    }

    let is_admin = is_user_admin(npub, whitelisted_npubs);
    Ok(UserContext::new_with_admin_status(
        npub.to_string(),
        organization,
        is_admin,
    ))
}

pub async fn ensure_default_organization_exists(
    app_state: &Arc<AppState>,
) -> Result<crate::models::Organization, AppError> {
    let create_org_request = CreateOrganizationRequest {
        name: "Organization".to_string(),
    };

    let organization =
        organizations::create_organization(&app_state.db, &create_org_request).await?;
    info!("Created default organization: {}", organization.id);

    Ok(organization)
}

async fn setup_first_time_user_defaults(
    app_state: &Arc<AppState>,
    org_id: &uuid::Uuid,
) -> Result<(), AppError> {
    // Check if organization already has a default provider
    if get_default_provider_for_organization_new(&app_state.db, org_id)
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?
        .is_some()
    {
        info!("Organization {} already has a default provider", org_id);
        return Ok(());
    }

    info!(
        "Setting up first-time defaults for organization: {}",
        org_id
    );

    // Get all available providers for this organization
    let available_providers = get_available_providers_for_organization(&app_state.db, org_id)
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

    if available_providers.is_empty() {
        warn!("No providers available for organization {}", org_id);
        return Ok(());
    }

    // Find the first global (non-custom) provider or fall back to any provider
    let default_provider = available_providers
        .iter()
        .find(|p| !p.provider.is_custom)
        .unwrap_or(&available_providers[0]);

    info!(
        "Setting provider {} as default for organization {}",
        default_provider.provider.name, org_id
    );

    // Activate the provider for the organization
    if let Err(e) =
        activate_provider_for_organization(&app_state.db, org_id, default_provider.provider.id)
            .await
    {
        warn!(
            "Failed to activate provider {}: {}",
            default_provider.provider.id, e
        );
        return Ok(());
    }

    // Set as default provider
    if let Err(e) = set_default_provider_for_organization_new(
        &app_state.db,
        org_id,
        default_provider.provider.id,
    )
    .await
    {
        warn!(
            "Failed to set default provider {}: {}",
            default_provider.provider.id, e
        );
        return Ok(());
    }

    // Add provider's mints to the database for this organization
    for mint_url in &default_provider.provider.mints {
        // Check if mint already exists for this organization
        let skip_mint =
            match crate::db::mint::get_mints_for_organization(&app_state.db, org_id).await {
                Ok(existing_mints) => existing_mints.iter().any(|m| m.mint_url == *mint_url),
                Err(e) => {
                    warn!(
                        "Failed to check existing mints for organization {}: {}",
                        org_id, e
                    );
                    false // Continue trying to add the mint if we can't check
                }
            };

        if skip_mint {
            continue; // Skip if mint already exists
        }

        let create_mint_request = crate::db::mint::CreateMintRequest {
            mint_url: mint_url.clone(),
            currency_unit: Some("sat".to_string()),
            name: None,
        };

        if let Err(e) =
            create_mint_for_organization(&app_state.db, create_mint_request, org_id).await
        {
            warn!(
                "Failed to add mint {} for organization {}: {}",
                mint_url, org_id, e
            );
        } else {
            info!("Added mint {} for organization {}", mint_url, org_id);
        }
    }

    info!("Successfully set up defaults for organization {}", org_id);
    Ok(())
}

async fn ensure_organization_multimint(
    app_state: &Arc<AppState>,
    org_id: &uuid::Uuid,
) -> Result<(), AppError> {
    app_state
        .multimint_manager
        .preload_multimint(org_id)
        .await?;
    info!("Ensured multimint exists for organization: {}", org_id);
    Ok(())
}
