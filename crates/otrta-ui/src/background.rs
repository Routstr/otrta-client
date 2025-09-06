use super::*;
use otrta::handlers::refresh_models_background;
use tokio::time::{interval, Duration};
use tracing::{debug, error, info};

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
        use otrta::db::provider::{upsert_nostr_provider, CreateNostrProviderRequest};
        use otrta_nostr::discover_providers;

        let nostr_providers = discover_providers().await?;
        info!("Discovered {} providers from Nostr", nostr_providers.len());

        let providers_added = 0;
        let mut providers_updated = 0;

        for nostr_provider in nostr_providers {
            let request = CreateNostrProviderRequest {
                name: nostr_provider.name.clone(),
                about: nostr_provider.about.clone(),
                url: nostr_provider
                    .urls
                    .first()
                    .unwrap_or(&"".to_string())
                    .clone(),
                mints: nostr_provider.mints.clone(),
                use_onion: nostr_provider.use_onion,
                followers: nostr_provider.followers,
                zaps: nostr_provider.zaps,
                version: nostr_provider.version.clone(),
            };

            match upsert_nostr_provider(&app_state.db, request).await {
                Ok(_provider) => {
                    providers_updated += 1;
                    debug!(
                        "Successfully upserted Nostr provider: {}",
                        nostr_provider.name
                    );
                }
                Err(e) => {
                    error!(
                        "Failed to upsert Nostr provider '{}': {}",
                        nostr_provider.name, e
                    );
                }
            }
        }

        Ok((providers_added, providers_updated))
    }
}
