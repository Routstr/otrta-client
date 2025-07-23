import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { nip19 } from 'nostr-tools';

export interface GeneratedNostrKey {
  privateKeyHex: string;
  privateKeyNsec: string;
  publicKeyHex: string;
  publicKeyNpub: string;
}

export function generateNostrKey(): GeneratedNostrKey {
  const privateKeyBytes = generateSecretKey();
  const privateKeyHex = Array.from(privateKeyBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const privateKeyNsec = nip19.nsecEncode(privateKeyBytes);
  const publicKeyHex = getPublicKey(privateKeyBytes);
  const publicKeyNpub = nip19.npubEncode(publicKeyHex);

  return {
    privateKeyHex,
    privateKeyNsec,
    publicKeyHex,
    publicKeyNpub,
  };
}
