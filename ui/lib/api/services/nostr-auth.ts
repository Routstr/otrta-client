export interface NostrAuthOptions {
  theme?: 'default' | 'ocean' | 'lemonade' | 'purple';
  darkMode?: boolean;
  onAuth?: (user: NostrUser) => void;
  onLogout?: () => void;
}

export interface NostrUser {
  npub: string;
  pubkey: string;
  method: 'extension' | 'amber' | 'manual';
}

export interface NostrEvent {
  id?: string;
  pubkey?: string;
  created_at?: number;
  kind: number;
  tags: string[][];
  content: string;
  sig?: string;
}

export class NostrAuth {
  private static instance: NostrAuth;
  private isInitialized = false;
  private currentUser: NostrUser | null = null;
  private authCallbacks: ((user: NostrUser | null) => void)[] = [];
  private options: NostrAuthOptions = {};
  private isValidating = false;

  private constructor() {}

  static getInstance(): NostrAuth {
    if (!NostrAuth.instance) {
      NostrAuth.instance = new NostrAuth();
    }
    return NostrAuth.instance;
  }

  async initialize(options: NostrAuthOptions = {}): Promise<void> {
    if (this.isInitialized) return;

    // Only initialize on client side
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('NostrAuth can only be initialized on the client side');
    }

    this.options = {
      theme: 'default',
      darkMode: false,
      ...options,
    };

    this.isInitialized = true;

    // Check if already authenticated
    await this.checkExistingAuth();
  }

  private async checkExistingAuth(): Promise<void> {
    try {
      // Only restore from localStorage - don't validate on startup
      // Let server 401 responses handle invalid auth states
      const savedUser = localStorage.getItem('nostr-user');
      if (savedUser) {
        const user = JSON.parse(savedUser) as NostrUser;
        this.setCurrentUser(user);
      }
    } catch (error) {
      console.log('No existing auth found:', error);
    }
  }

  private async validateExtensionAuth(user: NostrUser): Promise<boolean> {
    try {
      // Light validation - only check if extension exists and pubkey matches
      if (!window.nostr || !window.nostr.getPublicKey) {
        return false;
      }

      // Check if we can still get the same public key
      const currentPubkey = await window.nostr.getPublicKey();
      if (currentPubkey !== user.pubkey) {
        return false;
      }

      // Don't test signEvent here to avoid permission dialogs
      // The presence of getPublicKey working with correct pubkey is sufficient
      return true;
    } catch (error) {
      console.log('Extension validation failed:', error);
      return false;
    }
  }

  async checkExtensionPermissions(): Promise<{
    hasGetPublicKey: boolean;
    hasSignEvent: boolean;
    error?: string;
  }> {
    if (!window.nostr) {
      return {
        hasGetPublicKey: false,
        hasSignEvent: false,
        error: 'No Nostr extension found'
      };
    }

    const result = {
      hasGetPublicKey: false,
      hasSignEvent: false
    };

    // Test getPublicKey permission
    try {
      await window.nostr.getPublicKey();
      result.hasGetPublicKey = true;
    } catch {
      // Permission not granted or method not available
    }

    // Test signEvent permission for kind 27235
    if (window.nostr.signEvent && result.hasGetPublicKey) {
      try {
        const pubkey = await window.nostr.getPublicKey();
        const testEvent: NostrEvent = {
          kind: 27235,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: 'Permission check for OTRTA',
          pubkey: pubkey
        };
        await window.nostr.signEvent(testEvent);
        result.hasSignEvent = true;
      } catch {
        // Permission not granted
      }
    }

    return result;
  }

  async validateCurrentAuth(): Promise<boolean> {
    // Prevent concurrent validations
    if (this.isValidating) {
      return true;
    }

    const user = this.getCurrentUser();
    if (!user) {
      return false;
    }

    // Only validate extension auth, other methods are persistent
    if (user.method === 'extension') {
      this.isValidating = true;
      try {
        const isValid = await this.validateExtensionAuth(user);
        if (!isValid) {
          console.log('Extension permissions no longer valid, logging out');
          await this.logout();
          return false;
        }
      } finally {
        this.isValidating = false;
      }
    }

    return true;
  }

  async loginWithExtension(): Promise<NostrUser> {
    if (!window.nostr) {
      throw new Error('No Nostr extension found. Please install a Nostr extension like Alby or nos2x.');
    }

    if (!window.nostr.getPublicKey) {
      throw new Error('Extension does not support getPublicKey method.');
    }

    if (!window.nostr.signEvent) {
      throw new Error('Extension does not support signEvent method.');
    }

    try {
      // Step 1: Request getPublicKey permission
      const pubkey = await window.nostr.getPublicKey();
      const npub = this.pubkeyToNpub(pubkey);

      // Step 2: Request signEvent permission for kind 27235
      // Create a test event of kind 27235 to ensure permission is granted
      const testEvent: NostrEvent = {
        kind: 27235,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: 'Permission test for OTRTA authentication',
        pubkey: pubkey
      };

      // Request signing permission - this will trigger the extension's permission dialog
      try {
        await window.nostr.signEvent(testEvent);
        console.log('Successfully granted signEvent permission for kind 27235');
      } catch (signError) {
        console.error('Failed to get signEvent permission:', signError);
        throw new Error('Please grant signEvent permission for kind 27235 in your extension to continue.');
      }

      const user: NostrUser = {
        npub,
        pubkey,
        method: 'extension',
      };

      // Save to localStorage for persistence (no private key needed for extensions)
      localStorage.setItem('nostr-user', JSON.stringify(user));

      this.setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('Failed to login with extension:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to authenticate with browser extension. Please try again.');
    }
  }

  async loginWithAmber(): Promise<NostrUser> {
    try {
      // For Amber, we need to use NIP-55 protocol
      // This involves creating an intent to launch Amber
      const pubkey = await this.requestAmberAuth();
      const npub = this.pubkeyToNpub(pubkey);

      const user: NostrUser = {
        npub,
        pubkey,
        method: 'amber',
      };

      // Save to localStorage for persistence (no private key needed for Amber)
      localStorage.setItem('nostr-user', JSON.stringify(user));

      this.setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('Failed to login with Amber:', error);
      throw new Error('Failed to authenticate with Amber. Please ensure Amber is installed and try again.');
    }
  }

  private async requestAmberAuth(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Generate client keypair for NIP-46 connection
        const clientPrivkey = this.generateRandomHex(32);
        const clientPubkey = this.privkeyToPubkey(clientPrivkey);
        
        // Generate a random secret for the connection
        const secret = this.generateRandomHex(16);
        
        // Default relay for NIP-46 communication (you may want to make this configurable)
        const relay = 'wss://relay.nsec.app';
        
        // Create NIP-46 nostrconnect URL for "Direct connection initiated by the client"
        const permissions = 'sign_event,get_public_key';
        const appName = 'OTRTA';
        const appUrl = window.location.origin;
        
        const nostrConnectUrl = `nostrconnect://${clientPubkey}` +
          `?relay=${encodeURIComponent(relay)}` +
          `&secret=${secret}` +
          `&perms=${encodeURIComponent(permissions)}` +
          `&name=${encodeURIComponent(appName)}` +
          `&url=${encodeURIComponent(appUrl)}`;

        console.log('Generated NIP-46 connection URL:', nostrConnectUrl);
        
        // On Android, try to open Amber with the nostrconnect URL
        if (this.isAndroid()) {
          // Try Amber app first
          window.location.href = `nostrsigner:${nostrConnectUrl}`;
          
          // Fallback to browser
          setTimeout(() => {
            window.open(nostrConnectUrl, '_blank');
          }, 1000);
        } else {
          // On other platforms, open in new tab/window
          window.open(nostrConnectUrl, '_blank');
        }
        
        // Set up listeners for when user returns from Amber
        const handleFocus = () => {
          window.removeEventListener('focus', handleFocus);
          // For demonstration purposes, we'll generate a mock user
          // In a real implementation, you'd listen for NIP-46 response events
          setTimeout(() => {
            // Generate a realistic-looking mock pubkey for demo
            const mockPubkey = '02' + Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('');
            resolve(mockPubkey);
          }, 1000);
        };

        const handleVisibilityChange = () => {
          if (!document.hidden) {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            handleFocus();
          }
        };

        // Listen for both focus and visibility change events
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Timeout after 30 seconds
        setTimeout(() => {
          window.removeEventListener('focus', handleFocus);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          reject(new Error('NIP-46 connection timeout - please ensure Amber supports NIP-46 and try again'));
        }, 30000);
        
             } catch {
         reject(new Error('Failed to generate NIP-46 connection URL - please try a different authentication method'));
       }
    });
  }

  async loginWithNsec(nsec: string): Promise<NostrUser> {
    try {
      // Validate nsec format
      if (!this.validateNsecKey(nsec)) {
        throw new Error('Invalid nsec format');
      }

      // Generate pubkey from nsec (in real implementation, use proper crypto)
      const pubkey = this.nsecToPubkey(nsec);
      const npub = this.pubkeyToNpub(pubkey);

      const user: NostrUser = {
        npub,
        pubkey,
        method: 'manual',
      };

      // Save to localStorage for persistence
      localStorage.setItem('nostr-user', JSON.stringify(user));
      localStorage.setItem('nostr-nsec', nsec);

      this.setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('Failed to login with nsec:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // Clear localStorage
      localStorage.removeItem('nostr-user');
      localStorage.removeItem('nostr-nsec');

      this.setCurrentUser(null);
    } catch (error) {
      console.error('Failed to logout:', error);
      throw error;
    }
  }

  // Force clear auth without validation - used for server 401 responses
  clearAuth(): void {
    try {
      localStorage.removeItem('nostr-user');
      localStorage.removeItem('nostr-nsec');
      this.setCurrentUser(null);
      console.log('Authentication cleared due to server rejection');
    } catch (error) {
      console.error('Failed to clear auth:', error);
    }
  }

  async signEvent(event: NostrEvent): Promise<NostrEvent> {
    if (!this.currentUser) {
      throw new Error('Not authenticated. Please login first.');
    }

    switch (this.currentUser.method) {
      case 'extension':
        return this.signWithExtension(event);
      case 'amber':
        return this.signWithAmber(event);
      case 'manual':
        return this.signWithManualKey(event);
      default:
        throw new Error('Unknown authentication method');
    }
  }

  private async signWithExtension(event: NostrEvent): Promise<NostrEvent> {
    if (!window.nostr || !window.nostr.signEvent) {
      throw new Error('Extension does not support event signing');
    }

    try {
      const signedEvent = await window.nostr.signEvent(event);
      return signedEvent as NostrEvent;
    } catch (error) {
      console.error('Failed to sign with extension:', error);
      throw new Error('Failed to sign event with extension');
    }
  }

  private async signWithAmber(event: NostrEvent): Promise<NostrEvent> {
    try {
      // Create intent URL for Amber signing
      const eventJson = JSON.stringify(event);
      const encodedEvent = encodeURIComponent(eventJson);
      const intentUrl = `intent://nostr/signEvent?event=${encodedEvent}#Intent;scheme=nostrsigner;package=com.greenart7c3.nostrsigner;end`;

      return new Promise((resolve, reject) => {
        if (this.isMobile()) {
          window.location.href = intentUrl;
          
          const handleFocus = () => {
            window.removeEventListener('focus', handleFocus);
            // In reality, Amber would return the signed event
            setTimeout(() => {
              // Mock signed event - in real implementation, get from Amber
              const signedEvent = { ...event, sig: 'mock_signature_from_amber' };
              resolve(signedEvent);
            }, 1000);
          };

          window.addEventListener('focus', handleFocus);

          setTimeout(() => {
            window.removeEventListener('focus', handleFocus);
            reject(new Error('Amber signing timeout'));
          }, 30000);
        } else {
          reject(new Error('Amber is only available on mobile devices'));
        }
      });
    } catch (error) {
      console.error('Failed to sign with Amber:', error);
      throw new Error('Failed to sign event with Amber');
    }
  }

  private async signWithManualKey(event: NostrEvent): Promise<NostrEvent> {
    try {
      const nsec = localStorage.getItem('nostr-nsec');
      if (!nsec) {
        throw new Error('No saved private key found');
      }

      // In real implementation, use proper secp256k1 signing
      // This is a placeholder
      const signature = this.signEventWithNsec(event, nsec);
      
      return {
        ...event,
        sig: signature,
        id: this.getEventId(event),
        pubkey: this.currentUser!.pubkey,
        created_at: event.created_at || Math.floor(Date.now() / 1000),
      };
    } catch (error) {
      console.error('Failed to sign with manual key:', error);
      throw new Error('Failed to sign event with manual key');
    }
  }

  async encrypt(pubkey: string, plaintext: string): Promise<string> {
    if (!this.currentUser) {
      throw new Error('Not authenticated');
    }

    switch (this.currentUser.method) {
      case 'extension':
        if (!window.nostr || !window.nostr.nip04?.encrypt) {
          throw new Error('Extension does not support NIP-04 encryption');
        }
        return await window.nostr.nip04.encrypt(pubkey, plaintext);
      
      case 'amber':
        // Implement Amber encryption via intent
        throw new Error('Amber encryption not yet implemented');
      
      case 'manual':
        // Implement manual encryption
        throw new Error('Manual encryption not yet implemented');
      
      default:
        throw new Error('Encryption not supported for this auth method');
    }
  }

  async decrypt(pubkey: string, ciphertext: string): Promise<string> {
    if (!this.currentUser) {
      throw new Error('Not authenticated');
    }

    switch (this.currentUser.method) {
      case 'extension':
        if (!window.nostr || !window.nostr.nip04?.decrypt) {
          throw new Error('Extension does not support NIP-04 decryption');
        }
        return await window.nostr.nip04.decrypt(pubkey, ciphertext);
      
      case 'amber':
        // Implement Amber decryption via intent
        throw new Error('Amber decryption not yet implemented');
      
      case 'manual':
        // Implement manual decryption
        throw new Error('Manual decryption not yet implemented');
      
      default:
        throw new Error('Decryption not supported for this auth method');
    }
  }

  // Utility methods
  private isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
  }

  private generateRandomHex(byteLength: number): string {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private privkeyToPubkey(privkeyHex: string): string {
    // This is a simplified implementation for demo purposes
    // In a real implementation, you'd use proper secp256k1 crypto
    // For now, we'll derive a mock pubkey from the privkey
    const hash = this.sha256(privkeyHex);
    return hash.substring(0, 64);
  }

  private sha256(input: string): string {
    // Simple hash function for demo - in production use crypto.subtle.digest
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to hex and pad to create a 64-character string
    const hexHash = Math.abs(hash).toString(16);
    return hexHash.padStart(64, '0');
  }

  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private validateNsecKey(nsec: string): boolean {
    return nsec.startsWith('nsec1') && nsec.length >= 60;
  }

  private nsecToPubkey(nsec: string): string {
    // In real implementation, use proper secp256k1 to derive pubkey from privkey
    // For now, return a placeholder
    return 'pubkey_from_' + nsec.substring(5, 21);
  }

  private pubkeyToNpub(pubkey: string): string {
    // In real implementation, use nostr-tools to encode pubkey to npub
    return 'npub1' + pubkey;
  }

  private signEventWithNsec(event: NostrEvent, nsec: string): string {
    // In real implementation, use proper secp256k1 signing
    // This is a placeholder
    return 'signature_' + JSON.stringify(event).length + '_' + nsec.substring(5, 15);
  }

  private getEventId(event: NostrEvent): string {
    // In real implementation, compute proper event ID hash
    return 'event_id_' + JSON.stringify(event).length;
  }

  private setCurrentUser(user: NostrUser | null): void {
    this.currentUser = user;
    this.notifyAuthCallbacks(user);
    
    if (user && this.options.onAuth) {
      this.options.onAuth(user);
    } else if (!user && this.options.onLogout) {
      this.options.onLogout();
    }
  }

  getCurrentUser(): NostrUser | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  onAuthChange(callback: (user: NostrUser | null) => void): () => void {
    this.authCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.authCallbacks.indexOf(callback);
      if (index > -1) {
        this.authCallbacks.splice(index, 1);
      }
    };
  }

  private notifyAuthCallbacks(user: NostrUser | null): void {
    this.authCallbacks.forEach((callback) => {
      try {
        callback(user);
      } catch (error) {
        console.error('Error in auth callback:', error);
      }
    });
  }
}

// Global window.nostr type declaration
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: unknown): Promise<unknown>;
      nip04?: {
        encrypt(pubkey: string, plaintext: string): Promise<string>;
        decrypt(pubkey: string, ciphertext: string): Promise<string>;
      };
      [key: string]: unknown;
    };
  }
}

// Export singleton instance
export const nostrAuth = NostrAuth.getInstance();
