use std::time::Duration;
use tokio::time::{interval, sleep};
use tracing::{debug, error, info, warn};

use crate::{
    db::{
        mint::get_mint_by_id,
        nwc::{get_enabled_mint_auto_refill_settings, update_last_refill_time},
    },
    error::AppError,
    multimint_manager::MultimintManager,
    nwc_client::NwcManager,
};

pub struct AutoRefillService {
    db_pool: sqlx::PgPool,
    multimint_manager: std::sync::Arc<MultimintManager>,
    nwc_manager: NwcManager,
    check_interval: Duration,
    min_refill_interval: Duration,
}

impl AutoRefillService {
    pub fn new(
        db_pool: sqlx::PgPool,
        multimint_manager: std::sync::Arc<MultimintManager>,
        check_interval_seconds: u64,
        min_refill_interval_minutes: u64,
    ) -> Self {
        let nwc_manager = NwcManager::new(db_pool.clone());

        Self {
            db_pool,
            multimint_manager,
            nwc_manager,
            check_interval: Duration::from_secs(check_interval_seconds),
            min_refill_interval: Duration::from_secs(min_refill_interval_minutes * 60),
        }
    }

    pub async fn start(&self) {
        info!(
            "Starting auto-refill service with check interval: {:?}",
            self.check_interval
        );

        let mut interval_timer = interval(self.check_interval);

        loop {
            interval_timer.tick().await;

            if let Err(e) = self.check_and_refill_balances().await {
                error!("Error in auto-refill service: {}", e);
            }
        }
    }

    async fn check_and_refill_balances(&self) -> Result<(), AppError> {
        debug!("Checking balances for auto-refill");

        let settings = get_enabled_mint_auto_refill_settings(&self.db_pool).await?;

        if settings.is_empty() {
            debug!("No enabled auto-refill settings found");
            return Ok(());
        }

        info!("Found {} enabled auto-refill settings", settings.len());

        for setting in settings {
            if let Err(e) = self.process_mint_refill(&setting).await {
                error!(
                    "Failed to process refill for mint {} in organization {}: {}",
                    setting.mint_id, setting.organization_id, e
                );
            }

            sleep(Duration::from_millis(500)).await;
        }

        Ok(())
    }

    async fn process_mint_refill(
        &self,
        setting: &crate::db::nwc::MintAutoRefillSettings,
    ) -> Result<(), AppError> {
        if let Some(last_refill) = setting.last_refill_at {
            let time_since_last_refill = chrono::Utc::now().signed_duration_since(last_refill);
            if time_since_last_refill.to_std().unwrap_or(Duration::ZERO) < self.min_refill_interval
            {
                debug!(
                    "Skipping refill for mint {} - too soon since last refill",
                    setting.mint_id
                );
                return Ok(());
            }
        }

        let mint = get_mint_by_id(&self.db_pool, setting.mint_id)
            .await?
            .ok_or_else(|| {
                warn!("Mint not found: {}", setting.mint_id);
                AppError::NotFound
            })?;

        if !mint.is_active {
            debug!("Skipping inactive mint: {}", setting.mint_id);
            return Ok(());
        }

        let wallet = self
            .multimint_manager
            .get_or_create_multimint(&setting.organization_id)
            .await?;

        let balance = match wallet.get_balance_for_mint(&mint.mint_url).await {
            Ok(balance) => balance,
            Err(e) => {
                warn!("Failed to get balance for mint {}: {}", mint.mint_url, e);
                return Ok(());
            }
        };

        debug!(
            "Mint {} balance: {} msat, threshold: {} msat",
            mint.mint_url, balance, setting.min_balance_threshold_msat
        );

        if balance >= setting.min_balance_threshold_msat as u64 {
            debug!(
                "Mint {} balance above threshold, no refill needed",
                mint.mint_url
            );
            return Ok(());
        }

        info!(
            "Mint {} balance ({} msat) below threshold ({} msat), initiating refill of {} msat",
            mint.mint_url, balance, setting.min_balance_threshold_msat, setting.refill_amount_msat
        );

        match self.execute_refill(setting, &mint.mint_url).await {
            Ok(invoice) => {
                info!(
                    "Successfully initiated refill for mint {}: {}",
                    mint.mint_url, invoice
                );

                if let Err(e) = update_last_refill_time(&self.db_pool, &setting.id).await {
                    error!("Failed to update last refill time: {}", e);
                }
            }
            Err(e) => {
                error!("Failed to execute refill for mint {}: {}", mint.mint_url, e);
                return Err(e);
            }
        }

        Ok(())
    }

    async fn execute_refill(
        &self,
        setting: &crate::db::nwc::MintAutoRefillSettings,
        mint_url: &str,
    ) -> Result<String, AppError> {
        let invoice = self
            .nwc_manager
            .request_mint_refill(
                &setting.nwc_connection_id,
                &setting.organization_id,
                setting.refill_amount_msat as u64,
                mint_url,
            )
            .await?;

        Ok(invoice)
    }
}

#[derive(Clone)]
pub struct AutoRefillConfig {
    pub enabled: bool,
    pub check_interval_seconds: u64,
    pub min_refill_interval_minutes: u64,
}

impl Default for AutoRefillConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            check_interval_seconds: 300,
            min_refill_interval_minutes: 60,
        }
    }
}

pub async fn start_auto_refill_service(
    config: AutoRefillConfig,
    db_pool: sqlx::PgPool,
    multimint_manager: std::sync::Arc<MultimintManager>,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        if !config.enabled {
            info!("Auto-refill service is disabled");
            return;
        }

        let service = AutoRefillService::new(
            db_pool,
            multimint_manager,
            config.check_interval_seconds,
            config.min_refill_interval_minutes,
        );

        service.start().await;
    })
}
