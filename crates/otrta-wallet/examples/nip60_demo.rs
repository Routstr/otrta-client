//! # NIP-60 Cashu Wallet Demo
//! 
//! This example demonstrates how to use the NIP-60 implementation to create
//! a Cashu wallet that stores its state on Nostr relays.
//! 
//! ## Features Demonstrated
//! - Creating a new NIP-60 wallet
//! - Loading an existing wallet from Nostr
//! - Sending and receiving ecash tokens
//! - Syncing wallet state with Nostr relays
//! - Viewing wallet statistics

use ecash_402_wallet::nip60::{Nip60Wallet, utils};
use nostr_sdk::prelude::*;
use std::io::{self, Write};
use tracing::{info, error};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::fmt::init();
    
    println!("🥜 NIP-60 Cashu Wallet Demo");
    println!("==========================");
    
    // Demo configuration
    let relays = vec![
        "wss://relay.damus.io",
        "wss://nos.lol", 
        "wss://relay.nostr.band"
    ];
    let mint_url = "https://stablenut.umint.cash"; // Example mint
    
    // Generate or load Nostr keys
    let keys = get_or_generate_keys().await?;
    info!("Using Nostr pubkey: {}", keys.public_key().to_bech32()?);
    
    // Try to load existing wallet from Nostr
    println!("\n🔍 Checking for existing wallet on Nostr...");
    let mut wallet = match Nip60Wallet::load_from_nostr(keys.clone(), relays.clone()).await? {
        Some(wallet) => {
            println!("✅ Found existing wallet!");
            wallet
        },
        None => {
            println!("📱 No existing wallet found. Creating new one...");
            Nip60Wallet::new(keys, relays, mint_url).await?
        }
    };
    
    println!("✅ Wallet initialized successfully!");
    
    // Display wallet stats
    display_wallet_stats(&wallet).await?;
    
    // Interactive demo loop
    loop {
        println!("\n🎮 Choose an action:");
        println!("1. View wallet balance");
        println!("2. Generate test token (demo)");
        println!("3. Receive token");
        println!("4. Send tokens");
        println!("5. View pending transactions");
        println!("6. Sync with Nostr");
        println!("7. View wallet stats");
        println!("8. Generate new wallet key");
        println!("9. Exit");
        
        print!("\nEnter choice (1-9): ");
        io::stdout().flush()?;
        
        let mut input = String::new();
        io::stdin().read_line(&mut input)?;
        
        match input.trim() {
            "1" => view_balance(&wallet).await?,
            "2" => generate_test_token().await?,
            "3" => receive_token(&wallet).await?,
            "4" => send_tokens(&wallet).await?,
            "5" => view_pending(&wallet).await?,
            "6" => sync_wallet(&mut wallet).await?,
            "7" => display_wallet_stats(&wallet).await?,
            "8" => generate_wallet_key()?,
            "9" => {
                println!("👋 Goodbye!");
                break;
            }
            _ => println!("❌ Invalid choice. Please try again."),
        }
    }
    
    Ok(())
}

async fn get_or_generate_keys() -> Result<Keys, Box<dyn std::error::Error>> {
    // In a real application, you'd want to load keys from secure storage
    // For demo purposes, we'll generate new keys each time
    let keys = Keys::generate();
    println!("🔑 Generated new Nostr keys for demo");
    println!("   Public key: {}", keys.public_key().to_bech32()?);
    Ok(keys)
}

async fn display_wallet_stats(wallet: &Nip60Wallet) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n📊 Wallet Statistics");
    println!("===================");
    
    match wallet.get_stats().await {
        Ok(stats) => {
            println!("💰 Balance: {} sats", stats.balance);
            println!("⏳ Pending transactions: {}", stats.pending_count);
            println!("🎟️  Token events on Nostr: {}", stats.token_events);
            println!("🏪 Mints: {:?}", stats.mints);
        }
        Err(e) => error!("Failed to get stats: {}", e),
    }
    
    Ok(())
}

async fn view_balance(wallet: &Nip60Wallet) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n💰 Checking balance...");
    
    match wallet.balance().await {
        Ok(balance) => {
            println!("✅ Current balance: {} sats", balance);
        }
        Err(e) => {
            error!("❌ Failed to get balance: {}", e);
        }
    }
    
    Ok(())
}

async fn generate_test_token() -> Result<(), Box<dyn std::error::Error>> {
    println!("\n🧪 Demo Token Generator");
    println!("======================");
    println!("In a real application, you would:");
    println!("1. Create a Lightning invoice");
    println!("2. Wait for payment");
    println!("3. Mint ecash tokens from the mint");
    println!();
    
    // Generate a demo token string (not a real token)
    let demo_token = format!("cashuAey...demo_token_{}", uuid::Uuid::new_v4());
    println!("📋 Demo token: {}", demo_token);
    println!("ℹ️  This is just a demo token and cannot be redeemed");
    
    Ok(())
}

async fn receive_token(wallet: &Nip60Wallet) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n📥 Receive Token");
    println!("===============");
    print!("Enter cashu token to receive: ");
    io::stdout().flush()?;
    
    let mut token = String::new();
    io::stdin().read_line(&mut token)?;
    let token = token.trim();
    
    if token.is_empty() {
        println!("❌ No token provided");
        return Ok(());
    }
    
    println!("🔄 Attempting to receive token...");
    
    match wallet.receive(token).await {
        Ok(result) => {
            println!("✅ Successfully received token!");
            println!("📊 Result: {}", result);
            println!("🏪 Token information has been stored on Nostr relays");
        }
        Err(e) => {
            error!("❌ Failed to receive token: {}", e);
            println!("💡 This might be because:");
            println!("   - The token is invalid or already spent");
            println!("   - The mint is unreachable");
            println!("   - Network connectivity issues");
        }
    }
    
    Ok(())
}

async fn send_tokens(wallet: &Nip60Wallet) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n📤 Send Tokens");
    println!("=============");
    
    // First check balance
    let balance = match wallet.balance().await {
        Ok(balance) => balance,
        Err(e) => {
            error!("❌ Failed to get balance: {}", e);
            return Ok(());
        }
    };
    
    println!("💰 Current balance: {} sats", balance);
    
    if balance == 0 {
        println!("❌ No balance available to send");
        return Ok(());
    }
    
    print!("Enter amount to send (sats): ");
    io::stdout().flush()?;
    
    let mut input = String::new();
    io::stdin().read_line(&mut input)?;
    
    let amount: u64 = match input.trim().parse() {
        Ok(amount) => amount,
        Err(_) => {
            println!("❌ Invalid amount");
            return Ok(());
        }
    };
    
    if amount > balance {
        println!("❌ Insufficient balance");
        return Ok(());
    }
    
    println!("🔄 Creating send token...");
    
    match wallet.send(amount).await {
        Ok(token) => {
            println!("✅ Successfully created send token!");
            println!("📋 Token: {}", token);
            println!("📤 Share this token with the recipient");
            println!("🏪 Transaction recorded on Nostr relays");
        }
        Err(e) => {
            error!("❌ Failed to send tokens: {}", e);
        }
    }
    
    Ok(())
}

async fn view_pending(wallet: &Nip60Wallet) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n⏳ Pending Transactions");
    println!("======================");
    
    match wallet.pending().await {
        Ok(pending) => {
            if pending.is_empty() {
                println!("✅ No pending transactions");
            } else {
                println!("📋 Found {} pending transaction(s):", pending.len());
                for (i, tx) in pending.iter().enumerate() {
                    println!("{}. Amount: {} sats, Token: {}", 
                            i + 1, tx.amount, tx.token);
                }
            }
        }
        Err(e) => {
            error!("❌ Failed to get pending transactions: {}", e);
        }
    }
    
    Ok(())
}

async fn sync_wallet(wallet: &mut Nip60Wallet) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n🔄 Syncing with Nostr...");
    
    match wallet.sync_from_nostr().await {
        Ok(()) => {
            println!("✅ Wallet synced successfully!");
            println!("🏪 Latest state loaded from Nostr relays");
        }
        Err(e) => {
            error!("❌ Sync failed: {}", e);
        }
    }
    
    Ok(())
}

fn generate_wallet_key() -> Result<(), Box<dyn std::error::Error>> {
    println!("\n🔑 Generate New Wallet Key");
    println!("=========================");
    
    let new_key = utils::generate_wallet_privkey();
    println!("🆕 New wallet private key: {}", new_key);
    println!("⚠️  Store this securely! This is separate from your Nostr key");
    println!("💡 You can use this key to restore your ecash wallet");
    
    Ok(())
}

#[cfg(test)]
mod demo_tests {
    use super::*;
    
    #[test]
    fn test_key_generation() {
        let key = utils::generate_wallet_privkey();
        assert!(!key.is_empty());
        println!("Generated test key: {}", key);
    }
    
    #[tokio::test]
    async fn test_wallet_stats_structure() {
        // Test that our structures serialize properly
        use ecash_402_wallet::nip60::WalletStats;
        
        let stats = WalletStats {
            balance: 1000,
            pending_count: 2,
            token_events: 5,
            mints: vec!["https://mint1.example.com".to_string()],
        };
        
        let json = serde_json::to_string(&stats).unwrap();
        let parsed: WalletStats = serde_json::from_str(&json).unwrap();
        
        assert_eq!(parsed.balance, 1000);
        assert_eq!(parsed.pending_count, 2);
    }
} 