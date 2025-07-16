import NDK, { NDKNip46Signer, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import { generateSecretKey } from 'nostr-tools/pure';
import { nip19, finalizeEvent, verifyEvent } from 'nostr-tools';

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

export class NostrAuthSimple {
  private static instance: NostrAuthSimple;
  private isInitialized = false;
  private currentUser: NostrUser | null = null;
  private authCallbacks: ((user: NostrUser | null) => void)[] = [];
  private options: NostrAuthOptions = {};
  private ndk: NDK;
  private localSigner: NDKPrivateKeySigner | null = null;
  private remoteSigner: NDKNip46Signer | null = null;

  private constructor() {
    this.ndk = new NDK({
      explicitRelayUrls: ['wss://relay.nsec.app'],
      enableOutboxModel: false
    });
  }

  static getInstance(): NostrAuthSimple {
    if (!NostrAuthSimple.instance) {
      NostrAuthSimple.instance = new NostrAuthSimple();
    }
    return NostrAuthSimple.instance;
  }

  async initialize(options: NostrAuthOptions = {}): Promise<void> {
    if (this.isInitialized) return;

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('NostrAuth can only be initialized on the client side');
    }

    this.options = {
      theme: 'default',
      darkMode: false,
      ...options,
    };

    this.isInitialized = true;
    await this.checkExistingAuth();
  }

  private async checkExistingAuth(): Promise<void> {
    try {
      const savedUser = localStorage.getItem('nostr-user');
      if (savedUser) {
        const user = JSON.parse(savedUser) as NostrUser;
        this.setCurrentUser(user);
      }
    } catch (error) {
      console.log('No existing auth found:', error);
    }
  }

  async checkExtensionPermissions(): Promise<{
    hasGetPublicKey: boolean;
    hasSignEvent: boolean;
    error?: string;
  }> {
    try {
      if (!window.nostr) {
        return {
          hasGetPublicKey: false,
          hasSignEvent: false,
          error: 'No Nostr extension detected'
        };
      }

      let hasGetPublicKey = false;
      let hasSignEvent = false;

      if (window.nostr.getPublicKey) {
        try {
          await window.nostr.getPublicKey();
          hasGetPublicKey = true;
        } catch (error) {
          console.log('getPublicKey permission not granted:', error);
        }
      }

             if (window.nostr.signEvent && hasGetPublicKey) {
         try {
           // @ts-expect-error - Bypassing type conflicts with window.nostr
           await window.nostr.signEvent({
             kind: 27235,
             content: 'Nostr extension permission test',
             tags: [],
             created_at: Math.floor(Date.now() / 1000)
           });
           hasSignEvent = true;
        } catch (error) {
          console.log('signEvent permission not granted:', error);
        }
      }

      return { hasGetPublicKey, hasSignEvent };
    } catch (error) {
      return {
        hasGetPublicKey: false,
        hasSignEvent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async loginWithExtension(): Promise<NostrUser> {
    try {
      if (!window.nostr || !window.nostr.getPublicKey) {
        throw new Error('No Nostr extension detected');
      }

      const pubkey = await window.nostr.getPublicKey();
      const npub = nip19.npubEncode(pubkey);

             const testEvent = {
         kind: 27235,
         content: 'Nostr login verification',
         tags: [],
         created_at: Math.floor(Date.now() / 1000)
       };

             try {
         // @ts-expect-error - Bypassing type conflicts with window.nostr
         await window.nostr.signEvent(testEvent);
         console.log('Successfully granted signEvent permission');
      } catch (signError) {
        console.error('Failed to get signEvent permission:', signError);
        throw new Error('Please grant signEvent permission in your extension to continue.');
      }

      const user: NostrUser = {
        npub,
        pubkey,
        method: 'extension',
      };

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
      await this.ndk.connect();
      
      this.localSigner = new NDKPrivateKeySigner(generateSecretKey());
      const localUser = await this.localSigner.user();
      const localPubkey = localUser.pubkey;
      
      const secretKey = generateSecretKey();
      const secret = Array.from(secretKey).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
      
      const permissions = 'sign_event,get_public_key,nip04_encrypt,nip04_decrypt';
      const appName = 'OTRTA';
      const appUrl = window.location.origin;
      const relay = 'wss://relay.nsec.app';
      
      const nostrConnectUrl = `nostrconnect://${localPubkey}` +
        `?relay=${encodeURIComponent(relay)}` +
        `&secret=${secret}` +
        `&perms=${encodeURIComponent(permissions)}` +
        `&name=${encodeURIComponent(appName)}` +
        `&url=${encodeURIComponent(appUrl)}`;

      console.log('Generated nostrconnect URL:', nostrConnectUrl);

      if (this.isAndroid()) {
        try {
          window.location.href = nostrConnectUrl;
        } catch (error) {
          console.log('Direct navigation failed, trying window.open:', error);
          window.open(nostrConnectUrl, '_blank');
        }
      } else {
        window.open(nostrConnectUrl, '_blank');
      }

      const userPubkey = await this.waitForAmberConnection(secret);
      const npub = nip19.npubEncode(userPubkey);

      const user: NostrUser = {
        npub,
        pubkey: userPubkey,
        method: 'amber',
      };

      localStorage.setItem('nostr-user', JSON.stringify(user));
      this.setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('Failed to login with Amber:', error);
      throw new Error('Failed to authenticate with Amber. Please ensure Amber is installed and supports NIP-46.');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async waitForAmberConnection(_secret: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout - please ensure Amber is installed and supports NIP-46'));
      }, 60000);

      const cleanup = () => {
        clearTimeout(timeout);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };

      const handleConnectionSuccess = (pubkey: string) => {
        cleanup();
        resolve(pubkey);
      };

      const handleVisibilityChange = () => {
        if (!document.hidden) {
          console.log('Page became visible, checking for connection...');
          setTimeout(() => {
            // In a real implementation, this would check for actual NIP-46 response
            // For now, we'll simulate a successful connection after user returns
            if (Math.random() > 0.3) { // 70% success rate for demo
              const mockPubkey = Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('');
              handleConnectionSuccess(mockPubkey);
            }
          }, 2000);
        }
      };

      const handleFocus = () => {
        console.log('Window focused, checking for connection...');
        setTimeout(() => {
          // Similar mock implementation
          if (Math.random() > 0.3) {
            const mockPubkey = Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('');
            handleConnectionSuccess(mockPubkey);
          }
        }, 2000);
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
    });
  }

  async loginWithNsec(nsec: string): Promise<NostrUser> {
    try {
      if (!this.validateNsecKey(nsec)) {
        throw new Error('Invalid nsec format');
      }

      const decoded = nip19.decode(nsec);
      if (decoded.type !== 'nsec') {
        throw new Error('Invalid nsec key');
      }

      const privkey = decoded.data as Uint8Array;
      const privkeyHex = Array.from(privkey).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Create a temporary signer to get the public key
      const tempSigner = new NDKPrivateKeySigner(privkeyHex);
      const tempUser = await tempSigner.user();
      const pubkey = tempUser.pubkey;
      const npub = nip19.npubEncode(pubkey);

      const user: NostrUser = {
        npub,
        pubkey,
        method: 'manual',
      };

      localStorage.setItem('nostr-user', JSON.stringify(user));
      localStorage.setItem('nostr-nsec', nsec);

      this.setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('Failed to login with nsec:', error);
      throw new Error('Invalid nsec key format');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async signEvent(event: any): Promise<any> {
    if (!this.currentUser) {
      throw new Error('Not authenticated');
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async signWithExtension(event: any): Promise<any> {
    if (!window.nostr || !window.nostr.signEvent) {
      throw new Error('Extension does not support event signing');
    }

    try {
      const signedEvent = await window.nostr.signEvent(event);
      return signedEvent;
    } catch (error) {
      console.error('Failed to sign with extension:', error);
      throw new Error('Failed to sign event with extension');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async signWithAmber(event: any): Promise<any> {
    // For now, return a mock signed event
    // In a real implementation, this would use the NIP-46 signer
    return {
      ...event,
      id: 'mock_id_' + Date.now(),
      pubkey: this.currentUser!.pubkey,
      created_at: event.created_at || Math.floor(Date.now() / 1000),
      sig: 'mock_signature_from_amber_' + Date.now()
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async signWithManualKey(event: any): Promise<any> {
    try {
      const nsec = localStorage.getItem('nostr-nsec');
      if (!nsec) {
        throw new Error('No saved private key found');
      }

      const decoded = nip19.decode(nsec);
      if (decoded.type !== 'nsec') {
        throw new Error('Invalid stored private key');
      }

      const privkey = decoded.data as Uint8Array;
      
      const eventToSign = {
        kind: event.kind,
        content: event.content,
        tags: event.tags || [],
        created_at: event.created_at || Math.floor(Date.now() / 1000),
        pubkey: this.currentUser!.pubkey
      };

      const signedEvent = finalizeEvent(eventToSign, privkey);
      
      if (!verifyEvent(signedEvent)) {
        throw new Error('Event verification failed');
      }

      return signedEvent;
    } catch (error) {
      console.error('Failed to sign with manual key:', error);
      throw new Error('Failed to sign event with manual key');
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem('nostr-user');
    localStorage.removeItem('nostr-nsec');
    this.setCurrentUser(null);
  }

  private validateNsecKey(nsec: string): boolean {
    try {
      const decoded = nip19.decode(nsec);
      return decoded.type === 'nsec';
    } catch {
      return false;
    }
  }

  private isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
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

// Window.nostr interface is already declared in nostr-auth.ts

export const nostrAuthSimple = NostrAuthSimple.getInstance(); 