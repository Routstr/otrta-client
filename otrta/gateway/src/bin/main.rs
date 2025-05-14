use axum::{
    Router,
    routing::{get, post},
};
use gateway::{
    connection::{DatabaseSettings, get_configuration},
    forward, handlers,
    models::AppState,
};
use sqlx::{PgPool, postgres::PgPoolOptions};
use std::sync::Arc;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use wallet::api::CashuWalletClient;

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
    let wallet = CashuWalletClient::new(&configuration.application.wallet_url);

    let app_state = Arc::new(AppState {
        db: connection_pool.clone(),
        default_sats_per_request: configuration.application.default_sats_per_request,
        wallet,
    });

    let app = Router::new()
        .route("/api/openai-models", get(handlers::list_openai_models))
        .route("/api/wallet/redeem", post(handlers::redeem_token))
        .route("/api/wallet/balance", get(handlers::get_balance))
        .route(
            "/v1/chat/completions",
            post(forward::forward_chat_completions),
        )
        .route("/chat/completions", post(forward::forward_chat_completions))
        .route("/models", get(forward::forward_list_models))
        .route("/models/{model_id}", get(forward::get_specific_model))
        .route("/embeddings", post(forward::forward_embeddings))
        .route(
            "/images/generations",
            post(forward::forward_image_generations),
        )
        .route("/v1/models", get(forward::forward_list_models))
        .route("/v1/models/{model_id}", get(forward::get_specific_model))
        .route("/v1/embeddings", post(forward::forward_embeddings))
        .route(
            "/v1/images/generations",
            post(forward::forward_image_generations),
        )
        .route(
            "/api/server-config",
            get(handlers::get_current_server_config),
        )
        .route("/api/server-config", post(handlers::update_server_config))
        .route("/api/credits", get(handlers::get_all_credits))
        .route("/api/transactions", get(handlers::get_all_transactions))
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
