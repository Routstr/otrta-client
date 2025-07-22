use axum::{
    Router, middleware,
    routing::{delete, get, post, put},
};
mod background;
mod connection;
use background::BackgroundJobRunner;
use connection::{DatabaseSettings, get_configuration};
use otrta::{
    auth::{AuthConfig, AuthState, bearer_auth_middleware, nostr_auth_middleware_with_context},
    handlers,
    models::AppState,
    multimint_manager::MultimintManager,
    proxy::{forward_any_request, forward_any_request_get},
};
use sqlx::{PgPool, postgres::PgPoolOptions};
use std::sync::Arc;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG")
                .unwrap_or_else(|_| "ecash-402-wallet=debug,tower_http=warning".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let configuration = get_configuration().expect("Failed to read configuration.");
    let connection_pool = get_connection_pool(&configuration.database)
        .await
        .expect("Failed to connect to Postgres.");
    sqlx::migrate!("./migrations")
        .run(&connection_pool)
        .await
        .unwrap();

    let wallet_dir = dotenv::var("WALLET_DATA_DIR").unwrap_or_else(|_| "./multimint".to_string());
    std::fs::create_dir_all(&wallet_dir).unwrap();

    let multimint_manager = Arc::new(MultimintManager::new(wallet_dir, connection_pool.clone()));

    let app_state = Arc::new(AppState {
        db: connection_pool.clone(),
        default_msats_per_request: configuration.application.default_msats_per_request,
        multimint_manager,
        search_cache: Arc::new(std::sync::Mutex::new(std::collections::HashMap::new())),
    });

    let job_runner = BackgroundJobRunner::new(Arc::clone(&app_state));
    job_runner.start_all_jobs().await;

    let auth_config = AuthConfig {
        enabled: configuration.application.enable_authentication,
        max_age_seconds: 300,
        whitelisted_npubs: configuration.application.whitelisted_npubs.clone(),
    };

    let mut protected_routes = Router::new()
        .route("/api/openai-models", get(handlers::list_openai_models))
        .route("/api/proxy/models", get(handlers::get_proxy_models))
        .route("/api/providers", get(handlers::get_providers))
        .route(
            "/api/providers",
            post(handlers::create_custom_provider_handler),
        )
        .route(
            "/api/providers/default",
            get(handlers::get_default_provider_handler),
        )
        .route("/api/providers/{id}", get(handlers::get_provider))
        .route(
            "/api/providers/{id}",
            delete(handlers::delete_custom_provider_handler),
        )
        .route(
            "/api/providers/{id}/set-default",
            post(handlers::set_provider_default),
        )
        .route(
            "/api/providers/{id}/activate",
            post(handlers::activate_provider),
        )
        .route(
            "/api/providers/{id}/deactivate",
            post(handlers::deactivate_provider),
        )
        .route("/api/providers/active", get(handlers::get_active_providers))
        .route("/api/providers/refresh", post(handlers::refresh_providers))
        .route(
            "/api/proxy/models/refresh",
            post(handlers::refresh_models_from_proxy),
        )
        .route(
            "/api/wallet/redeem-pendings",
            post(handlers::redeem_pendings),
        )
        .route("/api/wallet/balance", get(handlers::get_balance))
        .route("/api/wallet/redeem", post(handlers::redeem_token))
        .route("/api/wallet/send", post(handlers::send_token))
        .route(
            "/api/wallet/pending-transactions",
            get(handlers::get_pendings),
        )
        .route(
            "/api/server-config",
            get(handlers::get_current_server_config),
        )
        .route("/api/server-config", post(handlers::update_server_config))
        .route("/api/credits", get(handlers::get_all_credits))
        .route("/api/transactions", get(handlers::get_all_transactions))
        .route(
            "/api/statistics/{api_key_id}",
            get(handlers::get_api_key_statistics_handler),
        )
        .route("/api/mints", get(handlers::get_all_mints_handler))
        .route("/api/mints", post(handlers::create_mint_handler))
        .route("/api/mints/active", get(handlers::get_active_mints_handler))
        .route("/api/mints/{id}", get(handlers::get_mint_handler))
        .route("/api/mints/{id}", put(handlers::update_mint_handler))
        .route("/api/mints/{id}", delete(handlers::delete_mint_handler))
        .route(
            "/api/mints/{id}/set-active",
            post(handlers::set_mint_active_handler),
        )
        .route(
            "/api/multimint/balance",
            get(handlers::get_multimint_balance_handler),
        )
        .route(
            "/api/multimint/send",
            post(handlers::send_multimint_token_handler),
        )
        .route(
            "/api/multimint/transfer",
            post(handlers::transfer_between_mints_handler),
        )
        .route("/api/multimint/topup", post(handlers::topup_mint_handler))
        .route("/api/multimint/redeem", post(handlers::redeem_token))
        .route("/api/api-keys", get(handlers::get_all_api_keys_handler))
        .route("/api/api-keys", post(handlers::create_api_key_handler))
        .route("/api/api-keys/{id}", get(handlers::get_api_key_handler))
        .route("/api/api-keys/{id}", put(handlers::update_api_key_handler))
        .route(
            "/api/api-keys/{id}",
            delete(handlers::delete_api_key_handler),
        )
        .route(
            "/api/lightning/create-invoice",
            post(handlers::create_lightning_invoice_handler),
        )
        .route(
            "/api/lightning/create-payment",
            post(handlers::create_lightning_payment_handler),
        )
        .route(
            "/api/lightning/payment-status/{quote_id}",
            get(handlers::check_lightning_payment_status_handler),
        )
        .route(
            "/api/lightning/payment-status-with-mint",
            post(handlers::check_lightning_payment_status_with_mint_handler),
        )
        .route(
            "/api/lightning/complete-topup/{quote_id}",
            post(handlers::complete_lightning_topup_handler),
        )
        .route("/api/debug/wallet", get(handlers::get_wallet_debug_info))
        .route("/api/search", get(handlers::get_searches_handler))
        .route("/api/search", post(handlers::search_handler))
        .route("/api/search/delete", post(handlers::delete_search_handler))
        .route(
            "/api/search/groups",
            get(handlers::get_search_groups_handler),
        )
        .route(
            "/api/search/groups",
            post(handlers::create_search_group_handler),
        )
        .route(
            "/api/search/groups/delete",
            post(handlers::delete_search_group_handler),
        )
        .with_state(app_state.clone());

    let mut unprotected_routes = Router::new()
        .route("/{*path}", post(forward_any_request))
        .route("/v1/{*path}", post(forward_any_request))
        .route("/{*path}", get(forward_any_request_get))
        .route("/v1/{*path}", get(forward_any_request_get))
        .with_state(app_state.clone());

    if auth_config.enabled {
        let auth_state = AuthState {
            config: auth_config.clone(),
            app_state: app_state.clone(),
        };

        unprotected_routes = unprotected_routes.layer(middleware::from_fn_with_state(
            auth_state.clone(),
            bearer_auth_middleware,
        ));

        protected_routes = protected_routes.layer(middleware::from_fn_with_state(
            auth_state,
            nostr_auth_middleware_with_context,
        ));
    }

    let app = protected_routes.merge(unprotected_routes);

    let app = app
        .layer(
            CorsLayer::permissive()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any)
                .expose_headers(Any)
                .allow_private_network(true),
        )
        .layer(TraceLayer::new_for_http());
    println!(
        "Server starting on http://{}:{}",
        configuration.application.host, configuration.application.port
    );
    let listener = tokio::net::TcpListener::bind(format!(
        "{}:{}",
        configuration.application.host, configuration.application.port
    ))
    .await
    .unwrap();
    axum::serve(listener, app).await.unwrap();
}

pub async fn get_connection_pool(configuration: &DatabaseSettings) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(configuration.connections)
        .connect_with(configuration.with_db())
        .await
}
