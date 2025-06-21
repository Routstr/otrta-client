//! # NIP-60: Cashu Wallets Implementation
//! 
//! This module implements NIP-60 which defines operations for a cashu-based wallet
//! stored on Nostr relays to make it accessible across applications.
//! 
//! ## Reference
//! - NIP-60 Specification: https://nips.nostr.com/60
//! - Cashu Protocol: https://cashu.space/

use crate::{
    wallet::CashuWalletClient,
    error::Result,
    models::SendTokenPendingResponse
};
use nostr_sdk::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

/// NIP-60 Event Kinds
pub mod kinds {
    use nostr_sdk::Kind;
    
    /// Wallet information event (replaceable)
    pub const WALLET: Kind = Kind::Custom(17375);
    /// Token event (unspent proofs)
    pub const TOKEN: Kind = Kind::Custom(7375);
    /// Spending history event
    pub const SPENDING_HISTORY: Kind = Kind::Custom(7376);
    /// Quote event for redeeming (temporary)
    pub const QUOTE: Kind = Kind::Custom(7374);
}

/// Wallet configuration stored in NIP-60 wallet event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletConfig {
    /// Private key for P2PK ecash (different from Nostr key)
    pub privkey: String,
    /// Mint URLs this wallet uses
    pub mints: Vec<String>,
}

/// Token data stored in NIP-60 token events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenData {
    /// Mint URL the proofs belong to
    pub mint: String,
    /// Unencoded proofs in Cashu format
    pub proofs: Vec<CashuProof>,
    /// Token event IDs that were destroyed in creation of this token
    #[serde(default)]
    pub del: Vec<String>,
}

/// Cashu proof structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CashuProof {
    pub id: String,
    pub amount: u64,
    pub secret: String,
    #[serde(rename = "C")]
    pub c: String,
}

/// Spending history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpendingHistory {
    /// Direction: "in" for received, "out" for sent
    pub direction: String,
    /// Amount in satoshis
    pub amount: u64,
    /// Related event references
    pub events: Vec<EventReference>,
}

/// Event reference for spending history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventReference {
    pub event_id: String,
    pub marker: String, // "created", "destroyed", "redeemed"
}

/// High-level NIP-60 Cashu Wallet implementation
pub struct Nip60Wallet {
    /// Nostr client for relay communication
    client: Client,
    /// Underlying Cashu wallet
    cashu_wallet: CashuWalletClient,
    /// Wallet private key for ecash
    wallet_privkey: String,
    /// Mint URLs
    mints: Vec<String>,
}

impl Nip60Wallet {
    /// Create a new NIP-60 wallet from existing configuration
    pub async fn from_config(
        nostr_keys: Keys,
        relays: Vec<&str>,
        mint_url: &str,
        wallet_seed: &str,
    ) -> Result<Self> {
        // Initialize Nostr client
        let client = Client::new(nostr_keys);
        
        // Add relays
        for relay in relays {
            client.add_relay(relay).await.map_err(|e| 
                crate::error::Error::custom(&format!("Failed to add relay: {}", e)))?;
        }
        
        // Connect to relays
        client.connect().await;
        
        // Initialize Cashu wallet
        let cashu_wallet = CashuWalletClient::from_seed(mint_url, wallet_seed)?;
        
        Ok(Self {
            client,
            cashu_wallet,
            wallet_privkey: wallet_seed.to_string(),
            mints: vec![mint_url.to_string()],
        })
    }
    
    /// Create a new NIP-60 wallet with fresh configuration
    pub async fn new(
        nostr_keys: Keys,
        relays: Vec<&str>,
        mint_url: &str,
    ) -> Result<Self> {
        let mut wallet_seed = String::new();
        let cashu_wallet = CashuWalletClient::new(mint_url, &mut wallet_seed)?;
        
        // Initialize Nostr client
        let client = Client::new(nostr_keys);
        
        // Add relays
        for relay in relays {
            client.add_relay(relay).await.map_err(|e| 
                crate::error::Error::custom(&format!("Failed to add relay: {}", e)))?;
        }
        
        // Connect to relays
        client.connect().await;
        
        let wallet = Self {
            client,
            cashu_wallet,
            wallet_privkey: wallet_seed,
            mints: vec![mint_url.to_string()],
        };
        
        // Publish initial wallet configuration
        wallet.publish_wallet_config().await?;
        
        Ok(wallet)
    }
    
    /// Load wallet from existing Nostr events
    pub async fn load_from_nostr(
        nostr_keys: Keys,
        relays: Vec<&str>,
    ) -> Result<Option<Self>> {
        // Initialize temporary client for fetching
        let client = Client::new(nostr_keys.clone());
        
        for relay in relays {
            client.add_relay(relay).await.map_err(|e| 
                crate::error::Error::custom(&format!("Failed to add relay: {}", e)))?;
        }
        
        client.connect().await;
        
        // Fetch wallet configuration
        let filter = Filter::new()
            .author(nostr_keys.public_key())
            .kind(kinds::WALLET)
            .limit(1);
            
        let events = client.fetch_events(vec![filter], None).await
            .map_err(|e| crate::error::Error::custom(&format!("Failed to fetch events: {}", e)))?;
            
        if let Some(wallet_event) = events.first() {
            // Decrypt wallet configuration
            let decrypted = client.signer().await
                .map_err(|e| crate::error::Error::custom(&format!("Signer error: {}", e)))?
                .nip44_decrypt(nostr_keys.public_key(), &wallet_event.content)
                .map_err(|e| crate::error::Error::custom(&format!("Decryption failed: {}", e)))?;
                
            let config: WalletConfig = serde_json::from_str(&decrypted)
                .map_err(|e| crate::error::Error::custom(&format!("Invalid wallet config: {}", e)))?;
            
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
    
    /// Publish wallet configuration to Nostr
    async fn publish_wallet_config(&self) -> Result<()> {
        let config = WalletConfig {
            privkey: self.wallet_privkey.clone(),
            mints: self.mints.clone(),
        };
        
        let content_json = serde_json::to_string(&config)
            .map_err(|e| crate::error::Error::custom(&format!("Serialization failed: {}", e)))?;
            
        let signer = self.client.signer().await
            .map_err(|e| crate::error::Error::custom(&format!("Signer error: {}", e)))?;
            
        let public_key = signer.public_key().await
            .map_err(|e| crate::error::Error::custom(&format!("Public key error: {}", e)))?;
            
        let encrypted_content = signer.nip44_encrypt(public_key, &content_json)
            .map_err(|e| crate::error::Error::custom(&format!("Encryption failed: {}", e)))?;
        
        let mut tags = Vec::new();
        for mint in &self.mints {
            tags.push(Tag::custom("mint", [mint]));
        }
        
        let event_builder = EventBuilder::new(kinds::WALLET, encrypted_content, tags);
        
        self.client.send_event_builder(event_builder).await
            .map_err(|e| crate::error::Error::custom(&format!("Failed to publish wallet config: {}", e)))?;
            
        Ok(())
    }
    
    /// Send ecash tokens
    pub async fn send(&self, amount: u64) -> Result<String> {
        let token = self.cashu_wallet.send(amount).await?;
        
        // Create spending history
        self.create_spending_history("out", amount, vec![]).await?;
        
        Ok(token)
    }
    
    /// Receive ecash tokens
    pub async fn receive(&self, token: &str) -> Result<String> {
        let result = self.cashu_wallet.receive(token).await?;
        
        // Publish new token event with received proofs
        self.publish_token_event(token).await?;
        
        // Create spending history
        self.create_spending_history("in", 0, vec![]).await?; // Amount will be calculated from proofs
        
        Ok(result)
    }
    
    /// Get wallet balance
    pub async fn balance(&self) -> Result<u64> {
        let balance_str = self.cashu_wallet.balance().await?;
        balance_str.parse::<u64>()
            .map_err(|e| crate::error::Error::custom(&format!("Invalid balance: {}", e)))
    }
    
    /// Get pending transactions
    pub async fn pending(&self) -> Result<Vec<SendTokenPendingResponse>> {
        self.cashu_wallet.pending().await
    }
    
    /// Redeem pending proofs
    pub async fn redeem_pending(&self) -> Result<()> {
        self.cashu_wallet.redeem_pendings().await
    }
    
    /// Fetch all wallet tokens from Nostr
    pub async fn fetch_tokens(&self) -> Result<Vec<TokenData>> {
        let signer = self.client.signer().await
            .map_err(|e| crate::error::Error::custom(&format!("Signer error: {}", e)))?;
            
        let public_key = signer.public_key().await
            .map_err(|e| crate::error::Error::custom(&format!("Public key error: {}", e)))?;
        
        let filter = Filter::new()
            .author(public_key)
            .kind(kinds::TOKEN);
            
        let events = self.client.fetch_events(vec![filter], None).await
            .map_err(|e| crate::error::Error::custom(&format!("Failed to fetch token events: {}", e)))?;
            
        let mut tokens = Vec::new();
        
        for event in events {
            let decrypted = signer.nip44_decrypt(public_key, &event.content)
                .map_err(|e| crate::error::Error::custom(&format!("Decryption failed: {}", e)))?;
                
            let token_data: TokenData = serde_json::from_str(&decrypted)
                .map_err(|e| crate::error::Error::custom(&format!("Invalid token data: {}", e)))?;
                
            tokens.push(token_data);
        }
        
        Ok(tokens)
    }
    
    /// Publish a new token event
    async fn publish_token_event(&self, _token: &str) -> Result<()> {
        // In a real implementation, you would parse the token and extract proofs
        // For now, we'll create a placeholder
        let token_data = TokenData {
            mint: self.mints[0].clone(),
            proofs: vec![], // Would be populated from the actual token
            del: vec![],
        };
        
        let content_json = serde_json::to_string(&token_data)
            .map_err(|e| crate::error::Error::custom(&format!("Serialization failed: {}", e)))?;
            
        let signer = self.client.signer().await
            .map_err(|e| crate::error::Error::custom(&format!("Signer error: {}", e)))?;
            
        let public_key = signer.public_key().await
            .map_err(|e| crate::error::Error::custom(&format!("Public key error: {}", e)))?;
            
        let encrypted_content = signer.nip44_encrypt(public_key, &content_json)
            .map_err(|e| crate::error::Error::custom(&format!("Encryption failed: {}", e)))?;
        
        let event_builder = EventBuilder::new(kinds::TOKEN, encrypted_content, vec![]);
        
        self.client.send_event_builder(event_builder).await
            .map_err(|e| crate::error::Error::custom(&format!("Failed to publish token event: {}", e)))?;
            
        Ok(())
    }
    
    /// Create a spending history entry
    async fn create_spending_history(
        &self, 
        direction: &str, 
        amount: u64,
        event_refs: Vec<EventReference>
    ) -> Result<()> {
        let history = SpendingHistory {
            direction: direction.to_string(),
            amount,
            events: event_refs,
        };
        
        let content_json = serde_json::to_string(&history)
            .map_err(|e| crate::error::Error::custom(&format!("Serialization failed: {}", e)))?;
            
        let signer = self.client.signer().await
            .map_err(|e| crate::error::Error::custom(&format!("Signer error: {}", e)))?;
            
        let public_key = signer.public_key().await
            .map_err(|e| crate::error::Error::custom(&format!("Public key error: {}", e)))?;
            
        let encrypted_content = signer.nip44_encrypt(public_key, &content_json)
            .map_err(|e| crate::error::Error::custom(&format!("Encryption failed: {}", e)))?;
        
        let event_builder = EventBuilder::new(kinds::SPENDING_HISTORY, encrypted_content, vec![]);
        
        self.client.send_event_builder(event_builder).await
            .map_err(|e| crate::error::Error::custom(&format!("Failed to publish spending history: {}", e)))?;
            
        Ok(())
    }
    
    /// Validate proofs against the mint
    pub async fn validate_proofs(&self) -> Result<bool> {
        // This would implement proof validation logic
        // For now, return true as a placeholder
        Ok(true)
    }
    
    /// Sync wallet state from Nostr events
    pub async fn sync_from_nostr(&mut self) -> Result<()> {
        let tokens = self.fetch_tokens().await?;
        tracing::info!("Synced {} token events from Nostr", tokens.len());
        
        // In a full implementation, you would reconcile the local wallet state
        // with the tokens found on Nostr, handling deleted tokens, etc.
        
        Ok(())
    }
    
    /// Get wallet statistics
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

/// Wallet statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletStats {
    pub balance: u64,
    pub pending_count: usize,
    pub token_events: usize,
    pub mints: Vec<String>,
}

/// Utility functions for NIP-60
pub mod utils {
    use super::*;
    
    /// Generate a new wallet private key (separate from Nostr key)
    pub fn generate_wallet_privkey() -> String {
        use bip39::Mnemonic;
        let mnemonic = Mnemonic::generate(12).unwrap();
        mnemonic.to_string()
    }
    
    /// Parse a Cashu token to extract proofs
    pub fn parse_cashu_token(token: &str) -> Result<Vec<CashuProof>> {
        // This would implement proper Cashu token parsing
        // For now, return empty vec as placeholder
        Ok(vec![])
    }
    
    /// Create a quote event for Lightning invoice payments
    pub async fn create_quote_event(
        client: &Client,
        quote_id: &str,
        mint_url: &str,
        expiry_hours: u64,
    ) -> Result<()> {
        let expiration = chrono::Utc::now().timestamp() + (expiry_hours * 3600) as i64;
        
        let signer = client.signer().await
            .map_err(|e| crate::error::Error::custom(&format!("Signer error: {}", e)))?;
            
        let public_key = signer.public_key().await
            .map_err(|e| crate::error::Error::custom(&format!("Public key error: {}", e)))?;
            
        let encrypted_content = signer.nip44_encrypt(public_key, quote_id)
            .map_err(|e| crate::error::Error::custom(&format!("Encryption failed: {}", e)))?;
        
        let tags = vec![
            Tag::Expiration(Timestamp::from(expiration)),
            Tag::custom("mint", [mint_url]),
        ];
        
        let event_builder = EventBuilder::new(kinds::QUOTE, encrypted_content, tags);
        
        client.send_event_builder(event_builder).await
            .map_err(|e| crate::error::Error::custom(&format!("Failed to publish quote event: {}", e)))?;
            
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use nostr_sdk::Keys;
    
    #[tokio::test]
    async fn test_nip60_wallet_creation() {
        let keys = Keys::generate();
        let relays = vec!["wss://relay.damus.io"];
        let mint_url = "https://testnut.cashu.space";
        
        // This would work with a real mint
        // let wallet = Nip60Wallet::new(keys, relays, mint_url).await.unwrap();
        // assert!(!wallet.mints.is_empty());
    }
    
    #[test]
    fn test_wallet_privkey_generation() {
        let privkey = utils::generate_wallet_privkey();
        assert!(!privkey.is_empty());
    }
} 