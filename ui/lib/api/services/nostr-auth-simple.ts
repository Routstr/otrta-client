import { nip19, verifyEvent } from 'nostr-tools';

// Declare window.nostr interface for TypeScript
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      signEvent(event: any): Promise<any>;
      nip04?: {
        encrypt(pubkey: string, plaintext: string): Promise<string>;
        decrypt(pubkey: string, ciphertext: string): Promise<string>;
      };
    };
  }
}

export interface NostrAuthOptions {
  theme?: 'default' | 'ocean' | 'lemonade' | 'purple';
  darkMode?: boolean;
  onAuth?: (user: NostrUser) => void;
  onLogout?: () => void;
  bunkers?: string[];
  methods?: string[];
  noBanner?: boolean;
}

export interface NostrUser {
  npub: string;
  pubkey: string;
  method: 'extension' | 'connect' | 'readOnly' | 'local';
}

export interface NostrLoginAuth {
  type: 'login' | 'signup' | 'logout';
  pubkey?: string;
  method?: string;
  localKey?: string;
}

export interface NostrLoginAuthOptions {
  method?: string;
  localKey?: string;
}

export interface NostrEvent {
  kind: number;
  content: string;
  tags: string[][];
  created_at: number;
  pubkey?: string;
  id?: string;
  sig?: string;
}

export class NostrAuthSimple {
  private static instance: NostrAuthSimple;
  private isInitialized = false;
  private currentUser: NostrUser | null = null;
  private authCallbacks: ((user: NostrUser | null) => void)[] = [];
  private options: NostrAuthOptions = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private nostrLogin: any = null;

  private constructor() {}

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
      noBanner: true,
      methods: ['extension', 'connect', 'readOnly', 'local'],
      bunkers: ['nsec.app', 'highlighter.com'],
      ...options,
    };

    try {
      // Import nostr-login dynamically for Next.js SSR compatibility
      const { init } = await import('nostr-login');

      // Initialize nostr-login with options
      // Using type assertion to bypass type conflicts with external library
      this.nostrLogin = init({
        theme: this.options.theme,
        darkMode: this.options.darkMode,
        noBanner: this.options.noBanner,
        methods: this.options.methods?.join(','),
        bunkers: this.options.bunkers?.join(','),
        onAuth: this.handleNostrLoginAuth.bind(this),
      } as never);

      // Listen for authentication events
      document.addEventListener(
        'nlAuth',
        this.handleAuthEvent.bind(this) as EventListener
      );

      this.isInitialized = true;
      await this.checkExistingAuth();
    } catch (error) {
      console.error('Failed to initialize nostr-login:', error);
      throw new Error('Failed to initialize Nostr authentication');
    }
  }

  private handleNostrLoginAuth(
    npub: string,
    options: NostrLoginAuthOptions
  ): void {
    if (npub) {
      try {
        const decoded = nip19.decode(npub);
        if (decoded.type === 'npub') {
          const user: NostrUser = {
            npub,
            pubkey: decoded.data as string,
            method: this.mapAuthMethod(options.method || 'extension'),
          };
          this.setCurrentUser(user);
        }
      } catch (err) {
        console.error('Failed to decode npub:', err);
      }
    } else {
      this.setCurrentUser(null);
    }
  }

  private handleAuthEvent(event: Event): void {
    const customEvent = event as CustomEvent<NostrLoginAuth>;
    const { type, pubkey, method } = customEvent.detail;

    if (type === 'login' || type === 'signup') {
      if (pubkey) {
        const npub = nip19.npubEncode(pubkey);
        const user: NostrUser = {
          npub,
          pubkey,
          method: this.mapAuthMethod(method || 'extension'),
        };
        this.setCurrentUser(user);
      }
    } else if (type === 'logout') {
      this.setCurrentUser(null);
    }
  }

  private mapAuthMethod(
    method: string
  ): 'extension' | 'connect' | 'readOnly' | 'local' {
    switch (method) {
      case 'extension':
        return 'extension';
      case 'connect':
        return 'connect';
      case 'readOnly':
        return 'readOnly';
      case 'local':
        return 'local';
      default:
        return 'extension';
    }
  }

  private async checkExistingAuth(): Promise<void> {
    try {
      // Check if window.nostr is available and get current user
      if (window.nostr && typeof window.nostr.getPublicKey === 'function') {
        try {
          const pubkey = await window.nostr.getPublicKey();
          if (pubkey) {
            const npub = nip19.npubEncode(pubkey);
            const user: NostrUser = {
              npub,
              pubkey,
              method: 'extension', // Default to extension for existing auth
            };
            this.setCurrentUser(user);
          }
        } catch {
          // User might not be authenticated yet, which is fine
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
      await this.launchAuth('login');

      // Wait for authentication to complete
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Authentication timeout'));
        }, 30000);

        const handleAuth = (user: NostrUser | null) => {
          if (user && user.method === 'extension') {
            clearTimeout(timeout);
            this.offAuthChange(handleAuth);
            resolve(user);
          }
        };

        this.onAuthChange(handleAuth);
      });
    } catch (error) {
      console.error('Failed to login with extension:', error);
      throw new Error(
        'Failed to authenticate with browser extension. Please try again.'
      );
    }
  }

  async loginWithConnect(): Promise<NostrUser> {
    try {
      await this.launchAuth('connect');

      // Wait for authentication to complete
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Authentication timeout'));
        }, 60000);

        const handleAuth = (user: NostrUser | null) => {
          if (user && user.method === 'connect') {
            clearTimeout(timeout);
            this.offAuthChange(handleAuth);
            resolve(user);
          }
        };

        this.onAuthChange(handleAuth);
      });
    } catch (error) {
      console.error('Failed to login with Nostr Connect:', error);
      throw new Error(
        'Failed to authenticate with Nostr Connect. Please try again.'
      );
    }
  }

  async loginWithReadOnly(npubOrPublicKey: string): Promise<NostrUser> {
    try {
      // Validate the input
      let pubkey: string;

      if (npubOrPublicKey.startsWith('npub')) {
        const decoded = nip19.decode(npubOrPublicKey);
        if (decoded.type !== 'npub') {
          throw new Error('Invalid npub format');
        }
        pubkey = decoded.data as string;
      } else if (
        npubOrPublicKey.length === 64 &&
        /^[0-9a-f]+$/i.test(npubOrPublicKey)
      ) {
        pubkey = npubOrPublicKey;
      } else {
        throw new Error('Invalid public key format');
      }

      const npub = nip19.npubEncode(pubkey);

      // Set read-only user
      const user: NostrUser = {
        npub,
        pubkey,
        method: 'readOnly',
      };

      this.setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('Failed to login with read-only key:', error);
      throw new Error('Invalid public key format');
    }
  }

  async loginWithLocalKey(): Promise<NostrUser> {
    try {
      await this.launchAuth('local-signup');

      // Wait for authentication to complete
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Authentication timeout'));
        }, 30000);

        const handleAuth = (user: NostrUser | null) => {
          if (user && user.method === 'local') {
            clearTimeout(timeout);
            this.offAuthChange(handleAuth);
            resolve(user);
          }
        };

        this.onAuthChange(handleAuth);
      });
    } catch (error) {
      console.error('Failed to login with local key:', error);
      throw new Error('Failed to create local key. Please try again.');
    }
  }

  private async launchAuth(startScreen?: string): Promise<void> {
    try {
      const { launch } = await import('nostr-login');
      // Using type assertion to bypass type conflicts
      launch({ startScreen } as never);
    } catch (error) {
      console.error('Failed to launch authentication:', error);
      throw new Error('Failed to launch authentication dialog');
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

      // Verify the signed event
      if (!verifyEvent(signedEvent)) {
        throw new Error('Event verification failed');
      }

      return signedEvent as NostrEvent;
    } catch (error) {
      console.error('Failed to sign event:', error);
      throw new Error('Failed to sign event');
    }
  }

  async logout(): Promise<void> {
    try {
      const { logout } = await import('nostr-login');
      logout();
    } catch (error) {
      console.error('Failed to logout from nostr-login:', error);
    }

    this.setCurrentUser(null);
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

  // Compatibility methods for legacy code
  async loginWithAmber(): Promise<NostrUser> {
    return this.loginWithConnect();
  }

  async loginWithNsec(nsec: string): Promise<NostrUser> {
    try {
      const decoded = nip19.decode(nsec);
      if (decoded.type !== 'nsec') {
        throw new Error('Invalid nsec format');
      }

      // For security reasons, we don't actually store the nsec
      // Instead, we'll create a local key through nostr-login
      return this.loginWithLocalKey();
    } catch (error) {
      console.error('Failed to login with nsec:', error);
      throw new Error('Invalid nsec key format');
    }
  }
}

export const nostrAuthSimple = NostrAuthSimple.getInstance();
