pub mod nip91_discovery;

// Re-export main types for easier access
pub use nip91_discovery::{
    Discovery, NostrProvider, Provider, ProviderContent, discover_providers,
    get_updated_providers_since,
};
