import { nip19, getPublicKey, verifyEvent } from 'nostr-tools';

export interface NostrEvent {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
  pubkey?: string;
  id?: string;
  sig?: string;
}

declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: NostrEvent): Promise<NostrEvent>;
      nip04?: {
        encrypt(pubkey: string, plaintext: string): Promise<string>;
        decrypt(pubkey: string, ciphertext: string): Promise<string>;
      };
    };
  }
}

export interface NostrUser {
  npub: string;
  pubkey: string;
  method: 'extension' | 'local';
}

const AUTH_STORAGE_KEY = 'nostr_auth_user';
const AUTH_TIMESTAMP_KEY = 'nostr_auth_timestamp';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export class NostrAuthSimple {
  private static instance: NostrAuthSimple;
  private isInitialized = false;
  private currentUser: NostrUser | null = null;
  private authCallbacks: ((user: NostrUser | null) => void)[] = [];
  private extensionCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): NostrAuthSimple {
    if (!NostrAuthSimple.instance) {
      NostrAuthSimple.instance = new NostrAuthSimple();
    }
    return NostrAuthSimple.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('NostrAuth can only be initialized on the client side');
    }

    this.isInitialized = true;
    await this.restoreAuthState();
    this.startExtensionMonitoring();
  }

  private async restoreAuthState(): Promise<void> {
    try {
      const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      const savedTimestamp = localStorage.getItem(AUTH_TIMESTAMP_KEY);

      if (savedUser && savedTimestamp) {
        const timestamp = parseInt(savedTimestamp, 10);
        const now = Date.now();

        // Check if session hasn't expired
        if (now - timestamp < SESSION_DURATION) {
          const user: NostrUser = JSON.parse(savedUser);

          // If it's an extension user, verify the extension is still available
          if (user.method === 'extension') {
            if (await this.verifyExtensionConnection(user.pubkey)) {
              this.currentUser = user;
              this.notifyAuthCallbacks(user);
              return;
            } else {
              // Extension no longer available, clear stored auth
              this.clearStoredAuth();
            }
          } else {
            // Local method, restore directly
            this.currentUser = user;
            this.notifyAuthCallbacks(user);
            return;
          }
        } else {
          // Session expired
          this.clearStoredAuth();
        }
      }

      // Try to auto-connect to extension if available
      await this.tryAutoConnectExtension();
    } catch (err) {
      console.log('Error restoring auth state:', err);
      this.clearStoredAuth();
    }
  }

  private async verifyExtensionConnection(
    expectedPubkey: string
  ): Promise<boolean> {
    try {
      if (!window.nostr?.getPublicKey) return false;

      const pubkey = await window.nostr.getPublicKey();
      return pubkey === expectedPubkey;
    } catch {
      return false;
    }
  }

  private async tryAutoConnectExtension(): Promise<void> {
    try {
      if (window.nostr?.getPublicKey) {
        // Don't automatically request permission, just check if we already have it
        const pubkey = await window.nostr.getPublicKey();
        if (pubkey) {
          const npub = nip19.npubEncode(pubkey);
          const user: NostrUser = {
            npub,
            pubkey,
            method: 'extension',
          };
          this.setCurrentUser(user);
        }
      }
    } catch {
      // Extension available but no permission granted - this is normal
    }
  }

  private startExtensionMonitoring(): void {
    // Monitor extension availability every 5 seconds
    this.extensionCheckInterval = setInterval(() => {
      if (this.currentUser?.method === 'extension' && !window.nostr) {
        // Extension was disconnected
        this.logout();
      }
    }, 5000);
  }

  private clearStoredAuth(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_TIMESTAMP_KEY);
  }

  private saveAuthState(user: NostrUser): void {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
    } catch (err) {
      console.error('Failed to save auth state:', err);
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
          error:
            'No Nostr extension detected. Please install a Nostr extension like Alby or nos2x.',
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
          // Use a test event that won't interfere with anything
          await window.nostr.signEvent({
            kind: 27235,
            content: 'Permission test - this event will not be published',
            tags: [],
            created_at: Math.floor(Date.now() / 1000),
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
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async loginWithExtension(): Promise<NostrUser> {
    try {
      if (!window.nostr) {
        throw new Error(
          'No Nostr extension detected. Please install a Nostr extension like Alby or nos2x.'
        );
      }

      // Request public key (this will trigger permission request if needed)
      const pubkey = await window.nostr.getPublicKey();
      const npub = nip19.npubEncode(pubkey);

      const user: NostrUser = {
        npub,
        pubkey,
        method: 'extension',
      };

      this.setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('Failed to login with extension:', error);

      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          throw new Error(
            'Permission denied by user. Please allow access to continue.'
          );
        }
        if (error.message.includes('not found')) {
          throw new Error(
            'Nostr extension not found. Please install a Nostr extension like Alby or nos2x.'
          );
        }
      }

      throw new Error(
        'Failed to authenticate with browser extension. Please try again.'
      );
    }
  }

  async loginWithNsec(nsec: string): Promise<NostrUser> {
    try {
      const decoded = nip19.decode(nsec);
      if (decoded.type !== 'nsec') {
        throw new Error('Invalid nsec format');
      }

      const privateKey = decoded.data as Uint8Array;
      const pubkey = getPublicKey(privateKey);
      const npub = nip19.npubEncode(pubkey);

      const user: NostrUser = {
        npub,
        pubkey,
        method: 'local',
      };

      this.setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('Failed to login with nsec:', error);
      throw new Error('Invalid nsec key format');
    }
  }

  async signEvent(event: NostrEvent): Promise<NostrEvent> {
    if (!this.currentUser) {
      throw new Error('Not authenticated');
    }

    if (!window.nostr || typeof window.nostr.signEvent !== 'function') {
      throw new Error('Signing not available for this authentication method');
    }

    try {
      const eventToSign = {
        kind: event.kind,
        content: event.content,
        tags: event.tags,
        created_at: event.created_at,
        pubkey: event.pubkey || this.currentUser.pubkey,
      };

      const signedEvent = await window.nostr.signEvent(eventToSign);

      if (!signedEvent.pubkey || !signedEvent.id || !signedEvent.sig) {
        throw new Error('Signed event is missing required fields');
      }

      // Type assertion for verification - we've already checked all required fields exist
      const eventForVerification = {
        ...signedEvent,
        pubkey: signedEvent.pubkey,
        id: signedEvent.id,
        sig: signedEvent.sig,
      };

      if (!verifyEvent(eventForVerification)) {
        throw new Error('Event verification failed');
      }

      return signedEvent as NostrEvent;
    } catch (error) {
      console.error('Failed to sign event:', error);
      throw new Error('Failed to sign event');
    }
  }

  async logout(): Promise<void> {
    this.clearStoredAuth();
    this.setCurrentUser(null);

    if (this.extensionCheckInterval) {
      clearInterval(this.extensionCheckInterval);
      this.extensionCheckInterval = null;
    }
  }

  private setCurrentUser(user: NostrUser | null): void {
    this.currentUser = user;

    if (user) {
      this.saveAuthState(user);
    } else {
      this.clearStoredAuth();
    }

    this.notifyAuthCallbacks(user);
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
      this.offAuthChange(callback);
    };
  }

  private offAuthChange(callback: (user: NostrUser | null) => void): void {
    const index = this.authCallbacks.indexOf(callback);
    if (index > -1) {
      this.authCallbacks.splice(index, 1);
    }
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

  // Cleanup method for when the instance is no longer needed
  destroy(): void {
    if (this.extensionCheckInterval) {
      clearInterval(this.extensionCheckInterval);
      this.extensionCheckInterval = null;
    }
    this.authCallbacks = [];
    this.currentUser = null;
    this.isInitialized = false;
  }
}

export const nostrAuthSimple = NostrAuthSimple.getInstance();
