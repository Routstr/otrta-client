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
        let seed = self.generate_deterministic_seed(&organization).await?;

        let wallet = MultimintWalletWrapper::new(&seed, &db_path)
            .await
            .map_err(|e| {
                error!(
                    "Failed to create multimint wallet for organization {}: {}",
                    org_id, e
                );
                AppError::InternalServerError
            })?;

        let wallet_arc = Arc::new(wallet);
        if let Some(existing) = self.instances.get(org_id) {
            // Another thread created it while we were creating ours, use the existing one
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
        use bip39::Mnemonic;
        use sha2::{Digest, Sha256};

        let mut hasher = Sha256::new();
        hasher.update(organization.id.as_bytes());
        hasher.update(organization.name.as_bytes());
        hasher.update(organization.created_at.timestamp().to_be_bytes());

        let entropy = hasher.finalize();

        // Convert the 32-byte hash to a valid BIP39 mnemonic
        let mnemonic = Mnemonic::from_entropy(&entropy[..]).map_err(|e| {
            error!("Failed to generate mnemonic from entropy: {}", e);
            AppError::InternalServerError
        })?;

        Ok(mnemonic.to_string())
    }
}
