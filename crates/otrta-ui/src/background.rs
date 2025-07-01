use super::*;
use otrta::handlers::refresh_models_from_proxy;
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

        // Model refresh job - every 5 minutes
        let state_clone = Arc::clone(&self.app_state);
        tokio::spawn(async move {
            Self::model_refresh_job(state_clone, 300).await;
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

            match refresh_models_from_proxy(axum::extract::State(Arc::clone(&app_state))).await {
                Ok(response) => {
                    info!("Model refresh completed successfully: {:?}", response.0);
                }
                Err(e) => {
                    error!("Model refresh failed: {:?}", e);
                }
            }
        }
    }
}
