use anyhow::Result;
use chrono::{DateTime, Utc};
use nostr_sdk::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;
use tracing::{debug, info, warn};

const PROVIDER_ANNOUNCEMENT_KIND: u16 = 38421;

const DEFAULT_RELAYS: &[&str] = &[
    "wss://relay.damus.io",
    "wss://relay.snort.social",
    "wss://nos.lol",
    "wss://relay.nostr.band",
    "wss://nostr.wine",
    "wss://relay.primal.net",
    "wss://relay.routstr.com",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderContent {
    pub name: String,
    pub about: String,
    pub urls: Option<Vec<String>>,
    pub mints: Option<Vec<String>>,
    pub version: Option<String>,
    pub use_onion: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NostrProvider {
    pub id: String,
    pub pubkey: String,
    pub name: String,
    pub about: String,
    pub urls: Vec<String>,
    pub mints: Vec<String>,
    pub version: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub followers: i32,
    pub zaps: i32,
    pub use_onion: bool,
}

#[derive(Debug)]
pub struct NostrProviderDiscovery {
    relays: Vec<String>,
    client: Client,
}

fn parse_tags_to_map(tags: &Tags) -> HashMap<String, Vec<String>> {
    let mut map: HashMap<String, Vec<String>> = HashMap::new();

    for tag in tags.iter() {
        let tag_str = format!("{:?}", tag);
        if let Some(start) = tag_str.find('[') {
            if let Some(end) = tag_str.find(']') {
                let inner = &tag_str[start + 1..end];
                let parts: Vec<&str> = inner
                    .split(',')
                    .map(|s| s.trim().trim_matches('"'))
                    .collect();

                if parts.len() >= 2 {
                    let key = parts[0].to_string();
                    let value = parts[1].to_string();
                    map.entry(key).or_default().push(value);
                }
            }
        }
    }

    map
}

impl NostrProviderDiscovery {
    pub async fn new() -> Result<Self> {
        let relays = DEFAULT_RELAYS.iter().map(|&s| s.to_string()).collect();
        let client = Client::default();

        for relay in &relays {
            if let Err(e) = client.add_relay(relay).await {
                warn!("Failed to add relay {}: {}", relay, e);
            }
        }

        Ok(Self { relays, client })
    }

    pub async fn with_relays(relay_urls: Vec<String>) -> Result<Self> {
        let client = Client::default();

        for relay in &relay_urls {
            if let Err(e) = client.add_relay(relay).await {
                warn!("Failed to add relay {}: {}", relay, e);
            }
        }

        Ok(Self {
            relays: relay_urls,
            client,
        })
    }

    pub async fn discover_providers(&self) -> Result<Vec<NostrProvider>> {
        info!("Starting provider discovery from Nostr relays...");

        self.client.connect().await;

        tokio::time::sleep(Duration::from_secs(2)).await;

        let filter = Filter::new()
            .kind(Kind::Custom(PROVIDER_ANNOUNCEMENT_KIND))
            .limit(100);

        info!(
            "Fetching provider events from {} relays...",
            self.relays.len()
        );

        let events = self
            .client
            .fetch_events(filter, Duration::from_secs(10))
            .await
            .unwrap();

        println!("Retrieved {} provider events", events.len());

        let mut providers = Vec::new();

        for event in events {
            match self.parse_provider_from_event(&event) {
                Ok(provider) => {
                    debug!("Successfully parsed provider: {}", provider.name);
                    providers.push(provider);
                }
                Err(e) => {
                    println!("Failed to parse provider event {}: {}", event.id, e);
                    continue;
                }
            }
        }

        if providers.is_empty() {}

        info!("Discovered {} providers", providers.len());
        Ok(providers)
    }

    fn parse_provider_from_event(&self, event: &Event) -> Result<NostrProvider> {
        println!("Parsing event content: {}", event.content);
        println!("Event tags: {:?}", event.tags);

        let content: ProviderContent = match serde_json::from_str(&event.content) {
            Ok(content) => content,
            Err(e) => {
                return Err(anyhow::anyhow!("Failed to parse JSON content: {}", e));
            }
        };

        let mut urls = content.urls.unwrap_or_default();
        let mut mints = content.mints.unwrap_or_default();
        let mut version = content.version;
        let mut use_onion = content.use_onion.unwrap_or(false);

        let tag_map = parse_tags_to_map(&event.tags);
        println!("Parsed tag map: {:?}", tag_map);

        if let Some(tag_urls) = tag_map.get("u") {
            for url in tag_urls {
                urls.push(url.clone());
                if url.contains(".onion") {
                    use_onion = true;
                }
            }
        }

        if let Some(tag_mints) = tag_map.get("mint") {
            for mint in tag_mints {
                mints.push(mint.clone());
            }
        }

        if let Some(tag_version) = tag_map.get("version") {
            if let Some(v) = tag_version.first() {
                version = Some(v.clone());
            }
        }

        if urls.is_empty() {
            return Err(anyhow::anyhow!("Provider must have at least one URL"));
        }

        if !use_onion {
            use_onion =
                urls.iter().any(|url| url.contains(".onion")) || content.use_onion.unwrap_or(false);
        }

        Ok(NostrProvider {
            id: event.id.to_hex(),
            pubkey: event.pubkey.to_hex(),
            name: content.name,
            about: content.about,
            urls,
            mints,
            version,
            created_at: DateTime::from_timestamp(event.created_at.as_u64() as i64, 0)
                .unwrap_or_else(|| Utc::now()),
            updated_at: Utc::now(),
            followers: 0,
            zaps: 0,
            use_onion,
        })
    }

    pub async fn get_updated_providers(&self, _since: DateTime<Utc>) -> Result<Vec<NostrProvider>> {
        self.discover_providers().await
    }
}

pub async fn discover_providers() -> Result<Vec<NostrProvider>> {
    let discovery = NostrProviderDiscovery::new().await?;
    discovery.discover_providers().await
}

pub async fn get_updated_providers_since(since: DateTime<Utc>) -> Result<Vec<NostrProvider>> {
    let discovery = NostrProviderDiscovery::new().await?;
    discovery.get_updated_providers(since).await
}

pub use NostrProvider as Provider;
pub use NostrProviderDiscovery as Discovery;
