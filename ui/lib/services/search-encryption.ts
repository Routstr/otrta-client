export interface EncryptedSearchData {
  encryptedQuery: string;
  encryptedResponse: string;
  timestamp: number;
}

export interface SearchData {
  query: string;
  response: {
    message: string;
    sources?: Array<{
      metadata: {
        url: string;
        title?: string | null;
        description?: string | null;
      };
      content: string;
    }> | null;
  };
}

export class SearchEncryptionService {
  private static instance: SearchEncryptionService;

  private constructor() {}

  static getInstance(): SearchEncryptionService {
    if (!SearchEncryptionService.instance) {
      SearchEncryptionService.instance = new SearchEncryptionService();
    }
    return SearchEncryptionService.instance;
  }

  async encryptSearchData(
    searchData: SearchData
  ): Promise<EncryptedSearchData> {
    if (!window.nostr?.nip04?.encrypt) {
      throw new Error('Nostr NIP-04 encryption not available');
    }

    const userPubkey = await window.nostr.getPublicKey();

    const encryptedQuery = await window.nostr.nip04.encrypt(
      userPubkey,
      JSON.stringify(searchData.query)
    );

    const encryptedResponse = await window.nostr.nip04.encrypt(
      userPubkey,
      JSON.stringify(searchData.response)
    );

    return {
      encryptedQuery,
      encryptedResponse,
      timestamp: Date.now(),
    };
  }

  async decryptSearchData(
    encryptedData: EncryptedSearchData
  ): Promise<SearchData> {
    if (!window.nostr?.nip04?.decrypt) {
      throw new Error('Nostr NIP-04 decryption not available');
    }

    try {
      const userPubkey = await window.nostr.getPublicKey();

      console.log('🔐 Attempting to decrypt search data...');

      const decryptedQuery = await window.nostr.nip04.decrypt(
        userPubkey,
        encryptedData.encryptedQuery
      );

      const decryptedResponse = await window.nostr.nip04.decrypt(
        userPubkey,
        encryptedData.encryptedResponse
      );

      console.log('✅ Decryption successful');

      return {
        query: JSON.parse(decryptedQuery),
        response: JSON.parse(decryptedResponse),
      };
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw new Error(
        `Failed to decrypt search data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
