// Dynamic imports to avoid SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let nostrLoginModule: any = null;

export interface NostrAuthOptions {
  theme?: 'default' | 'ocean' | 'lemonade' | 'purple';
  darkMode?: boolean;
  bunkers?: string;
  perms?: string;
  methods?: string[];
  noBanner?: boolean;
  onAuth?: (npub: string, options: unknown) => void;
}

export interface NostrUser {
  npub: string;
  pubkey: string;
  nsec?: string;
  method: 'extension' | 'connect' | 'readOnly' | 'local' | 'manual';
}

export class NostrAuth {
  private static instance: NostrAuth;
  private isInitialized = false;
  private currentUser: NostrUser | null = null;
  private authCallbacks: ((user: NostrUser | null) => void)[] = [];

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

    const defaultOptions = {
      theme: 'default' as const,
      darkMode: false,
      bunkers: 'nsec.app,highlighter.com,nostrsigner.com',
      perms: 'sign_event:1,sign_event:0,nip04_encrypt,nip04_decrypt',
      methods: ['connect', 'extension', 'readOnly', 'local'],
      noBanner: true,
      ...options
    };

    try {
      // Dynamically import nostr-login to avoid SSR issues
      if (!nostrLoginModule) {
        nostrLoginModule = await import('nostr-login');
      }
      
      await nostrLoginModule.init({
        ...defaultOptions,
        onAuth: (npub: string, authOptions: unknown) => {
          this.handleAuthEvent(npub, authOptions);
        }
      });

      // Listen for nostr-login auth events
      if (typeof document !== 'undefined') {
        document.addEventListener('nlAuth', (e: Event) => {
          this.handleNostrLoginEvent(e as CustomEvent);
        });
      }

      this.isInitialized = true;
      
      // Check if already authenticated - DISABLED FOR NOW
      // await this.checkExistingAuth();
    } catch (error) {
      console.error('Failed to initialize nostr-login:', error);
      throw error;
    }
  }

  private handleNostrLoginEvent(event: CustomEvent): void {
    const { type, npub } = event.detail;
    
    if (type === 'login' || type === 'signup') {
      this.setCurrentUser({
        npub,
        pubkey: this.npubToPubkey(npub),
        method: this.detectAuthMethod()
      });
    } else if (type === 'logout') {
      this.setCurrentUser(null);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleAuthEvent(npub: string, _options: unknown): void {
    this.setCurrentUser({
      npub,
      pubkey: this.npubToPubkey(npub),
      method: this.detectAuthMethod()
    });
  }

  private detectAuthMethod(): NostrUser['method'] {
    // Try to determine the auth method based on available info
    if (window.nostr) {
      // Check if it's an extension (common extensions add specific properties)
      const nostrExt = window.nostr as Record<string, unknown>;
      if (nostrExt._isAlby || nostrExt.nip07) {
        return 'extension';
      }
      // If we have window.nostr but it's not clearly an extension, assume connect
      return 'connect';
    }
    return 'local';
  }

  private npubToPubkey(npub: string): string {
    // In a real implementation, you would decode the npub to get the hex pubkey
    // For now, we'll use a placeholder or the npub itself
    try {
      // This would use a proper nostr library like nostr-tools to decode
      // For now, return the npub without the prefix
      return npub.replace('npub1', '');
    } catch {
      return npub;
    }
  }

  async launchAuth(startScreen?: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('NostrAuth not initialized. Call initialize() first.');
    }

    try {
      // Ensure nostr-login module is loaded
      if (!nostrLoginModule) {
        nostrLoginModule = await import('nostr-login');
      }
      
      await nostrLoginModule.launch(startScreen);
    } catch (error) {
      console.error('Failed to launch auth dialog:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // Ensure nostr-login module is loaded
      if (!nostrLoginModule) {
        nostrLoginModule = await import('nostr-login');
      }
      
      await nostrLoginModule.logout();
      this.setCurrentUser(null);
    } catch (error) {
      console.error('Failed to logout:', error);
      throw error;
    }
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
        nsec,
        method: 'manual'
      };

      this.setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('Failed to login with nsec:', error);
      throw error;
    }
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

  async checkExistingAuth(): Promise<void> {
    try {
      // Check if window.nostr is available and get pubkey
      if (window.nostr && window.nostr.getPublicKey) {
        const pubkey = await window.nostr.getPublicKey();
        const npub = this.pubkeyToNpub(pubkey);
        
        this.setCurrentUser({
          npub,
          pubkey,
          method: this.detectAuthMethod()
        });
      } else {
        // Check for manually saved nsec in localStorage
        const savedNsec = localStorage.getItem('nostr-nsec');
        if (savedNsec && this.validateNsecKey(savedNsec)) {
          await this.loginWithNsec(savedNsec);
        }
      }
    } catch (error) {
      console.log('No existing auth found:', error);
    }
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
    
    // Return unsubscribe function
    return () => {
      const index = this.authCallbacks.indexOf(callback);
      if (index > -1) {
        this.authCallbacks.splice(index, 1);
      }
    };
  }

  private notifyAuthCallbacks(user: NostrUser | null): void {
    this.authCallbacks.forEach(callback => {
      try {
        callback(user);
      } catch (error) {
        console.error('Error in auth callback:', error);
      }
    });
  }

  async signEvent(event: unknown): Promise<unknown> {
    if (!window.nostr || !window.nostr.signEvent) {
      throw new Error('No Nostr signer available');
    }

    try {
      return await window.nostr.signEvent(event);
    } catch (error) {
      console.error('Failed to sign event:', error);
      throw error;
    }
  }

  async encrypt(pubkey: string, plaintext: string): Promise<string> {
    if (!window.nostr || !window.nostr.nip04?.encrypt) {
      throw new Error('NIP-04 encryption not available');
    }

    try {
      return await window.nostr.nip04.encrypt(pubkey, plaintext);
    } catch (error) {
      console.error('Failed to encrypt:', error);
      throw error;
    }
  }

  async decrypt(pubkey: string, ciphertext: string): Promise<string> {
    if (!window.nostr || !window.nostr.nip04?.decrypt) {
      throw new Error('NIP-04 decryption not available');
    }

    try {
      return await window.nostr.nip04.decrypt(pubkey, ciphertext);
    } catch (error) {
      console.error('Failed to decrypt:', error);
      throw error;
    }
  }

  setDarkMode(darkMode: boolean): void {
    if (typeof document !== 'undefined') {
      document.dispatchEvent(
        new CustomEvent('nlDarkMode', { detail: darkMode })
      );
    }
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