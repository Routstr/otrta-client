use crate::db::mint::CurrencyUnit;
use crate::db::transaction::{add_transaction, TransactionDirection, TransactionType};
use crate::db::Pool;
use cdk::amount::SplitTarget;
use cdk::nuts::nut23::QuoteState;
use cdk::{wallet::SendOptions, Amount};
use ecash_402_wallet::multimint::{MultimintSendOptions, MultimintWallet};
use serde::{Deserialize, Serialize};

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
    pub balances_by_unit: std::collections::HashMap<String, u64>,
    pub mints_with_balances: Vec<crate::db::mint::MintWithBalances>,
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
        wallet: &ecash_402_wallet::wallet::CashuWalletClient,
        mint_url: &str,
        seed: &str,
        base_db_path: &str,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let wallet =
            MultimintWallet::from_existing_wallet(wallet, mint_url, seed, base_db_path).await?;
        Ok(Self { inner: wallet })
    }

    pub fn inner(&self) -> &MultimintWallet {
        &self.inner
    }

    pub async fn add_mint(
        &self,
        mint_url: &str,
        unit: cdk::nuts::CurrencyUnit,
    ) -> Result<(), Box<dyn std::error::Error>> {
        self.inner.add_mint(mint_url, Some(unit)).await?;
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
            .into_values()
            .map(|mint_balance| LocalMintBalance {
                mint_url: mint_balance.mint_url,
                balance: mint_balance.balance,
                unit: convert_currency_unit_from_cdk(mint_balance.unit),
                proof_count: mint_balance.proof_count,
            })
            .collect();

        let mut balances_by_unit = std::collections::HashMap::new();
        for mint_balance in &balances_by_mint {
            let unit_str = mint_balance.unit.to_string();
            *balances_by_unit.entry(unit_str).or_insert(0) += mint_balance.balance;
        }

        Ok(LocalMultimintBalance {
            total_balance: balance.total_balance,
            balances_by_mint,
            balances_by_unit,
            mints_with_balances: Vec::new(),
        })
    }

    pub async fn get_mint_balance(
        &self,
        mint_url: &str,
    ) -> Result<u64, Box<dyn std::error::Error>> {
        let balance = self.inner.get_mint_balance(mint_url).await?;
        Ok(balance)
    }

    pub async fn get_balance_for_mint(
        &self,
        mint_url: &str,
    ) -> Result<u64, Box<dyn std::error::Error>> {
        self.get_mint_balance(mint_url).await
    }

    pub async fn get_balances_by_units(
        &self,
        db: &crate::db::Pool,
        organization_id: &uuid::Uuid,
    ) -> Result<LocalMultimintBalance, Box<dyn std::error::Error>> {
        use crate::db::mint::{
            get_active_mints_with_units_for_organization, MintUnitBalance, MintWithBalances,
        };

        let mints_with_units =
            get_active_mints_with_units_for_organization(db, organization_id).await?;
        let mut mints_with_balances = Vec::new();
        let mut total_balance = 0u64;
        let mut balances_by_unit = std::collections::HashMap::new();
        let mut legacy_balances_by_mint = Vec::new();

        for mint_with_units in mints_with_units {
            let mut unit_balances = Vec::new();

            // Get the total balance for this mint from the wallet
            let (mint_balance, proof_count) = match self
                .get_wallet_for_mint(&mint_with_units.mint.mint_url)
                .await
            {
                Some(wallet) => {
                    let balance = wallet.balance().await.unwrap_or(0);
                    (balance, 0) // TODO: Get actual proof count from wallet
                }
                None => (0, 0),
            };

            // For now, assign the full mint balance to the primary unit
            // In the future, we can enhance this to track separate balances per unit
            if let Some(primary_unit) = mint_with_units.supported_units.first() {
                if primary_unit.active {
                    unit_balances.push(MintUnitBalance {
                        mint_id: mint_with_units.mint.id,
                        mint_url: mint_with_units.mint.mint_url.clone(),
                        mint_name: mint_with_units.mint.name.clone(),
                        unit: primary_unit.unit.clone(),
                        balance: mint_balance,
                        proof_count,
                    });

                    *balances_by_unit
                        .entry(primary_unit.unit.clone())
                        .or_insert(0) += mint_balance;
                }

                // Add zero balances for other supported units to show they exist
                for unit in mint_with_units.supported_units.iter().skip(1) {
                    if unit.active {
                        unit_balances.push(MintUnitBalance {
                            mint_id: mint_with_units.mint.id,
                            mint_url: mint_with_units.mint.mint_url.clone(),
                            mint_name: mint_with_units.mint.name.clone(),
                            unit: unit.unit.clone(),
                            balance: 0, // For now, only primary unit has balance
                            proof_count: 0,
                        });
                    }
                }
            }

            if !unit_balances.is_empty() {
                // Add legacy format for backward compatibility
                let primary_unit = &unit_balances[0];
                legacy_balances_by_mint.push(LocalMintBalance {
                    mint_url: mint_with_units.mint.mint_url.clone(),
                    balance: mint_balance,
                    unit: convert_currency_unit_from_cdk(
                        primary_unit
                            .unit
                            .parse()
                            .unwrap_or(cdk::nuts::CurrencyUnit::Msat),
                    ),
                    proof_count: primary_unit.proof_count,
                });

                mints_with_balances.push(MintWithBalances {
                    mint_id: mint_with_units.mint.id,
                    mint_url: mint_with_units.mint.mint_url,
                    mint_name: mint_with_units.mint.name,
                    unit_balances,
                    total_balance: mint_balance,
                });
            }

            total_balance += mint_balance;
        }

        Ok(LocalMultimintBalance {
            total_balance,
            balances_by_mint: legacy_balances_by_mint,
            balances_by_unit,
            mints_with_balances,
        })
    }

    pub async fn send(
        &self,
        amount: u64,
        options: LocalMultimintSendOptions,
        db: &Pool,
        api_key_id: Option<&str>,
        user_id: Option<&str>,
        provider_url: Option<&str>,
        unit: Option<&str>,
        model: Option<&str>,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let send_options = MultimintSendOptions {
            preferred_mint: options.preferred_mint,
            ..Default::default()
        };

        let token = self.inner.send(amount, send_options).await?;

        add_transaction(
            db,
            &token,
            &amount.to_string(),
            TransactionDirection::Outgoing,
            api_key_id,
            user_id,
            if user_id.is_some() {
                TransactionType::Chat
            } else {
                TransactionType::Api
            },
            provider_url,
            unit,
            model,
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

    pub async fn get_wallet_for_mint(&self, mint_url: &str) -> Option<CdkWalletWrapper> {
        self.inner
            .get_wallet_for_mint(mint_url)
            .await
            .map(CdkWalletWrapper::new)
    }

    pub async fn get_wallet_for_mint_with_token(
        &self,
        mint_url: &str,
        token: &str,
    ) -> Option<CdkWalletWrapper> {
        println!("{:?}", token);
        self.inner
            .get_wallet_for_mint_with_token(mint_url, token)
            .await
            .map(CdkWalletWrapper::new)
    }

    pub async fn redeem_pendings(&self) -> Result<(), Box<dyn std::error::Error>> {
        self.inner.redeem_pendings().await?;
        Ok(())
    }

    pub async fn balance(&self) -> Result<String, Box<dyn std::error::Error>> {
        let balance = self.get_total_balance().await?;
        Ok(balance.total_balance.to_string())
    }

    pub async fn send_simple(
        &self,
        amount: u64,
        options: LocalMultimintSendOptions,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let send_options = MultimintSendOptions {
            preferred_mint: options.preferred_mint,
            ..Default::default()
        };

        let token = self.inner.send(amount, send_options).await?;
        Ok(token)
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

#[derive(Debug, Clone)]
pub struct CdkWalletWrapper {
    inner: cdk::wallet::Wallet,
}

impl CdkWalletWrapper {
    pub fn new(wallet: cdk::wallet::Wallet) -> Self {
        Self { inner: wallet }
    }

    pub async fn receive(&self, token: &str) -> Result<u64, Box<dyn std::error::Error>> {
        use cdk::wallet::ReceiveOptions;

        let received = self
            .inner
            .receive(token, ReceiveOptions::default())
            .await
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;

        let amount: u64 = received.into();
        Ok(amount)
    }

    pub async fn send(&self, amount: u64) -> Result<String, Box<dyn std::error::Error>> {
        let amount_obj = Amount::from(amount);
        let prepared_send = self
            .inner
            .prepare_send(amount_obj, SendOptions::default())
            .await
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;

        let token = self
            .inner
            .send(prepared_send, None)
            .await
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;

        Ok(token.to_string())
    }

    pub async fn balance(&self) -> Result<u64, Box<dyn std::error::Error>> {
        let balance = self
            .inner
            .total_balance()
            .await
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;

        let amount: u64 = balance.into();
        Ok(amount)
    }

    pub async fn mint_quote(
        &self,
        amount: u64,
        description: Option<String>,
    ) -> Result<cdk::wallet::MintQuote, cdk::Error> {
        self.inner
            .mint_quote(Amount::from(amount), description)
            .await
    }

    pub async fn melt_quote(
        &self,
        invoice: String,
        options: Option<cdk::nuts::MeltOptions>,
    ) -> Result<cdk::wallet::MeltQuote, cdk::Error> {
        self.inner.melt_quote(invoice, options).await
    }

    pub async fn check_mint_quote(&self, quote_id: &str) -> Result<QuoteState, cdk::Error> {
        // FIXME: Improve
        match self
            .inner
            .mint(quote_id, SplitTarget::default(), None)
            .await
        {
            Ok(_resp) => Ok(QuoteState::Paid),
            Err(e) => {
                println!("{:?}", e);
                Ok(QuoteState::Pending)
            }
        }
    }
}
