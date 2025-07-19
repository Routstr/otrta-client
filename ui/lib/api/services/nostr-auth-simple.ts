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

export class NostrAuthSimple {
  private static instance: NostrAuthSimple;
  private isInitialized = false;
  private currentUser: NostrUser | null = null;
  private authCallbacks: ((user: NostrUser | null) => void)[] = [];

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
    await this.checkExistingAuth();
  }

  private async checkExistingAuth(): Promise<void> {
    try {
      if (window.nostr && typeof window.nostr.getPublicKey === 'function') {
        try {
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
        } catch {
          console.log('No existing authentication found');
        }
      }
    } catch (err) {
      console.log('No existing auth found:', err);
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
          error: 'No Nostr extension detected',
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
          await window.nostr.signEvent({
            kind: 27235,
            content: 'Nostr extension permission test',
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
        throw new Error('No Nostr extension detected');
      }

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

      // Ensure the signed event has all required fields for verification
      if (!signedEvent.pubkey || !signedEvent.id || !signedEvent.sig) {
        throw new Error('Signed event is missing required fields');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!verifyEvent(signedEvent as any)) {
        throw new Error('Event verification failed');
      }

      return signedEvent as NostrEvent;
    } catch (error) {
      console.error('Failed to sign event:', error);
      throw new Error('Failed to sign event');
    }
  }

  async logout(): Promise<void> {
    this.setCurrentUser(null);
  }

  private setCurrentUser(user: NostrUser | null): void {
    this.currentUser = user;
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
}

export const nostrAuthSimple = NostrAuthSimple.getInstance();
