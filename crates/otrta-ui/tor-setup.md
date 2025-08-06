# Tor Proxy Setup Guide

## Overview
This setup configures Tor as a SOCKS proxy to connect to onion services (.onion URLs).

## Docker Compose Configuration

The updated `docker-compose.yaml` includes:
- **fphammerle/tor-proxy**: Tor SOCKS proxy container
- **Port 9050**: SOCKS proxy port exposed
- **Health checks**: Ensures Tor is running properly

## Starting the Services

```bash
# Start Tor proxy and PostgreSQL
docker-compose up -d

# Check if Tor is running
docker-compose ps

# View Tor logs
docker-compose logs tor
```

## Environment Variables

For your Rust application, set these environment variables:

```bash
# In your .env file or environment
TOR_SOCKS_PROXY=socks5://127.0.0.1:9050

# If running in Docker containers (use container name)
TOR_SOCKS_PROXY=socks5://tor:9050
```

## Testing the Tor Connection

### 1. Test SOCKS Proxy
```bash
# Test with curl (outside Docker)
curl --proxy socks5h://localhost:9050 https://check.torproject.org/api/ip

# Should return: {"IsTor":true,"IP":"..."}
```

### 2. Test Onion Connection
```bash
# Test connecting to an onion service
curl --proxy socks5h://localhost:9050 http://facebookwkhpilnemxj7asaniu7vnjjbiltxjqhye3mhbshg7kx5tfyd.onion
```

### 3. Test from Application Container
```bash
# Enter the application container
docker-compose exec otrta-backend bash

# Test Tor connection from inside container
curl --proxy socks5h://tor:9050 https://check.torproject.org/api/ip
```

## Application Integration

Your Rust application will automatically use the Tor proxy when:
1. `use_onion: true` is set for a provider
2. The provider URL contains `.onion`
3. `TOR_SOCKS_PROXY` environment variable is set

## Troubleshooting

### 1. Tor Not Starting
```bash
# Check Tor logs
docker-compose logs tor

# Restart Tor service
docker-compose restart tor
```

### 2. Connection Issues
```bash
# Verify Tor port is accessible
nc -z localhost 9050

# Check if Tor process is running in container
docker-compose exec tor ps aux | grep tor
```

### 3. DNS Resolution
If you have DNS issues with onion addresses, ensure you're using `socks5h://` (not `socks5://`) which handles DNS resolution through the proxy.

## Security Notes

- **VPN Recommended**: Use a VPN connection before connecting to Tor
- **No Logs**: The Tor container doesn't store connection logs
- **Isolation**: Each onion request goes through separate Tor circuits
- **Performance**: Onion connections are slower than regular HTTP requests

## Advanced Configuration

### Custom Exit Nodes
```yaml
environment:
  - EXIT_NODES=1.2.3.4,1.2.3.5,{at}  # Use {at} for Austria
```

### Exclude Exit Nodes  
```yaml
environment:
  - EXCLUDE_EXIT_NODES=1.2.3.4,1.2.3.5
```

### Custom Timeout
```yaml
environment:
  - SOCKS_TIMEOUT_SECONDS=120  # Default is 60
``` 