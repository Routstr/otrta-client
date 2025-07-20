use dashmap::DashMap;
use std::sync::Arc;
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::db::organizations;
use crate::error::AppError;
use crate::models::Organization;
use crate::multimint::MultimintWalletWrapper;

pub struct MultimintManager {
    instances: DashMap<Uuid, Arc<MultimintWalletWrapper>>,
    base_db_path: String,
    db_pool: sqlx::PgPool,
}

impl MultimintManager {
    pub fn new(base_db_path: String, db_pool: sqlx::PgPool) -> Self {
        Self {
            instances: DashMap::new(),
            base_db_path,
            db_pool,
        }
    }

    pub async fn get_or_create_multimint(
        &self,
        org_id: &Uuid,
    ) -> Result<Arc<MultimintWalletWrapper>, AppError> {
        if let Some(wallet) = self.instances.get(org_id) {
            info!("Retrieved existing multimint for organization: {}", org_id);
            return Ok(wallet.clone());
        }

        info!("Creating new multimint for organization: {}", org_id);
        self.create_multimint_for_organization(org_id).await
    }

    pub async fn create_multimint_for_organization(
        &self,
        org_id: &Uuid,
    ) -> Result<Arc<MultimintWalletWrapper>, AppError> {
        let organization = organizations::get_organization_by_id(&self.db_pool, org_id)
            .await?
            .ok_or_else(|| {
                error!("Organization not found: {}", org_id);
                AppError::NotFound
            })?;

        let db_path = format!("{}multimint/{}", self.base_db_path, org_id);

        use crate::db::server_config::{
            create_with_seed_for_organization, get_config_by_organization,
        };

        let config = get_config_by_organization(&self.db_pool, org_id)
            .await
            .map_err(|e| {
                error!("Failed to get config for organization {}: {}", org_id, e);
                AppError::InternalServerError
            })?;

        println!("{:?}", config);
        let seed = match config {
            Some(config) => {
                info!("Using existing seed for organization: {}", org_id);
                config.seed.unwrap_or_else(|| {
                    warn!(
                        "Config found but no seed, generating new one for organization: {}",
                        org_id
                    );
                    self.generate_deterministic_seed_sync(&organization)
                })
            }
            None => {
                info!(
                    "No existing config found, creating new seed for organization: {}",
                    org_id
                );
                let new_seed = self.generate_deterministic_seed_sync(&organization);

                if let Err(e) =
                    create_with_seed_for_organization(&self.db_pool, &new_seed, org_id).await
                {
                    error!("Failed to save seed for organization {}: {}", org_id, e);
                }

                new_seed
            }
        };

        // Check if wallet files already exist (preserving existing balances and mints)
        let wallet_db_path = format!("{}.sqlite", &db_path);
        let wallet_exists = std::path::Path::new(&wallet_db_path).exists();

        let wallet = if wallet_exists {
            info!(
                "Loading existing wallet for organization: {} (preserving balances)",
                org_id
            );
            // Load existing wallet preserving all state
            MultimintWalletWrapper::new(&seed, &db_path)
                .await
                .map_err(|e| {
                    error!(
                        "Failed to load existing multimint wallet for organization {}: {}",
                        org_id, e
                    );
                    AppError::InternalServerError
                })?
        } else {
            info!("Creating new wallet for organization: {}", org_id);
            // Create new wallet
            MultimintWalletWrapper::new(&seed, &db_path)
                .await
                .map_err(|e| {
                    error!(
                        "Failed to create new multimint wallet for organization {}: {}",
                        org_id, e
                    );
                    AppError::InternalServerError
                })?
        };

        // Restore all configured mints from database (critical for balance preservation)
        use crate::db::mint::get_active_mints;
        if let Ok(active_mints) = get_active_mints(&self.db_pool).await {
            for mint in active_mints {
                let currency_unit = mint
                    .currency_unit
                    .parse::<cdk::nuts::CurrencyUnit>()
                    .unwrap_or(cdk::nuts::CurrencyUnit::Sat);

                // Check if mint is already configured in wallet to avoid duplicates
                let existing_mints = wallet.list_mints().await;
                if !existing_mints.contains(&mint.mint_url) {
                    if let Err(e) = wallet.add_mint(&mint.mint_url, currency_unit).await {
                        error!("Failed to restore mint {}: {:?}", mint.mint_url, e);
                    } else {
                        info!(
                            "Restored mint {} for organization {}",
                            mint.mint_url, org_id
                        );
                    }
                }
            }
        }

        let wallet_arc = Arc::new(wallet);
        if let Some(existing) = self.instances.get(org_id) {
            info!(
                "Found existing multimint created by another thread for organization: {}",
                org_id
            );
            return Ok(existing.clone());
        }

        {
            self.instances.insert(*org_id, wallet_arc.clone());
        }

        info!(
            "Successfully created and cached multimint for organization: {}",
            org_id
        );
        Ok(wallet_arc)
    }

    pub async fn remove_multimint(&self, org_id: &Uuid) -> Result<(), AppError> {
        if self.instances.remove(org_id).is_some() {
            info!("Removed multimint instance for organization: {}", org_id);
        } else {
            warn!(
                "Attempted to remove non-existent multimint for organization: {}",
                org_id
            );
        }
        Ok(())
    }

    pub async fn get_cached_multimint(&self, org_id: &Uuid) -> Option<Arc<MultimintWalletWrapper>> {
        self.instances.get(org_id).map(|v| v.clone())
    }

    pub async fn preload_multimint(&self, org_id: &Uuid) -> Result<(), AppError> {
        if self.get_cached_multimint(org_id).await.is_none() {
            self.get_or_create_multimint(org_id).await?;
        }
        Ok(())
    }

    async fn generate_deterministic_seed(
        &self,
        organization: &Organization,
    ) -> Result<String, AppError> {
        Ok(self.generate_deterministic_seed_sync(organization))
    }

    fn generate_deterministic_seed_sync(&self, organization: &Organization) -> String {
        use bip39::Mnemonic;
        use sha2::{Digest, Sha256};

        let mut hasher = Sha256::new();
        hasher.update(organization.id.as_bytes());
        hasher.update(organization.name.as_bytes());
        hasher.update(organization.created_at.timestamp().to_be_bytes());

        let entropy = hasher.finalize();

        let mnemonic =
            Mnemonic::from_entropy(&entropy[..]).expect("Failed to generate mnemonic from entropy");

        mnemonic.to_string()
    }
}
