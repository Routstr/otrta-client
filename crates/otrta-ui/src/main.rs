use axum::{
    Router, middleware,
    routing::{delete, get, post, put},
};
mod background;
mod connection;
use background::BackgroundJobRunner;
use connection::{DatabaseSettings, Settings, get_configuration};
use ecash_402_wallet::wallet::CashuWalletClient;
use otrta::{
    auth::{AuthConfig, auth_middleware},
    db::server_config::create_with_seed,
    handlers::{self, get_server_config},
    models::AppState,
    multimint::MultimintWalletWrapper,
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

    let wallet = initialize_wallet(&connection_pool, &configuration, "ecash_402")
        .await
        .unwrap();

    let app_state = Arc::new(AppState {
        db: connection_pool.clone(),
        default_msats_per_request: configuration.application.default_msats_per_request,
        wallet: Arc::new(wallet),
    });

    let job_runner = BackgroundJobRunner::new(Arc::clone(&app_state));
    job_runner.start_all_jobs().await;

    let auth_config = AuthConfig {
        enabled: configuration.application.enable_authentication,
        max_age_seconds: 300,
        whitelisted_npubs: configuration.application.whitelisted_npubs.clone(),
    };

    let mut app = Router::new()
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
        .route("/{*path}", post(forward_any_request))
        .route("/v1/{*path}", post(forward_any_request))
        .route("/{*path}", get(forward_any_request_get))
        .route("/v1/{*path}", get(forward_any_request_get))
        .with_state(app_state);

    if auth_config.enabled {
        let auth_config_clone = auth_config.clone();
        app = app.layer(middleware::from_fn_with_state(
            auth_config_clone,
            auth_middleware,
        ));
    }

    let app = app
        .layer(
            CorsLayer::new()
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

async fn initialize_wallet(
    connection_pool: &PgPool,
    configuration: &Settings,
    db_name: &str,
) -> Result<MultimintWalletWrapper, Box<dyn std::error::Error>> {
    let wallet_dir = dotenv::var("WALLET_DATA_DIR").unwrap_or_else(|_| "./wallet_data".to_string());
    std::fs::create_dir_all(&wallet_dir)?;

    let unique_db_name = format!("{}/{}", wallet_dir, db_name);
    let multimint_db_name = format!("{}/multimint", wallet_dir);
    std::fs::create_dir_all(&multimint_db_name)?;

    let config = get_server_config(connection_pool).await;
    match config {
        Some(config) => {
            let seed = config.seed.clone().unwrap();
            let single_wallet = CashuWalletClient::from_seed(
                &configuration.application.mint_url,
                &seed,
                &unique_db_name,
            )
            .await
            .unwrap();

            let multimint_wallet = MultimintWalletWrapper::from_existing_wallet(
                &single_wallet,
                &configuration.application.mint_url,
                &seed,
                &multimint_db_name,
            )
            .await?;

            use otrta::db::mint::get_active_mints;
            if let Ok(active_mints) = get_active_mints(connection_pool).await {
                for mint in active_mints {
                    if mint.mint_url != configuration.application.mint_url {
                        if let Err(e) = multimint_wallet
                            .add_mint(&mint.mint_url, otrta::db::mint::CurrencyUnit::Sat)
                            .await
                        {
                            eprintln!("Failed to add mint {}: {:?}", mint.mint_url, e);
                        }
                    }
                }
            }

            Ok(multimint_wallet)
        }
        None => {
            let mut seed = String::new();
            let wallet = CashuWalletClient::new(
                &configuration.application.mint_url,
                &mut seed,
                &unique_db_name,
            )
            .await
            .unwrap();

            create_with_seed(connection_pool, &seed).await?;

            let multimint_wallet = MultimintWalletWrapper::from_existing_wallet(
                &wallet,
                &configuration.application.mint_url,
                &seed,
                &multimint_db_name,
            )
            .await?;

            Ok(multimint_wallet)
        }
    }
}
