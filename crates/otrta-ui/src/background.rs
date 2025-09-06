use super::*;
use otrta::handlers::refresh_models_background;
use tokio::time::{Duration, interval};
use tracing::{error, info};

pub struct BackgroundJobRunner {
    app_state: Arc<AppState>,
}

impl BackgroundJobRunner {
    pub fn new(app_state: Arc<AppState>) -> Self {
        Self { app_state }
    }

    pub async fn start_all_jobs(&self) {
        info!("Starting background jobs...");

        let state_clone = Arc::clone(&self.app_state);
        tokio::spawn(async move {
            Self::model_refresh_job(state_clone, 300).await;
        });

        let state_clone = Arc::clone(&self.app_state);
        tokio::spawn(async move {
            Self::nostr_provider_discovery_job(state_clone, 300).await;
        });
    }

    async fn model_refresh_job(app_state: Arc<AppState>, interval_secs: u64) {
        let mut interval = interval(Duration::from_secs(interval_secs));
        info!(
            "Background model refresh job started with {}s interval",
            interval_secs
        );

        loop {
            interval.tick().await;
            info!("Running background model refresh...");

            match refresh_models_background(axum::extract::State(Arc::clone(&app_state))).await {
                Ok(response) => {
                    info!("Model refresh completed successfully: {:?}", response.0);
                }
                Err(e) => {
                    error!("Model refresh failed: {:?}", e);
                }
            }
        }
    }

    async fn nostr_provider_discovery_job(app_state: Arc<AppState>, interval_secs: u64) {
        let mut interval = interval(Duration::from_secs(interval_secs));
        info!(
            "Background Nostr provider discovery job started with {}s interval",
            interval_secs
        );

        loop {
            interval.tick().await;
            info!("Running background Nostr provider discovery...");

            match Self::discover_and_update_nostr_providers(&app_state).await {
                Ok((added, updated)) => {
                    info!(
                        "Nostr provider discovery completed successfully: {} added, {} updated",
                        added, updated
                    );
                }
                Err(e) => {
                    error!("Nostr provider discovery failed: {:?}", e);
                }
            }
        }
    }

    async fn discover_and_update_nostr_providers(
        app_state: &AppState,
    ) -> Result<(usize, usize), Box<dyn std::error::Error + Send + Sync>> {
        use otrta::db::provider::refresh_providers_from_nostr_global;

        match refresh_providers_from_nostr_global(&app_state.db).await {
            Ok(response) => {
                info!("{}", response.message.unwrap_or_default());
                Ok((
                    response.providers_added as usize,
                    response.providers_updated as usize,
                ))
            }
            Err(e) => {
                error!("Failed to refresh providers from Nostr: {}", e);
                Err(Box::new(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("Provider refresh failed: {}", e),
                )))
            }
        }
    }
}
