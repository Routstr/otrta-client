use crate::db::mint::CurrencyUnit;
use crate::db::transaction::{add_transaction, TransactionDirection};
use crate::db::Pool;
use ecash_402_wallet::multimint::{MultimintSendOptions, MultimintWallet};
use serde::{Deserialize, Serialize};

fn convert_currency_unit(unit: CurrencyUnit) -> cdk::nuts::CurrencyUnit {
    match unit {
        CurrencyUnit::Sat => cdk::nuts::CurrencyUnit::Sat,
        CurrencyUnit::Msat => cdk::nuts::CurrencyUnit::Msat,
    }
}

fn convert_currency_unit_from_cdk(unit: cdk::nuts::CurrencyUnit) -> CurrencyUnit {
    match unit {
        cdk::nuts::CurrencyUnit::Sat => CurrencyUnit::Sat,
        cdk::nuts::CurrencyUnit::Msat => CurrencyUnit::Msat,
        _ => CurrencyUnit::Msat,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalMultimintBalance {
    pub total_balance: u64,
    pub balances_by_mint: Vec<LocalMintBalance>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalMintBalance {
    pub mint_url: String,
    pub balance: u64,
    pub unit: CurrencyUnit,
    pub proof_count: usize,
}

#[derive(Debug, Clone, Default)]
pub struct LocalMultimintSendOptions {
    pub preferred_mint: Option<String>,
    pub unit: Option<CurrencyUnit>,
    pub split_across_mints: bool,
}

#[derive(Debug, Clone)]
pub struct MultimintWalletWrapper {
    inner: MultimintWallet,
}

impl MultimintWalletWrapper {
    pub async fn new(seed: &str, base_db_path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let wallet = MultimintWallet::new(seed, base_db_path).await?;
        Ok(Self { inner: wallet })
    }

    pub async fn from_existing_wallet(
        _wallet: &ecash_402_wallet::wallet::CashuWalletClient,
        mint_url: &str,
        seed: &str,
        base_db_path: &str,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let wallet =
            MultimintWallet::from_existing_wallet(_wallet, mint_url, seed, base_db_path).await?;
        Ok(Self { inner: wallet })
    }

    pub async fn add_mint(
        &self,
        mint_url: &str,
        unit: CurrencyUnit,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.inner
            .add_mint(mint_url, Some(convert_currency_unit(unit)))
            .await?;
        Ok(())
    }

    pub async fn remove_mint(&self, mint_url: &str) -> Result<(), Box<dyn std::error::Error>> {
        self.inner.remove_mint(mint_url).await?;
        Ok(())
    }

    pub async fn list_mints(&self) -> Vec<String> {
        self.inner.list_mints().await
    }

    pub async fn set_mint_active(
        &self,
        mint_url: &str,
        active: bool,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.inner.set_mint_active(mint_url, active).await?;
        Ok(())
    }

    pub async fn get_total_balance(
        &self,
    ) -> Result<LocalMultimintBalance, Box<dyn std::error::Error>> {
        let balance = self.inner.get_total_balance().await?;

        let balances_by_mint: Vec<LocalMintBalance> = balance
            .balances_by_mint
            .into_iter()
            .map(|(_, mint_balance)| LocalMintBalance {
                mint_url: mint_balance.mint_url,
                balance: mint_balance.balance,
                unit: convert_currency_unit_from_cdk(mint_balance.unit),
                proof_count: mint_balance.proof_count,
            })
            .collect();

        Ok(LocalMultimintBalance {
            total_balance: balance.total_balance,
            balances_by_mint,
        })
    }

    pub async fn get_mint_balance(
        &self,
        mint_url: &str,
    ) -> Result<u64, Box<dyn std::error::Error>> {
        let balance = self.inner.get_mint_balance(mint_url).await?;
        Ok(balance)
    }

    pub async fn send(
        &self,
        amount: u64,
        options: LocalMultimintSendOptions,
        db: &Pool,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let send_options = MultimintSendOptions {
            preferred_mint: options.preferred_mint,
            unit: options.unit.map(convert_currency_unit),
            split_across_mints: options.split_across_mints,
        };

        let token = self.inner.send(amount, send_options).await?;

        add_transaction(
            db,
            &token,
            &amount.to_string(),
            TransactionDirection::Outgoing,
        )
        .await?;

        Ok(token)
    }

    pub async fn receive(&self, token: &str) -> Result<String, Box<dyn std::error::Error>> {
        let result = self.inner.receive(token).await?;
        Ok(result)
    }

    pub async fn transfer_between_mints(
        &self,
        from_mint: &str,
        to_mint: &str,
        amount: u64,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let result = self
            .inner
            .transfer_between_mints(from_mint, to_mint, amount)
            .await?;
        Ok(result)
    }

    pub async fn get_wallet_for_mint(
        &self,
        mint_url: &str,
    ) -> Option<ecash_402_wallet::wallet::CashuWalletClient> {
        self.inner.get_wallet_for_mint(mint_url).cloned()
    }

    pub async fn redeem_pendings(&self) -> Result<(), Box<dyn std::error::Error>> {
        self.inner.redeem_pendings().await?;
        Ok(())
    }

    pub async fn balance(&self) -> Result<String, Box<dyn std::error::Error>> {
        let balance = self.get_total_balance().await?;
        Ok(balance.total_balance.to_string())
    }

    pub async fn send_simple(&self, amount: u64, db: &Pool) -> Result<String, Box<dyn std::error::Error>> {
        self.send(amount, LocalMultimintSendOptions::default(), db)
            .await
    }

    pub async fn receive_simple(&self, token: &str) -> Result<String, Box<dyn std::error::Error>> {
        self.receive(token).await
    }

    pub async fn pending(&self) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let all_pending = self.inner.get_all_pending().await?;

        let mut result = serde_json::Map::new();
        for (mint_url, pending) in all_pending {
            let pending_json: Vec<serde_json::Value> = pending
                .into_iter()
                .map(|p| serde_json::to_value(p).unwrap_or(serde_json::Value::Null))
                .collect();
            result.insert(mint_url, serde_json::Value::Array(pending_json));
        }

        Ok(serde_json::Value::Object(result))
    }
}
