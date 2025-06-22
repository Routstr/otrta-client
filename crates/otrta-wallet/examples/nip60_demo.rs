//! # NIP-60 Cashu Wallet Demo - Nostr Event Explorer
//!
//! This example demonstrates how to use the NIP-60 implementation to explore
//! Cashu wallet state stored directly on Nostr relays, calculating balance
//! and wallet information from Nostr events rather than the underlying wallet.
//!
//! ## Features Demonstrated
//! - Creating a new NIP-60 wallet
//! - Loading wallet configuration from Nostr events
//! - Calculating balance from token events on Nostr
//! - Exploring spending history from Nostr events
//! - Viewing raw Nostr events and their structure

use nostr_sdk::prelude::*;
use otrta_wallet::nip60::{kinds, Nip60Wallet, SpendingHistory, TokenData, WalletConfig};
use std::{
    collections::HashMap,
    io::{self, Write},
    str::FromStr,
    time::Duration,
};
use tracing::{error, info, warn};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    println!("🥜 NIP-60 Cashu Wallet Demo - Nostr Event Explorer");
    println!("==================================================");

    // Demo configuration
    // let relays = vec!["wss://relay.damus.io", "wss://nos.lol", "wss://nostr.land"];
    let relays = vec!["wss://nostr.chaima.info"];
    let mint_url = "https://mint.minibits.cash/Bitcoin"; // Example mint

    // Generate or load Nostr keys
    let keys = get_or_generate_keys().await?;
    info!("Using Nostr pubkey: {}", keys.public_key().to_bech32()?);

    // Initialize Nostr client for direct event exploration
    let client = Client::new(keys.clone());
    for relay in &relays {
        client.add_relay(*relay).await?;
    }
    client.connect().await;

    // Try to load existing wallet from Nostr
    println!("\n🔍 Checking for existing wallet on Nostr...");
    let mut wallet = match Nip60Wallet::load_from_nostr(keys.clone(), relays.clone())
        .await
        .unwrap()
    {
        Some(wallet) => {
            println!("✅ Found existing wallet!");
            wallet
        }
        None => {
            println!("📱 No existing wallet found. Creating new one...");
            Nip60Wallet::new(keys.clone(), relays, mint_url)
                .await
                .unwrap()
        }
    };

    println!("✅ Wallet initialized successfully!");

    // Interactive demo loop
    loop {
        println!("\n🎮 Choose an action:");
        println!("1. Explore wallet configuration events");
        println!("2. Calculate balance from Nostr token events");
        println!("3. View all token events");
        println!("4. Explore spending history events");
        println!("5. View raw Nostr events");
        println!("6. Generate test token (demo)");
        println!("7. Receive token");
        println!("8. Send tokens");
        println!("9. Sync and refresh from Nostr");
        println!("10. Compare Nostr vs Wallet balance");
        println!("11. Exit");

        print!("\nEnter choice (1-11): ");
        io::stdout().flush()?;

        let mut input = String::new();
        io::stdin().read_line(&mut input)?;

        match input.trim() {
            "1" => explore_wallet_config(&client, &keys).await?,
            "2" => calculate_balance_from_events(&client, &keys).await?,
            "3" => view_token_events(&client, &keys).await?,
            "4" => explore_spending_history(&client, &keys).await?,
            "5" => view_raw_events(&client, &keys).await?,
            "6" => generate_test_token().await?,
            "7" => receive_token(&wallet).await?,
            "8" => send_tokens(&wallet).await?,
            "9" => sync_wallet(&mut wallet).await?,
            "10" => compare_balances(&client, &keys, &wallet).await?,
            "11" => {
                println!("👋 Goodbye!");
                break;
            }
            _ => println!("❌ Invalid choice. Please try again."),
        }
    }

    Ok(())
}

async fn get_or_generate_keys() -> Result<Keys, Box<dyn std::error::Error>> {
    // Using a fixed key for demo consistency
    let keys =
        Keys::from_str("nsec1w0xw2sy4895ndsgc8ng2c8mjvqahlm42hxhj0cwh5dzkpwn3tpgs9pr4js").unwrap();
    println!("🔑 Using demo Nostr keys");
    println!("   Public key: {}", keys.public_key().to_bech32()?);
    Ok(keys)
}

async fn explore_wallet_config(
    client: &Client,
    keys: &Keys,
) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n🔧 Exploring Wallet Configuration Events");
    println!("=======================================");

    let filter = Filter::new()
        .author(keys.public_key())
        .kind(kinds::WALLET)
        .limit(10);

    let events = client.fetch_events(filter, Duration::from_secs(10)).await?;

    if events.is_empty() {
        println!("❌ No wallet configuration events found");
        return Ok(());
    }

    println!("📋 Found {} wallet configuration event(s):", events.len());

    for (i, event) in events.iter().enumerate() {
        println!("\n--- Event {} ---", i + 1);
        println!("📅 Created: {}", event.created_at);
        println!("🆔 ID: {}", event.id);
        println!("🏷️  Kind: {} (NIP-60 WALLET)", event.kind);

        // Try to decrypt the content
        match decrypt_event_content(client, event).await {
            Ok(decrypted) => match serde_json::from_str::<WalletConfig>(&decrypted) {
                Ok(config) => {
                    println!("✅ Decrypted wallet config:");
                    println!("   🔑 Private key: {}...", &config.privkey[..8]);
                    println!("   🏪 Mints: {:?}", config.mints);
                }
                Err(e) => warn!("Failed to parse wallet config: {}", e),
            },
            Err(e) => warn!("Failed to decrypt: {}", e),
        }

        // Show tags
        if !event.tags.is_empty() {
            println!("🏷️  Tags:");
            for tag in event.tags.iter() {
                println!("     {:?}", tag);
            }
        }
    }

    Ok(())
}

async fn calculate_balance_from_events(
    client: &Client,
    keys: &Keys,
) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n💰 Calculating Balance from Nostr Token Events");
    println!("==============================================");

    let filter = Filter::new()
        .author(keys.public_key())
        .kind(kinds::TOKEN)
        .limit(100);

    let events = client.fetch_events(filter, Duration::from_secs(10)).await?;

    if events.is_empty() {
        println!("❌ No token events found");
        println!("💡 Balance: 0 sats (calculated from Nostr events)");
        return Ok(());
    }

    println!(
        "📋 Found {} token event(s), calculating balance...",
        events.len()
    );

    let mut total_balance = 0u64;
    let mut mint_balances: HashMap<String, u64> = HashMap::new();
    let mut valid_events = 0;

    for event in events {
        match decrypt_event_content(client, &event).await {
            Ok(decrypted) => match serde_json::from_str::<TokenData>(&decrypted) {
                Ok(token_data) => {
                    let event_balance: u64 = token_data.proofs.iter().map(|p| p.amount).sum();
                    total_balance += event_balance;
                    *mint_balances.entry(token_data.mint.clone()).or_insert(0) += event_balance;
                    valid_events += 1;

                    println!(
                        "  📄 Event {}: {} sats from {} proofs (mint: {})",
                        event.id.to_string()[..8].to_string(),
                        event_balance,
                        token_data.proofs.len(),
                        token_data.mint
                    );
                }
                Err(e) => warn!("Failed to parse token data: {}", e),
            },
            Err(e) => warn!("Failed to decrypt event {}: {}", event.id, e),
        }
    }

    println!("\n📊 Balance Summary:");
    println!("💰 Total balance: {} sats", total_balance);
    println!("📄 Valid token events: {}", valid_events);
    println!("🏪 Balance by mint:");
    for (mint, balance) in mint_balances {
        println!("   {}: {} sats", mint, balance);
    }

    Ok(())
}

async fn view_token_events(client: &Client, keys: &Keys) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n🎟️  Token Events Explorer");
    println!("========================");

    let filter = Filter::new()
        .author(keys.public_key())
        .kind(kinds::TOKEN)
        .limit(20);

    let events = client.fetch_events(filter, Duration::from_secs(10)).await?;

    if events.is_empty() {
        println!("❌ No token events found");
        return Ok(());
    }

    println!("📋 Found {} token event(s):", events.len());

    for (i, event) in events.iter().enumerate() {
        println!("\n--- Token Event {} ---", i + 1);
        println!("📅 Created: {}", event.created_at);
        println!("🆔 ID: {}", event.id);
        println!("📏 Content length: {} chars", event.content.len());

        match decrypt_event_content(client, event).await {
            Ok(decrypted) => match serde_json::from_str::<TokenData>(&decrypted) {
                Ok(token_data) => {
                    let total_amount: u64 = token_data.proofs.iter().map(|p| p.amount).sum();
                    println!("✅ Token data:");
                    println!("   🏪 Mint: {}", token_data.mint);
                    println!("   💰 Total amount: {} sats", total_amount);
                    println!("   🧾 Proof count: {}", token_data.proofs.len());

                    if !token_data.proofs.is_empty() {
                        println!("   📋 Proofs:");
                        for (j, proof) in token_data.proofs.iter().take(3).enumerate() {
                            println!(
                                "     {}. Amount: {} sats, ID: {}",
                                j + 1,
                                proof.amount,
                                proof.id
                            );
                        }
                        if token_data.proofs.len() > 3 {
                            println!("     ... and {} more proofs", token_data.proofs.len() - 3);
                        }
                    }

                    if !token_data.del.is_empty() {
                        println!("   🗑️  Deleted events: {:?}", token_data.del);
                    }
                }
                Err(e) => warn!("Failed to parse token data: {}", e),
            },
            Err(e) => warn!("Failed to decrypt: {}", e),
        }
    }

    Ok(())
}

async fn explore_spending_history(
    client: &Client,
    keys: &Keys,
) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n📊 Spending History Explorer");
    println!("===========================");

    let filter = Filter::new()
        .author(keys.public_key())
        .kind(kinds::SPENDING_HISTORY)
        .limit(50);

    let events = client.fetch_events(filter, Duration::from_secs(10)).await?;

    if events.is_empty() {
        println!("❌ No spending history events found");
        return Ok(());
    }

    println!("📋 Found {} spending history event(s):", events.len());

    let mut total_in = 0u64;
    let mut total_out = 0u64;

    for (i, event) in events.iter().enumerate() {
        println!("\n--- History Event {} ---", i + 1);
        println!("📅 Created: {}", event.created_at);
        println!("🆔 ID: {}", event.id);

        match decrypt_event_content(client, event).await {
            Ok(decrypted) => match serde_json::from_str::<SpendingHistory>(&decrypted) {
                Ok(history) => {
                    println!("✅ Spending history:");
                    println!("   📍 Direction: {}", history.direction);
                    println!("   💰 Amount: {} sats", history.amount);

                    match history.direction.as_str() {
                        "in" => total_in += history.amount,
                        "out" => total_out += history.amount,
                        _ => {}
                    }

                    if !history.events.is_empty() {
                        println!("   🔗 Related events:");
                        for event_ref in &history.events {
                            println!("     📄 {}: {}", event_ref.marker, event_ref.event_id);
                        }
                    }
                }
                Err(e) => warn!("Failed to parse spending history: {}", e),
            },
            Err(e) => warn!("Failed to decrypt: {}", e),
        }
    }

    println!("\n📈 Spending Summary:");
    println!("💚 Total received: {} sats", total_in);
    println!("💸 Total sent: {} sats", total_out);
    println!(
        "🏦 Net balance: {} sats",
        total_in as i64 - total_out as i64
    );

    Ok(())
}

async fn view_raw_events(client: &Client, keys: &Keys) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n🔍 Raw Nostr Events Inspector");
    println!("=============================");

    // Fetch all NIP-60 related events
    let kinds = vec![
        kinds::WALLET,
        kinds::TOKEN,
        kinds::SPENDING_HISTORY,
        kinds::QUOTE,
    ];

    for kind in kinds {
        let filter = Filter::new().author(keys.public_key()).kind(kind).limit(5);

        let events = client.fetch_events(filter, Duration::from_secs(5)).await?;

        let kind_name = match kind {
            k if k == kinds::WALLET => "WALLET",
            k if k == kinds::TOKEN => "TOKEN",
            k if k == kinds::SPENDING_HISTORY => "SPENDING_HISTORY",
            k if k == kinds::QUOTE => "QUOTE",
            _ => "UNKNOWN",
        };

        println!("\n--- {} Events (Kind {}) ---", kind_name, kind.as_u16());

        if events.is_empty() {
            println!("❌ No events found");
            continue;
        }

        for (i, event) in events.iter().enumerate() {
            println!("\n  Event {}:", i + 1);
            println!("    🆔 ID: {}", event.id);
            println!("    📅 Created: {}", event.created_at);
            println!("    🔏 Content: {} chars (encrypted)", event.content.len());
            println!("    🏷️  Tags: {} tag(s)", event.tags.len());

            for tag in event.tags.iter() {
                println!("      📎 {:?}", tag);
            }

            println!("    📊 Signature valid: {}", event.verify().is_ok());
        }
    }

    Ok(())
}

async fn decrypt_event_content(
    client: &Client,
    event: &Event,
) -> Result<String, Box<dyn std::error::Error>> {
    let signer = client.signer().await?;
    let public_key = signer.get_public_key().await?;
    let decrypted = signer.nip44_decrypt(&public_key, &event.content).await?;
    Ok(decrypted)
}

async fn compare_balances(
    client: &Client,
    keys: &Keys,
    wallet: &Nip60Wallet,
) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n⚖️  Balance Comparison: Nostr Events vs Wallet");
    println!("=============================================");

    // Get balance from Nostr events
    let filter = Filter::new()
        .author(keys.public_key())
        .kind(kinds::TOKEN)
        .limit(100);

    let events = client.fetch_events(filter, Duration::from_secs(10)).await?;
    let mut nostr_balance = 0u64;

    for event in events {
        if let Ok(decrypted) = decrypt_event_content(client, &event).await {
            if let Ok(token_data) = serde_json::from_str::<TokenData>(&decrypted) {
                nostr_balance += token_data.proofs.iter().map(|p| p.amount).sum::<u64>();
            }
        }
    }

    // Get balance from wallet
    let wallet_balance = wallet.balance().await.unwrap_or(0);

    println!("📊 Balance Comparison:");
    println!("🌐 Nostr events balance: {} sats", nostr_balance);
    println!("💼 Wallet balance: {} sats", wallet_balance);

    if nostr_balance == wallet_balance {
        println!("✅ Balances match perfectly!");
    } else {
        let diff = (nostr_balance as i64 - wallet_balance as i64).abs();
        println!("⚠️  Balances differ by {} sats", diff);
        if nostr_balance > wallet_balance {
            println!("💡 Nostr shows more balance - wallet may need sync");
        } else {
            println!("💡 Wallet shows more balance - Nostr events may be outdated");
        }
    }

    Ok(())
}

// Keep the rest of the functions from the original demo
async fn generate_test_token() -> Result<(), Box<dyn std::error::Error>> {
    println!("\n🧪 Demo Token Generator");
    println!("======================");
    println!("In a real application, you would:");
    println!("1. Create a Lightning invoice");
    println!("2. Wait for payment");
    println!("3. Mint ecash tokens from the mint");
    println!();

    let demo_token = format!("cashuAey...demo_token_{}", uuid::Uuid::new_v4());
    println!("📋 Demo token: {}", demo_token);
    println!("ℹ️  This is just a demo token and cannot be redeemed");

    Ok(())
}

async fn receive_token(wallet: &Nip60Wallet) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n📥 Receive Token (will create Nostr events)");
    println!("==========================================");
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
    println!("📝 This will create new token events on Nostr");

    match wallet.receive(token).await {
        Ok(result) => {
            println!("✅ Successfully received token!");
            println!("📊 Result: {}", result);
            println!("🌐 New token events have been published to Nostr relays");
            println!("💡 Use option 2 to see the updated balance from Nostr events");
        }
        Err(e) => {
            error!("❌ Failed to receive token: {:?}", e);
        }
    }

    Ok(())
}

async fn send_tokens(wallet: &Nip60Wallet) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n📤 Send Tokens (will create Nostr events)");
    println!("========================================");

    let balance = wallet.balance().await.unwrap_or(0);
    println!("💰 Current wallet balance: {} sats", balance);

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
    println!("📝 This will create spending history events on Nostr");

    match wallet.send(amount).await {
        Ok(token) => {
            println!("✅ Successfully created send token!");
            println!("📋 Token: {}", token);
            println!("🌐 Spending history recorded on Nostr relays");
            println!("💡 Use option 4 to see the updated spending history");
        }
        Err(e) => {
            error!("❌ Failed to send tokens: {:?}", e);
        }
    }

    Ok(())
}

async fn sync_wallet(wallet: &mut Nip60Wallet) -> Result<(), Box<dyn std::error::Error>> {
    println!("\n🔄 Syncing with Nostr...");

    match wallet.sync_from_nostr().await {
        Ok(()) => {
            println!("✅ Wallet synced successfully!");
            println!("🌐 Latest state loaded from Nostr relays");
        }
        Err(e) => {
            error!("❌ Sync failed: {:?}", e);
        }
    }

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
