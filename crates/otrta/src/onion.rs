use reqwest::Client;
use std::time::Instant;

pub fn is_onion_url(url: &str) -> bool {
    url.contains(".onion")
}

pub fn needs_tor_proxy(url: &str, use_onion: bool) -> bool {
    use_onion && is_onion_url(url)
}

pub fn construct_url_with_protocol(base_url: &str, path: &str) -> String {
    let formatted_base = if base_url.starts_with("http://") || base_url.starts_with("https://") {
        base_url.to_string()
    } else if base_url.contains(".onion") {
        format!("http://{}", base_url)
    } else {
        format!("https://{}", base_url)
    };

    format!("{}/{}", formatted_base, path)
}

pub fn configure_tor_proxy_url(endpoint_url: &str) -> String {
    let tor_proxy_url =
        std::env::var("TOR_SOCKS_PROXY").unwrap_or_else(|_| "socks5h://127.0.0.1:9050".to_string());

    // Ensure we're using socks5h:// for onion addresses (hostname resolution through proxy)
    if endpoint_url.contains(".onion") && tor_proxy_url.starts_with("socks5://") {
        tor_proxy_url.replace("socks5://", "socks5h://")
    } else if endpoint_url.contains(".onion") && !tor_proxy_url.contains("socks5h://") {
        format!(
            "socks5h://{}",
            tor_proxy_url.trim_start_matches("socks5://")
        )
    } else {
        tor_proxy_url
    }
}

pub fn configure_client_with_tor_proxy(
    mut client_builder: reqwest::ClientBuilder,
    endpoint_url: &str,
    use_onion: bool,
) -> Result<reqwest::ClientBuilder, String> {
    if needs_tor_proxy(endpoint_url, use_onion) {
        let proxy_url = configure_tor_proxy_url(endpoint_url);

        println!("Using Tor proxy URL: {}", proxy_url);

        match reqwest::Proxy::all(&proxy_url) {
            Ok(proxy) => {
                client_builder = client_builder.proxy(proxy);
                println!(
                    "Using Tor proxy for .onion request: {} (proxy: {})",
                    endpoint_url, proxy_url
                );
                Ok(client_builder)
            }
            Err(e) => Err(format!(
                "Failed to configure Tor proxy for .onion request: {}",
                e
            )),
        }
    } else {
        Ok(client_builder)
    }
}

/// Create HTTP client configured for onion services
pub fn create_onion_client(
    endpoint_url: &str,
    use_onion: bool,
    timeout_secs: Option<u64>,
) -> Result<Client, String> {
    let mut client_builder = Client::builder();

    if let Some(timeout) = timeout_secs {
        client_builder = client_builder.timeout(std::time::Duration::from_secs(timeout));
    }

    client_builder = configure_client_with_tor_proxy(client_builder, endpoint_url, use_onion)?;

    client_builder
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))
}

pub fn start_onion_timing(endpoint_url: &str) -> Option<Instant> {
    if is_onion_url(endpoint_url) {
        Some(Instant::now())
    } else {
        None
    }
}

pub fn log_onion_timing(start_time: Option<Instant>, endpoint_url: &str, context: &str) {
    if let Some(start) = start_time {
        let duration = start.elapsed();
        println!(
            "Onion {} request completed in {:?}: {}",
            context, duration, endpoint_url
        );
    }
}

pub fn get_onion_error_message(
    error: &reqwest::Error,
    endpoint_url: &str,
    context: &str,
) -> String {
    if is_onion_url(endpoint_url) {
        if error.is_timeout() {
            format!(
                "Timeout connecting to .onion service for {} (try increasing timeout or check Tor)",
                context
            )
        } else if error.is_connect() {
            format!(
                "Failed to connect via Tor proxy for {} (check Tor daemon and proxy URL)",
                context
            )
        } else {
            format!("Error accessing .onion service for {}", context)
        }
    } else {
        format!("Failed to connect to proxy for {}", context)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_onion_url_detection() {
        assert!(is_onion_url("http://example.onion"));
        assert!(is_onion_url("https://3g2upl4pq6kufc4m.onion"));
        assert!(is_onion_url(
            "facebookwkhpilnemxj7asaniu7vnjjbiltxjqhye3mhbshg7kx5tfyd.onion"
        ));
        assert!(!is_onion_url("https://example.com"));
        assert!(!is_onion_url("http://google.com"));
    }

    #[test]
    fn test_tor_proxy_requirement() {
        assert!(needs_tor_proxy("http://example.onion", true));
        assert!(!needs_tor_proxy("http://example.onion", false));
        assert!(!needs_tor_proxy("http://example.com", true));
        assert!(!needs_tor_proxy("http://example.com", false));
    }

    #[test]
    fn test_url_construction() {
        assert_eq!(
            construct_url_with_protocol("example.onion", "v1/models"),
            "http://example.onion/v1/models"
        );

        assert_eq!(
            construct_url_with_protocol("example.com", "v1/models"),
            "https://example.com/v1/models"
        );

        assert_eq!(
            construct_url_with_protocol("https://example.com", "v1/models"),
            "https://example.com/v1/models"
        );

        assert_eq!(
            construct_url_with_protocol("http://example.onion", "v1/models"),
            "http://example.onion/v1/models"
        );
    }

    #[test]
    fn test_tor_proxy_url_configuration() {
        std::env::set_var("TOR_SOCKS_PROXY", "socks5://127.0.0.1:9050");
        let result = configure_tor_proxy_url("http://example.onion/test");
        assert_eq!(result, "socks5h://127.0.0.1:9050");

        let result = configure_tor_proxy_url("https://example.com/test");
        assert_eq!(result, "socks5://127.0.0.1:9050");

        std::env::set_var("TOR_SOCKS_PROXY", "socks5h://127.0.0.1:9050");
        let result = configure_tor_proxy_url("http://example.onion/test");
        assert_eq!(result, "socks5h://127.0.0.1:9050");

        std::env::remove_var("TOR_SOCKS_PROXY");
    }
}
