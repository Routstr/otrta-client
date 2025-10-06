use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use std::sync::Arc;

use crate::{
    db::nwc::{
        create_mint_auto_refill_settings, create_nwc_connection, delete_mint_auto_refill_settings,
        delete_nwc_connection, get_mint_auto_refill_settings_by_mint,
        get_mint_auto_refill_settings_for_organization, get_nwc_connection_by_id,
        get_nwc_connections_for_organization, update_mint_auto_refill_settings,
        update_nwc_connection, CreateMintAutoRefillRequest, CreateNwcConnectionRequest,
        UpdateMintAutoRefillRequest, UpdateNwcConnectionRequest,
    },
    error::AppError,
    models::{AppState, UserContext},
    nwc_client::NwcManager,
};

#[derive(Debug, Serialize)]
pub struct NwcConnectionsResponse {
    pub connections: Vec<crate::db::nwc::NwcConnection>,
}

#[derive(Debug, Serialize)]
pub struct MintAutoRefillSettingsResponse {
    pub settings: Vec<crate::db::nwc::MintAutoRefillSettings>,
}

#[derive(Debug, Serialize)]
pub struct NwcTestResponse {
    pub success: bool,
    pub methods: Vec<String>,
    pub alias: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TestNwcConnectionRequest {
    pub connection_uri: String,
}

pub async fn create_nwc_connection_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Json(request): Json<CreateNwcConnectionRequest>,
) -> Result<Json<crate::db::nwc::NwcConnection>, AppError> {
    let nwc_manager = NwcManager::new(state.db.clone());

    nwc_manager.test_connection(&request.connection_uri).await?;

    let connection = create_nwc_connection(&state.db, &user_context.organization_id, request).await?;

    Ok(Json(connection))
}

pub async fn get_nwc_connections_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
) -> Result<Json<NwcConnectionsResponse>, AppError> {
    let connections = get_nwc_connections_for_organization(&state.db, &user_context.organization_id).await?;

    Ok(Json(NwcConnectionsResponse { connections }))
}

pub async fn get_nwc_connection_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Path(connection_id): Path<Uuid>,
) -> Result<Json<crate::db::nwc::NwcConnection>, AppError> {
    let connection = get_nwc_connection_by_id(&state.db, &connection_id, &user_context.organization_id)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(connection))
}

pub async fn update_nwc_connection_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Path(connection_id): Path<Uuid>,
    Json(request): Json<UpdateNwcConnectionRequest>,
) -> Result<Json<crate::db::nwc::NwcConnection>, AppError> {
    if let Some(ref connection_uri) = request.connection_uri {
        let nwc_manager = NwcManager::new(state.db.clone());
        nwc_manager.test_connection(connection_uri).await?;
    }

    let connection = update_nwc_connection(&state.db, &connection_id, &user_context.organization_id, request)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(connection))
}

pub async fn delete_nwc_connection_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Path(connection_id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let deleted = delete_nwc_connection(&state.db, &connection_id, &user_context.organization_id).await?;

    if deleted {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(AppError::NotFound)
    }
}

pub async fn test_nwc_connection_handler(
    State(state): State<Arc<AppState>>,
    Extension(_user_context): Extension<UserContext>,
    Json(request): Json<TestNwcConnectionRequest>,
) -> Result<Json<NwcTestResponse>, AppError> {
    let nwc_manager = NwcManager::new(state.db.clone());
    let info = nwc_manager.test_connection(&request.connection_uri).await?;

    Ok(Json(NwcTestResponse {
        success: true,
        methods: info.methods,
        alias: info.alias,
    }))
}

pub async fn create_mint_auto_refill_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Json(request): Json<CreateMintAutoRefillRequest>,
) -> Result<Json<crate::db::nwc::MintAutoRefillSettings>, AppError> {
    let settings = create_mint_auto_refill_settings(&state.db, &user_context.organization_id, request).await?;

    Ok(Json(settings))
}

pub async fn get_mint_auto_refill_settings_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
) -> Result<Json<MintAutoRefillSettingsResponse>, AppError> {
    let settings = get_mint_auto_refill_settings_for_organization(&state.db, &user_context.organization_id).await?;

    Ok(Json(MintAutoRefillSettingsResponse { settings }))
}

pub async fn get_mint_auto_refill_by_mint_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Path(mint_id): Path<i32>,
) -> Result<Json<crate::db::nwc::MintAutoRefillSettings>, AppError> {
    let settings = get_mint_auto_refill_settings_by_mint(&state.db, mint_id, &user_context.organization_id)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(settings))
}

pub async fn update_mint_auto_refill_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Path(settings_id): Path<Uuid>,
    Json(request): Json<UpdateMintAutoRefillRequest>,
) -> Result<Json<crate::db::nwc::MintAutoRefillSettings>, AppError> {
    let settings = update_mint_auto_refill_settings(&state.db, &settings_id, &user_context.organization_id, request)
        .await?
        .ok_or(AppError::NotFound)?;

    Ok(Json(settings))
}

pub async fn delete_mint_auto_refill_handler(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Path(settings_id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let deleted = delete_mint_auto_refill_settings(&state.db, &settings_id, &user_context.organization_id).await?;

    if deleted {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(AppError::NotFound)
    }
}