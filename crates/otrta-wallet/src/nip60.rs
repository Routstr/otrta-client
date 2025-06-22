use crate::{error::Result, models::SendTokenPendingResponse, wallet::CashuWalletClient};
use nostr_sdk::prelude::*;
use serde::{Deserialize, Serialize};
use std::time::Duration;

pub mod kinds {
    use nostr_sdk::Kind;

    pub const WALLET: Kind = Kind::Custom(17375);
    pub const TOKEN: Kind = Kind::Custom(7375);
    pub const SPENDING_HISTORY: Kind = Kind::Custom(7376);
    pub const QUOTE: Kind = Kind::Custom(7374);
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletConfig {
    pub privkey: String,
    pub mints: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenData {
    pub mint: String,
    pub proofs: Vec<CashuProof>,
    #[serde(default)]
    pub del: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CashuProof {
    pub id: String,
    pub amount: u64,
    pub secret: String,
    #[serde(rename = "C")]
    pub c: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpendingHistory {
    pub direction: String,
    pub amount: u64,
    pub events: Vec<EventReference>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventReference {
    pub event_id: String,
    pub marker: String,
}

pub struct Nip60Wallet {
    client: Client,
    cashu_wallet: CashuWalletClient,
    wallet_privkey: String,
    mints: Vec<String>,
}

impl Nip60Wallet {
    pub async fn from_config(
        nostr_keys: Keys,
        relays: Vec<&str>,
        mint_url: &str,
        wallet_seed: &str,
    ) -> Result<Self> {
        let client = Client::new(nostr_keys);

        for relay in relays {
            client
                .add_relay(relay)
                .await
                .map_err(|e| crate::error::Error::custom(&format!("Failed to add relay: {}", e)))?;
        }

        client.connect().await;

        let cashu_wallet = CashuWalletClient::from_seed(mint_url, wallet_seed)?;

        Ok(Self {
            client,
            cashu_wallet,
            wallet_privkey: wallet_seed.to_string(),
            mints: vec![mint_url.to_string()],
        })
    }

    pub async fn new(nostr_keys: Keys, relays: Vec<&str>, mint_url: &str) -> Result<Self> {
        let mut wallet_seed = String::new();
        let cashu_wallet = CashuWalletClient::new(mint_url, &mut wallet_seed)?;
        let client = Client::new(nostr_keys);

        for relay in relays {
            client
                .add_relay(relay)
                .await
                .map_err(|e| crate::error::Error::custom(&format!("Failed to add relay: {}", e)))?;
        }

        client.connect().await;

        let wallet = Self {
            client,
            cashu_wallet,
            wallet_privkey: wallet_seed,
            mints: vec![mint_url.to_string()],
        };

        wallet.publish_wallet_config().await?;

        Ok(wallet)
    }

    pub async fn load_from_nostr(nostr_keys: Keys, relays: Vec<&str>) -> Result<Option<Self>> {
        let client = Client::new(nostr_keys.clone());

        for relay in relays {
            client
                .add_relay(relay)
                .await
                .map_err(|e| crate::error::Error::custom(&format!("Failed to add relay: {}", e)))?;
        }

        client.connect().await;

        let filter = Filter::new()
            .author(nostr_keys.public_key())
            .kind(kinds::WALLET)
            .limit(1);

        let events = client
            .fetch_events(filter, Duration::from_secs(10))
            .await
            .map_err(|e| crate::error::Error::custom(&format!("Failed to fetch events: {}", e)))?;

        if let Some(wallet_event) = events.first() {
            let decrypted = client
                .signer()
                .await
                .map_err(|e| crate::error::Error::custom(&format!("Signer error: {}", e)))?
                .nip44_decrypt(&nostr_keys.public_key(), &wallet_event.content)
                .await
                .map_err(|e| crate::error::Error::custom(&format!("Decryption failed: {}", e)))?;

            let config: WalletConfig = serde_json::from_str(&decrypted).map_err(|e| {
                crate::error::Error::custom(&format!("Invalid wallet config: {}", e))
            })?;

            if let Some(mint_url) = config.mints.first() {
                let cashu_wallet = CashuWalletClient::from_seed(mint_url, &config.privkey)?;

                return Ok(Some(Self {
                    client,
                    cashu_wallet,
                    wallet_privkey: config.privkey,
                    mints: config.mints,
                }));
            }
        }

        Ok(None)
    }

    async fn publish_wallet_config(&self) -> Result<()> {
        let config = WalletConfig {
            privkey: self.wallet_privkey.clone(),
            mints: self.mints.clone(),
        };

        let content_json = serde_json::to_string(&config)
            .map_err(|e| crate::error::Error::custom(&format!("Serialization failed: {}", e)))?;

        let signer = self
            .client
            .signer()
            .await
            .map_err(|e| crate::error::Error::custom(&format!("Signer error: {}", e)))?;

        let public_key = signer
            .get_public_key()
            .await
            .map_err(|e| crate::error::Error::custom(&format!("Public key error: {}", e)))?;

        let encrypted_content = signer
            .nip44_encrypt(&public_key, &content_json)
            .await
            .map_err(|e| crate::error::Error::custom(&format!("Encryption failed: {}", e)))?;

        let mut tags = Vec::new();
        for mint in &self.mints {
            tags.push(Tag::custom(TagKind::Custom("mint".into()), [mint]));
        }

        let event_builder = EventBuilder::new(kinds::WALLET, encrypted_content).tags(tags);

        self.client
            .send_event_builder(event_builder)
            .await
            .map_err(|e| {
                crate::error::Error::custom(&format!("Failed to publish wallet config: {}", e))
            })?;

        Ok(())
    }

    pub async fn send(&self, amount: u64) -> Result<String> {
        let token = self.cashu_wallet.send(amount).await?;
        self.create_spending_history("out", amount, vec![]).await?;

        Ok(token)
    }

    pub async fn receive(&self, token: &str) -> Result<String> {
        let result = self.cashu_wallet.receive(token).await?;

        self.publish_token_event(token).await?;

        self.create_spending_history("in", 0, vec![]).await?;

        Ok(result)
    }

    pub async fn balance(&self) -> Result<u64> {
        let balance_str = self.cashu_wallet.balance().await?;
        balance_str
            .parse::<u64>()
            .map_err(|e| crate::error::Error::custom(&format!("Invalid balance: {}", e)))
    }

    pub async fn pending(&self) -> Result<Vec<SendTokenPendingResponse>> {
        self.cashu_wallet.pending().await
    }

    pub async fn redeem_pending(&self) -> Result<()> {
        self.cashu_wallet.redeem_pendings().await
    }

    pub async fn fetch_tokens(&self) -> Result<Vec<TokenData>> {
        let signer = self
            .client
            .signer()
            .await
            .map_err(|e| crate::error::Error::custom(&format!("Signer error: {}", e)))?;

        let public_key = signer
            .get_public_key()
            .await
            .map_err(|e| crate::error::Error::custom(&format!("Public key error: {}", e)))?;

        let filter = Filter::new().author(public_key).kind(kinds::TOKEN);

        let events = self
            .client
            .fetch_events(filter, Duration::from_secs(10))
            .await
            .map_err(|e| {
                crate::error::Error::custom(&format!("Failed to fetch token events: {}", e))
            })?;

        let mut tokens = Vec::new();

        for event in events {
            let decrypted = signer
                .nip44_decrypt(&public_key, &event.content)
                .await
                .map_err(|e| crate::error::Error::custom(&format!("Decryption failed: {}", e)))?;

            let token_data: TokenData = serde_json::from_str(&decrypted)
                .map_err(|e| crate::error::Error::custom(&format!("Invalid token data: {}", e)))?;

            tokens.push(token_data);
        }

        Ok(tokens)
    }

    async fn publish_token_event(&self, _token: &str) -> Result<()> {
        let token_data = TokenData {
            mint: self.mints[0].clone(),
            proofs: vec![], // Would be populated from the actual token
            del: vec![],
        };

        let content_json = serde_json::to_string(&token_data)
            .map_err(|e| crate::error::Error::custom(&format!("Serialization failed: {}", e)))?;

        let signer = self
            .client
            .signer()
            .await
            .map_err(|e| crate::error::Error::custom(&format!("Signer error: {}", e)))?;

        let public_key = signer
            .get_public_key()
            .await
            .map_err(|e| crate::error::Error::custom(&format!("Public key error: {}", e)))?;

        let encrypted_content = signer
            .nip44_encrypt(&public_key, &content_json)
            .await
            .map_err(|e| crate::error::Error::custom(&format!("Encryption failed: {}", e)))?;

        let event_builder = EventBuilder::new(kinds::TOKEN, encrypted_content);

        self.client
            .send_event_builder(event_builder)
            .await
            .map_err(|e| {
                crate::error::Error::custom(&format!("Failed to publish token event: {}", e))
            })?;

        Ok(())
    }

    async fn create_spending_history(
        &self,
        direction: &str,
        amount: u64,
        event_refs: Vec<EventReference>,
    ) -> Result<()> {
        let history = SpendingHistory {
            direction: direction.to_string(),
            amount,
            events: event_refs,
        };

        let content_json = serde_json::to_string(&history)
            .map_err(|e| crate::error::Error::custom(&format!("Serialization failed: {}", e)))?;

        let signer = self
            .client
            .signer()
            .await
            .map_err(|e| crate::error::Error::custom(&format!("Signer error: {}", e)))?;

        let public_key = signer
            .get_public_key()
            .await
            .map_err(|e| crate::error::Error::custom(&format!("Public key error: {}", e)))?;

        let encrypted_content = signer
            .nip44_encrypt(&public_key, &content_json)
            .await
            .map_err(|e| crate::error::Error::custom(&format!("Encryption failed: {}", e)))?;

        let event_builder = EventBuilder::new(kinds::SPENDING_HISTORY, encrypted_content);

        self.client
            .send_event_builder(event_builder)
            .await
            .map_err(|e| {
                crate::error::Error::custom(&format!("Failed to publish spending history: {}", e))
            })?;

        Ok(())
    }

    pub async fn validate_proofs(&self) -> Result<bool> {
        Ok(true)
    }

    pub async fn sync_from_nostr(&mut self) -> Result<()> {
        let tokens = self.fetch_tokens().await?;
        tracing::info!("Synced {} token events from Nostr", tokens.len());

        Ok(())
    }

    pub async fn get_stats(&self) -> Result<WalletStats> {
        let balance = self.balance().await?;
        let pending_txns = self.pending().await?;
        let tokens = self.fetch_tokens().await?;

        Ok(WalletStats {
            balance,
            pending_count: pending_txns.len(),
            token_events: tokens.len(),
            mints: self.mints.clone(),
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletStats {
    pub balance: u64,
    pub pending_count: usize,
    pub token_events: usize,
    pub mints: Vec<String>,
}

pub mod utils {
    use super::*;

    pub fn generate_wallet_privkey() -> String {
        use bip39::Mnemonic;
        let mnemonic = Mnemonic::generate(12).unwrap();
        mnemonic.to_string()
    }

    pub fn parse_cashu_token(_token: &str) -> Result<Vec<CashuProof>> {
        Ok(vec![])
    }

    pub async fn create_quote_event(
        client: &Client,
        quote_id: &str,
        mint_url: &str,
        expiry_hours: u64,
    ) -> Result<()> {
        let expiration = chrono::Utc::now().timestamp() + (expiry_hours * 3600) as i64;

        let signer = client
            .signer()
            .await
            .map_err(|e| crate::error::Error::custom(&format!("Signer error: {}", e)))?;

        let public_key = signer
            .get_public_key()
            .await
            .map_err(|e| crate::error::Error::custom(&format!("Public key error: {}", e)))?;

        let encrypted_content = signer
            .nip44_encrypt(&public_key, quote_id)
            .await
            .map_err(|e| crate::error::Error::custom(&format!("Encryption failed: {}", e)))?;

        let tags = vec![
            Tag::expiration(Timestamp::from(expiration as u64)),
            Tag::custom(TagKind::Custom("mint".into()), [mint_url]),
        ];

        let event_builder = EventBuilder::new(kinds::QUOTE, encrypted_content).tags(tags);

        client
            .send_event_builder(event_builder)
            .await
            .map_err(|e| {
                crate::error::Error::custom(&format!("Failed to publish quote event: {}", e))
            })?;

        Ok(())
    }
}
