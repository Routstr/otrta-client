# 🥜 Ecash 402 Wallet with NIP-60 Support

A Rust implementation of a Cashu ecash wallet with [NIP-60](https://nips.nostr.com/60) support for storing wallet state on Nostr relays.

## 📋 Features

- **Core Ecash Wallet**: Send, receive, and manage Cashu ecash tokens
- **NIP-60 Integration**: Store wallet state on Nostr relays for cross-application accessibility  
- **Panic-Safe**: Robust error handling eliminates crashes from `BlindedMessageAlreadySigned` errors
- **Cross-Platform**: Works on desktop, server, and WASM environments
- **Type-Safe**: Comprehensive Rust type safety with proper error propagation

## 🎯 What is NIP-60?

[NIP-60](https://nips.nostr.com/60) is a Nostr Improvement Proposal that defines how to store Cashu wallet information on Nostr relays. This enables:

- **Ease of use**: New users can immediately receive funds without creating accounts
- **Interoperability**: Wallets follow users across applications  
- **Decentralization**: No single point of failure for wallet storage

### Event Types

| Kind | Purpose | Description |
|------|---------|-------------|
| 17375 | Wallet Config | Encrypted wallet configuration (mints, private keys) |
| 7375 | Token Events | Encrypted unspent proof storage |
| 7376 | Spending History | Optional transaction history |
| 7374 | Quote Events | Temporary Lightning quote storage |

## 🚀 Quick Start

### Basic Usage

```rust
use ecash_402_wallet::nip60::Nip60Wallet;
use nostr_sdk::prelude::*;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Generate Nostr keys
    let keys = Keys::generate();
    
    // Configure relays and mint
    let relays = vec!["wss://relay.damus.io", "wss://nos.lol"];
    let mint_url = "https://stablenut.umint.cash";
    
    // Create or load wallet
    let wallet = match Nip60Wallet::load_from_nostr(keys.clone(), relays.clone()).await? {
        Some(wallet) => wallet,
        None => Nip60Wallet::new(keys, relays, mint_url).await?
    };
    
    // Check balance
    let balance = wallet.balance().await?;
    println!("Balance: {} sats", balance);
    
    // Send tokens
    let token = wallet.send(1000).await?;
    println!("Send token: {}", token);
    
    // Receive tokens  
    let result = wallet.receive("cashuAey...").await?;
    println!("Received: {}", result);
    
    Ok(())
}
```

### Advanced Features

```rust
use ecash_402_wallet::nip60::{Nip60Wallet, utils};

// Generate separate wallet key (different from Nostr key)
let wallet_privkey = utils::generate_wallet_privkey();

// Create wallet with existing configuration
let wallet = Nip60Wallet::from_config(
    keys, 
    relays, 
    mint_url, 
    &wallet_privkey
).await?;

// Sync wallet state from Nostr
wallet.sync_from_nostr().await?;

// Get comprehensive stats
let stats = wallet.get_stats().await?;
println!("Token events on Nostr: {}", stats.token_events);

// Validate proofs against mint
let valid = wallet.validate_proofs().await?;
```

## 🔧 Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
ecash-402-wallet = "0.1.6"
nostr-sdk = { version = "0.42", features = ["nip44"] }
tokio = { version = "1.0", features = ["full"] }
```

## 📖 Examples

Run the interactive demo:

```bash
cargo run --example nip60_demo
```

This demonstrates:
- Creating and loading NIP-60 wallets
- Sending and receiving tokens
- Syncing with Nostr relays
- Managing wallet state

## 🔒 Security Considerations

### Key Management

The NIP-60 wallet uses **two separate private keys**:

1. **Nostr Key**: Used for signing Nostr events and encrypting wallet data
2. **Wallet Key**: Used for P2PK ecash operations (separate from Nostr key)

```rust
// Generate secure wallet key
let wallet_key = utils::generate_wallet_privkey();

// Store securely - this is different from your Nostr key!
// Loss of this key means loss of ecash funds
```

### Privacy

- All wallet data is NIP-44 encrypted before storage on relays
- Only you can decrypt your wallet information
- Transaction history is optional and encrypted

### Best Practices

- Always validate proofs before trusting token amounts
- Use multiple relays for redundancy  
- Keep backup of both Nostr keys and wallet keys
- Monitor for spent proofs to detect double-spending

## 🐛 Bug Fixes in v0.1.6

### Fixed Critical Panic

**Issue**: The wallet was panicking on `BlindedMessageAlreadySigned` errors instead of handling them gracefully.

**Before**:
```rust
// This would panic and crash the application
.await.unwrap() // 💥 PANIC on BlindedMessageAlreadySigned
```

**After**: 
```rust
// Now handles errors gracefully
.await? // ✅ Returns proper error
```

**Impact**: Eliminates runtime crashes when attempting to redeem already-spent tokens.

### Enhanced Error Handling

- Added `DatabaseError` variant for cdk-redb errors
- Improved error messages with context
- Proper error propagation throughout the API

### API Improvements

Several methods now return `Result<T>` for better error handling:
- `prepare_seed()` 
- `from_seed()`
- `new()`
- Internal wallet constructor

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nip60Wallet   │    │ CashuWalletClient│    │  Nostr Client   │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • send()        │───▶│ • send()        │    │ • publish_event()│
│ • receive()     │    │ • receive()     │    │ • fetch_events()│
│ • balance()     │    │ • balance()     │    │ • encrypt/decrypt│
│ • sync()        │    │ • pending()     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │      Nostr Relays       │
                    │  (Encrypted Wallet Data)│
                    └─────────────────────────┘
```

## 🧪 Testing

```bash
# Run all tests
cargo test

# Run with logging
RUST_LOG=debug cargo test

# Run specific test
cargo test test_nip60_wallet_creation
```

## 📚 References

- **NIP-60 Specification**: https://nips.nostr.com/60
- **Cashu Protocol**: https://cashu.space/
- **Nostr SDK**: https://github.com/rust-nostr/nostr
- **CDK (Cashu Development Kit)**: https://github.com/cashubtc/cdk

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality  
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

- [ ] Complete Cashu token parsing implementation
- [ ] Add proof validation against multiple mints
- [ ] Implement NIP-61 (Nutzaps) support  
- [ ] Add wallet backup/restore functionality
- [ ] Multi-mint support with automatic rebalancing
- [ ] WebAssembly compatibility for browser use

## 💡 Tips

### Debugging

Enable debug logging to see detailed operation flow:

```bash
RUST_LOG=debug cargo run --example nip60_demo
```

### Production Use

For production applications:

```rust
// Use secure key storage
let keys = Keys::from_hex("your-secure-nostr-key")?;

// Use multiple reliable relays
let relays = vec![
    "wss://relay.damus.io",
    "wss://nos.lol", 
    "wss://relay.nostr.band",
    // Add more for redundancy
];

// Monitor wallet health
tokio::spawn(async move {
    loop {
        tokio::time::sleep(Duration::from_secs(60)).await;
        if let Ok(stats) = wallet.get_stats().await {
            log::info!("Wallet health: {:?}", stats);
        }
    }
});
``` 