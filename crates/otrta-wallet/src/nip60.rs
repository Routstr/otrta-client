use crate::error::Result;
use nostr_sdk::prelude::*;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use std::time::Duration;

// Import CDK token types for proper cashu token parsing only
use cdk::nuts::nut00::{Proof, Token};

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
    pub amount: String,
    pub events: Vec<(String, String, String, String)>, // [e, event_id, relay, marker]
}

#[derive(Debug, Clone)]
pub struct TokenEvent {
    pub id: EventId,
    pub data: TokenData,
}

/// NIP-60 Cashu Wallet State Manager
/// This manages cashu wallet state in Nostr events only - no actual cashu operations
pub struct Nip60Wallet {
    client: Client,
    wallet_privkey: String,
    mints: Vec<String>,
}

impl Nip60Wallet {
    /// Create a new NIP-60 wallet state manager from existing config
    pub async fn from_config(
        nostr_keys: Keys,
        relays: Vec<&str>,
        wallet_privkey: &str,
        mints: Vec<String>,
    ) -> Result<Self> {
        let client = Client::new(nostr_keys);

        for relay in relays {
            client
                .add_relay(relay)
                .await
                .map_err(|e| crate::error::Error::custom(&format!("Failed to add relay: {}", e)))?;
        }

        client.connect().await;

        Ok(Self {
            client,
            wallet_privkey: wallet_privkey.to_string(),
            mints,
        })
    }

    /// Create a new NIP-60 wallet and publish the configuration
    pub async fn new(nostr_keys: Keys, relays: Vec<&str>, wallet_privkey: String, mints: Vec<String>) -> Result<Self> {
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
            wallet_privkey,
            mints,
        };

        wallet.publish_wallet_config().await?;

        Ok(wallet)
    }

    /// Load existing NIP-60 wallet configuration from Nostr
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

            return Ok(Some(Self {
                client,
                wallet_privkey: config.privkey,
                mints: config.mints,
            }));
        }

        Ok(None)
    }

    /// Publish wallet configuration to Nostr (kind 17375)
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

    /// Record a spending operation in NIP-60 events (state transition only)
    pub async fn record_spend(&self, amount: u64, spent_token_ids: Vec<EventId>, unspent_proofs: Vec<CashuProof>) -> Result<()> {
        // Create new token event with unspent proofs if any
        let mut new_token_event_id = None;
        if !unspent_proofs.is_empty() {
            new_token_event_id = Some(
                self.create_rollover_token_event(&unspent_proofs, &spent_token_ids)
                    .await?,
            );
        }

        // Delete spent token events using NIP-09
        for token_id in &spent_token_ids {
            self.delete_token_event(token_id).await?;
        }

        // Create spending history
        let mut event_refs = Vec::new();
        for token_id in &spent_token_ids {
            event_refs.push((
                "e".to_string(),
                token_id.to_hex(),
                "".to_string(),
                "destroyed".to_string(),
            ));
        }
        if let Some(new_id) = new_token_event_id {
            event_refs.push((
                "e".to_string(),
                new_id.to_hex(),
                "".to_string(),
                "created".to_string(),
            ));
        }

        self.create_spending_history("out", amount, event_refs)
            .await?;

        Ok(())
    }

    /// Record received cashu tokens as NIP-60 token events
    pub async fn record_receive(&self, token_string: &str) -> Result<u64> {
        // Parse the cashu token using CDK for validation
        let parsed_token = self.parse_cashu_token(token_string)?;

        // Calculate total amount received from parsed token
        let total_amount = self.calculate_token_amount(&parsed_token)?;

        // Create token events for the received token
        let mut created_event_ids = Vec::new();

        // Extract mint URL and proofs from the parsed token
        let mint_url = parsed_token
            .mint_url()
            .map_err(|e| crate::error::Error::custom(&format!("Failed to get mint URL: {}", e)))?
            .to_string();
        let proofs = self.convert_proofs_to_cashu(&parsed_token.proofs())?;
        let token_event_id = self.create_token_event(&mint_url, &proofs, vec![]).await?;
        created_event_ids.push(token_event_id);

        // Create spending history for received tokens
        let event_refs: Vec<_> = created_event_ids
            .iter()
            .map(|id| {
                (
                    "e".to_string(),
                    id.to_hex(),
                    "".to_string(),
                    "created".to_string(),
                )
            })
            .collect();

        self.create_spending_history("in", total_amount, event_refs)
            .await?;

        Ok(total_amount)
    }

    /// Parse cashu token string using official CDK nut00 implementation (for validation only)
    pub fn parse_cashu_token(&self, token_string: &str) -> Result<Token> {
        // Use CDK's official token parsing with FromStr trait
        Token::from_str(token_string).map_err(|e| {
            crate::error::Error::custom(&format!("Failed to parse cashu token: {}", e))
        })
    }

    /// Calculate total amount from CDK token
    fn calculate_token_amount(&self, token: &Token) -> Result<u64> {
        let amount: u64 = token
            .proofs()
            .iter()
            .map(|proof| proof.amount.to_string().parse::<u64>().unwrap())
            .sum();
        Ok(amount)
    }

    /// Convert CDK proofs to our internal CashuProof format for storage
    fn convert_proofs_to_cashu(&self, proofs: &[Proof]) -> Result<Vec<CashuProof>> {
        let mut cashu_proofs = Vec::new();

        for proof in proofs {
            cashu_proofs.push(CashuProof {
                id: proof.keyset_id.to_string(),
                amount: proof.amount.to_string().parse::<u64>().unwrap(),
                secret: proof.secret.to_string(),
                c: proof.c.to_string(),
            });
        }

        Ok(cashu_proofs)
    }

    /// Calculate balance from Nostr token events
    pub async fn calculate_balance(&self) -> Result<u64> {
        let token_events = self.fetch_token_events().await?;
        let balance = token_events
            .iter()
            .flat_map(|event| &event.data.proofs)
            .map(|proof| proof.amount)
            .sum();
        Ok(balance)
    }

    /// Fetch all token events from nostr
    pub async fn fetch_token_events(&self) -> Result<Vec<TokenEvent>> {
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

        let mut token_events = Vec::new();

        for event in events {
            let decrypted = signer
                .nip44_decrypt(&public_key, &event.content)
                .await
                .map_err(|e| crate::error::Error::custom(&format!("Decryption failed: {}", e)))?;

            let token_data: TokenData = serde_json::from_str(&decrypted)
                .map_err(|e| crate::error::Error::custom(&format!("Invalid token data: {}", e)))?;

            token_events.push(TokenEvent {
                id: event.id,
                data: token_data,
            });
        }

        Ok(token_events)
    }

    /// Create a new token event (kind 7375)
    async fn create_token_event(
        &self,
        mint: &str,
        proofs: &[CashuProof],
        del: Vec<String>,
    ) -> Result<EventId> {
        let token_data = TokenData {
            mint: mint.to_string(),
            proofs: proofs.to_vec(),
            del,
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

        let output = self
            .client
            .send_event_builder(event_builder)
            .await
            .map_err(|e| {
                crate::error::Error::custom(&format!("Failed to publish token event: {}", e))
            })?;

        Ok(output.val)
    }

    /// Create a rollover token event with unspent proofs
    async fn create_rollover_token_event(
        &self,
        unspent_proofs: &[CashuProof],
        deleted_token_ids: &[EventId],
    ) -> Result<EventId> {
        let del: Vec<String> = deleted_token_ids.iter().map(|id| id.to_hex()).collect();

        if let Some(mint) = &self.mints.first() {
            self.create_token_event(mint, unspent_proofs, del).await
        } else {
            Err(crate::error::Error::custom("No mint configured"))
        }
    }

    /// Delete a token event using NIP-09
    async fn delete_token_event(&self, token_id: &EventId) -> Result<()> {
        // Create a NIP-09 delete event (kind 5)
        let delete_builder = EventBuilder::new(Kind::EventDeletion, "").tags([
            Tag::event(*token_id),
            Tag::custom(TagKind::Custom("k".into()), [kinds::TOKEN.to_string()]),
        ]);

        self.client
            .send_event_builder(delete_builder)
            .await
            .map_err(|e| {
                crate::error::Error::custom(&format!("Failed to delete token event: {}", e))
            })?;

        Ok(())
    }

    /// Create spending history event (kind 7376)
    async fn create_spending_history(
        &self,
        direction: &str,
        amount: u64,
        event_refs: Vec<(String, String, String, String)>,
    ) -> Result<()> {
        let history = SpendingHistory {
            direction: direction.to_string(),
            amount: amount.to_string(),
            events: event_refs.clone(),
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

        // Create tags for event references (unencrypted for 'redeemed' marker)
        let mut tags = Vec::new();
        for (tag_name, event_id, relay, marker) in &event_refs {
            if marker == "redeemed" {
                tags.push(Tag::custom(
                    TagKind::Custom(tag_name.clone().into()),
                    [event_id, relay, marker],
                ));
            }
        }

        let event_builder =
            EventBuilder::new(kinds::SPENDING_HISTORY, encrypted_content).tags(tags);

        self.client
            .send_event_builder(event_builder)
            .await
            .map_err(|e| {
                crate::error::Error::custom(&format!("Failed to publish spending history: {}", e))
            })?;

        Ok(())
    }

    /// Get spending history from Nostr
    pub async fn get_spending_history(&self) -> Result<Vec<SpendingHistory>> {
        let signer = self
            .client
            .signer()
            .await
            .map_err(|e| crate::error::Error::custom(&format!("Signer error: {}", e)))?;

        let public_key = signer
            .get_public_key()
            .await
            .map_err(|e| crate::error::Error::custom(&format!("Public key error: {}", e)))?;

        let filter = Filter::new()
            .author(public_key)
            .kind(kinds::SPENDING_HISTORY);

        let events = self
            .client
            .fetch_events(filter, Duration::from_secs(10))
            .await
            .map_err(|e| {
                crate::error::Error::custom(&format!("Failed to fetch spending history: {}", e))
            })?;

        let mut history = Vec::new();

        for event in events {
            let decrypted = signer
                .nip44_decrypt(&public_key, &event.content)
                .await
                .map_err(|e| crate::error::Error::custom(&format!("Decryption failed: {}", e)))?;

            let spending_history: SpendingHistory =
                serde_json::from_str(&decrypted).map_err(|e| {
                    crate::error::Error::custom(&format!("Invalid spending history: {}", e))
                })?;

            history.push(spending_history);
        }

        Ok(history)
    }

    /// Get wallet statistics from Nostr events
    pub async fn get_stats(&self) -> Result<WalletStats> {
        let balance = self.calculate_balance().await?;
        let token_events = self.fetch_token_events().await?;

        Ok(WalletStats {
            balance,
            token_events: token_events.len(),
            mints: self.mints.clone(),
        })
    }

    /// Get wallet configuration
    pub fn get_config(&self) -> WalletConfig {
        WalletConfig {
            privkey: self.wallet_privkey.clone(),
            mints: self.mints.clone(),
        }
    }

    /// Update wallet configuration and republish
    pub async fn update_config(&mut self, privkey: Option<String>, mints: Option<Vec<String>>) -> Result<()> {
        if let Some(new_privkey) = privkey {
            self.wallet_privkey = new_privkey;
        }
        if let Some(new_mints) = mints {
            self.mints = new_mints;
        }
        self.publish_wallet_config().await
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletStats {
    pub balance: u64,
    pub token_events: usize,
    pub mints: Vec<String>,
}

pub mod utils {
    use super::*;

    /// Generate a wallet private key for P2PK ecash operations
    pub fn generate_wallet_privkey() -> String {
        use bip39::Mnemonic;
        let mnemonic = Mnemonic::generate(12).unwrap();
        mnemonic.to_string()
    }

    /// Create a quote event for tracking payment state (kind 7374)
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
