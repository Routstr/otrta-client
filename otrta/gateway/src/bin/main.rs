use axum::{
    Router,
    routing::{get, post},
};
use bip39::Mnemonic;
use cdk::nuts::CurrencyUnit;
use cdk::wallet::Wallet;
use cdk_redb::WalletRedbDatabase;
use gateway::{
    connection::{DatabaseSettings, get_configuration},
    handlers,
    models::AppState,
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
                .unwrap_or_else(|_| "wallet_gateway=debug,tower_http=debug".into()),
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

    let home_dir = home::home_dir().unwrap();

    // TODO: Set mint URL
    // We can use a multimint wallet if we want to be able to accept ecash from multiple mints
    let mint_url = "https://testnut.cashu.space";
    let localstore = WalletRedbDatabase::new(&home_dir.join("cdk_wallet.redb")).unwrap();

    // TODO: We can get this seed from config or write it to a file so a user can backup else where
    let seed = Mnemonic::generate(12).unwrap().to_seed_normalized("");

    let wallet = Wallet::new(
        mint_url,
        CurrencyUnit::Msat,
        Arc::new(localstore),
        &seed,
        None,
    )
    .unwrap();

    let app_state = Arc::new(AppState {
        db: connection_pool.clone(),
        default_sats_per_request: configuration.application.default_sats_per_request,
        wallet,
    });

    let app = Router::new()
        .route("/api/openai-models", get(handlers::list_openai_models))
        .route("/api/wallet/redeem", post(handlers::redeem_token))
        .route("/api/wallet/balance", get(handlers::get_balance))
        .route("/api/wallet/send", post(handlers::send_token))
        .route(
            "/api/wallet/pending-transactions",
            get(handlers::get_pendings),
        )
        .route("/api/credits", get(handlers::get_all_credits))
        .route("/api/transactions", get(handlers::get_all_transactions))
        .route("/{*path}", post(forward_any_request))
        .route("/v1/{*path}", post(forward_any_request))
        .route("/{*path}", get(forward_any_request_get))
        .route("/v1/{*path}", get(forward_any_request_get))
        .with_state(app_state)
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
