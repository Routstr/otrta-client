use crate::db::mint::CurrencyUnit;
use ecash_402_wallet::wallet::CashuWalletClient;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

// Helper function to convert our CurrencyUnit to the external one
fn convert_currency_unit(unit: CurrencyUnit) -> cdk::nuts::CurrencyUnit {
    match unit {
        CurrencyUnit::Sat => cdk::nuts::CurrencyUnit::Sat,
        CurrencyUnit::Msat => cdk::nuts::CurrencyUnit::Msat,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultimintBalance {
    pub total_balance: u64,
    pub balances_by_mint: Vec<MintBalance>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MintBalance {
    pub mint_url: String,
    pub balance: u64,
    pub unit: CurrencyUnit,
    pub proof_count: usize,
}

#[derive(Debug, Clone, Default)]
pub struct MultimintSendOptions {
    pub preferred_mint: Option<String>,
    pub unit: Option<CurrencyUnit>,
    pub split_across_mints: bool,
}

#[derive(Debug, Clone)]
struct MintWalletInfo {
    pub wallet: CashuWalletClient,
    pub active: bool,
    pub mint_url: String,
    pub unit: CurrencyUnit,
}

pub struct MultimintWallet {
    wallets: Arc<RwLock<HashMap<String, MintWalletInfo>>>,
    seed: String,
    base_db_path: String,
}

impl MultimintWallet {
    pub async fn new(seed: &str, base_db_path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            wallets: Arc::new(RwLock::new(HashMap::new())),
            seed: seed.to_string(),
            base_db_path: base_db_path.to_string(),
        })
    }

    pub async fn from_existing_wallet(
        _wallet: &CashuWalletClient,
        mint_url: &str,
        seed: &str,
        base_db_path: &str,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let multimint = Self::new(seed, base_db_path).await?;

        let wallet_clone = CashuWalletClient::from_seed(
            mint_url,
            seed,
            &format!("{}/{}", base_db_path, mint_url.replace(['/', ':'], "_")),
        )
        .await?;

        let info = MintWalletInfo {
            wallet: wallet_clone,
            active: true,
            mint_url: mint_url.to_string(),
            unit: CurrencyUnit::Msat, // Default unit for existing wallets
        };

        multimint
            .wallets
            .write()
            .await
            .insert(mint_url.to_string(), info);
        Ok(multimint)
    }

    pub async fn add_mint(
        &self,
        mint_url: &str,
        unit: CurrencyUnit,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let db_path = format!(
            "{}/{}",
            self.base_db_path,
            mint_url.replace(['/', ':'], "_")
        );

        let wallet = CashuWalletClient::from_seed_with_unit(
            mint_url,
            &self.seed,
            &db_path,
            convert_currency_unit(unit.clone()),
        )
        .await?;

        let info = MintWalletInfo {
            wallet,
            active: true,
            mint_url: mint_url.to_string(),
            unit,
        };

        self.wallets
            .write()
            .await
            .insert(mint_url.to_string(), info);
        Ok(())
    }

    pub async fn remove_mint(&self, mint_url: &str) -> Result<(), Box<dyn std::error::Error>> {
        let balance = self.get_mint_balance(mint_url).await?;
        if balance > 0 {
            return Err("Cannot remove mint with non-zero balance".into());
        }

        self.wallets.write().await.remove(mint_url);
        Ok(())
    }

    pub async fn list_mints(&self) -> Vec<String> {
        self.wallets.read().await.keys().cloned().collect()
    }

    pub async fn set_mint_active(
        &self,
        mint_url: &str,
        active: bool,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut wallets = self.wallets.write().await;
        if let Some(info) = wallets.get_mut(mint_url) {
            info.active = active;
            Ok(())
        } else {
            Err("Mint not found".into())
        }
    }

    pub async fn get_total_balance(&self) -> Result<MultimintBalance, Box<dyn std::error::Error>> {
        let wallets = self.wallets.read().await;
        let mut total_balance = 0u64;
        let mut balances_by_mint = Vec::new();

        for (mint_url, info) in wallets.iter() {
            if !info.active {
                continue;
            }

            let balance_str = info.wallet.balance().await?;
            let balance = balance_str.parse::<u64>().unwrap_or(0);
            total_balance += balance;

            balances_by_mint.push(MintBalance {
                mint_url: mint_url.clone(),
                balance,
                unit: info.unit.clone(),
                proof_count: 0,
            });
        }

        Ok(MultimintBalance {
            total_balance,
            balances_by_mint,
        })
    }

    pub async fn get_mint_balance(
        &self,
        mint_url: &str,
    ) -> Result<u64, Box<dyn std::error::Error>> {
        let wallets = self.wallets.read().await;
        if let Some(info) = wallets.get(mint_url) {
            let balance_str = info.wallet.balance().await?;
            Ok(balance_str.parse::<u64>().unwrap_or(0))
        } else {
            Err("Mint not found".into())
        }
    }

    pub async fn send(
        &self,
        amount: u64,
        options: MultimintSendOptions,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let wallets = self.wallets.read().await;

        if wallets.is_empty() {
            return Err("No mints configured. Please add a mint before sending tokens.".into());
        }

        if let Some(preferred_mint) = &options.preferred_mint {
            if let Some(info) = wallets.get(preferred_mint) {
                if info.active {
                    return info.wallet.send(amount).await.map_err(|e| e.into());
                } else {
                    return Err("Preferred mint is inactive".into());
                }
            }
            return Err("Preferred mint not found. Please configure the mint first.".into());
        }

        if options.split_across_mints {
            let active_wallets: Vec<_> = wallets.values().filter(|info| info.active).collect();

            if active_wallets.is_empty() {
                return Err("No active mints available".into());
            }

            let amount_per_mint = amount / active_wallets.len() as u64;
            let mut tokens = Vec::new();

            for info in active_wallets {
                if amount_per_mint > 0 {
                    let token = info.wallet.send(amount_per_mint).await?;
                    tokens.push(token);
                }
            }

            return Ok(tokens.join("\n"));
        }

        // Find first active mint with sufficient balance
        for info in wallets.values() {
            if !info.active {
                continue;
            }

            let balance_str = info.wallet.balance().await?;
            let balance = balance_str.parse::<u64>().unwrap_or(0);

            if balance >= amount {
                return info.wallet.send(amount).await.map_err(|e| e.into());
            }
        }

        Err("Insufficient balance in any mint".into())
    }

    pub async fn receive(&self, token: &str) -> Result<String, Box<dyn std::error::Error>> {
        // Try to receive with existing wallets first
        let wallets = self.wallets.read().await;

        for info in wallets.values() {
            if !info.active {
                continue;
            }

            match info.wallet.receive(token).await {
                Ok(result) => return Ok(result.to_string()),
                Err(_) => continue, // Try next wallet
            }
        }

        drop(wallets); // Release read lock

        // If no existing wallet can receive, we'd need to parse the token to get the mint URL
        // For now, return an error
        Err("Unable to receive token - mint not found or token invalid".into())
    }

    pub async fn transfer_between_mints(
        &self,
        from_mint: &str,
        to_mint: &str,
        amount: u64,
    ) -> Result<String, Box<dyn std::error::Error>> {
        // Get token from source mint
        let token = {
            let wallets = self.wallets.read().await;
            let from_info = wallets.get(from_mint).ok_or("Source mint not found")?;

            if !from_info.active {
                return Err("Source mint is not active".into());
            }

            from_info.wallet.send(amount).await?
        };

        // Receive token in destination mint
        {
            let wallets = self.wallets.read().await;
            let to_info = wallets.get(to_mint).ok_or("Destination mint not found")?;

            if !to_info.active {
                return Err("Destination mint is not active".into());
            }

            to_info.wallet.receive(&token).await?;
        }

        Ok(format!(
            "Successfully transferred {} msats from {} to {}",
            amount, from_mint, to_mint
        ))
    }

    pub async fn get_wallet_for_mint(&self, mint_url: &str) -> Option<CashuWalletClient> {
        let wallets = self.wallets.read().await;
        wallets.get(mint_url).map(|info| info.wallet.clone())
    }

    pub async fn redeem_pendings(&self) -> Result<(), Box<dyn std::error::Error>> {
        let wallets = self.wallets.read().await;

        for info in wallets.values() {
            if info.active {
                // CashuWalletClient doesn't have redeem_pendings method, skip for now
                // TODO: Implement when available in the wallet
            }
        }

        Ok(())
    }

    // Backward compatibility method
    pub async fn balance(&self) -> Result<String, Box<dyn std::error::Error>> {
        let balance = self.get_total_balance().await?;
        Ok(balance.total_balance.to_string())
    }

    // Backward compatibility method - uses first active mint
    pub async fn send_simple(&self, amount: u64) -> Result<String, Box<dyn std::error::Error>> {
        self.send(amount, MultimintSendOptions::default()).await
    }

    // Backward compatibility method - tries all active mints
    pub async fn receive_simple(&self, token: &str) -> Result<String, Box<dyn std::error::Error>> {
        self.receive(token).await
    }

    // Backward compatibility method for pending transactions
    pub async fn pending(&self) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let wallets = self.wallets.read().await;
        let mut all_pending = serde_json::Map::new();

        for (mint_url, info) in wallets.iter() {
            if info.active {
                // For now, return empty since CashuWalletClient doesn't expose pending method
                // TODO: Implement when available in the wallet
                all_pending.insert(mint_url.clone(), serde_json::Value::Array(vec![]));
            }
        }

        Ok(serde_json::Value::Object(all_pending))
    }
}
