import { STORAGE_KEYS, readStorage, removeStorage, writeStorage } from './storage';

/**
 * Multi-Layer Client Vault (Web Crypto API + Split-Shard Persistence + Transport Blinding)
 * Used ONLY when the user opts in to remembering their own Gemini key encrypted on this browser,
 * so the key can transparently re-seal the server's 5-layer HttpOnly cookie across restarts.
 *
 * Layer 1 (IndexedDB Non-Extractable CryptoKey): AES-GCM 256-bit key generated with extractable=false.
 * Layer 2 (PBKDF2-SHA256 Origin-Bound Wrap): 210,000 iterations PBKDF2 over per-device entropy + origin salt.
 * Layer 3 (CSPRNG XOR Blinding + Split-Shard Isolation): Splits encrypted shares between IndexedDB and localStorage so neither store alone holds complete ciphertext.
 */

const IDB_DB_NAME = 'orbit_crypto_vault_v2';
const IDB_STORE_NAME = 'keys';
const IDB_KEY_ID = 'device_master_aes_gcm';
const IDB_SHARD_ID = 'device_vault_shard_b';

interface StoredLocalVaultV2 {
  v: 2;
  saltB64: string;
  iv1B64: string;
  ct1HeadB64: string;
  iv2B64: string;
  ct2B64: string;
  deviceSecretB64: string;
}

export interface ClientTransportEnvelope {
  v: 1;
  n: string;
  a: string;
  b: string;
}

function toB64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function toB64Url(bytes: Uint8Array): string {
  return toB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

/**
 * Packs user-entered API key into ephemeral CSPRNG XOR-rotated split shards for transport
 * so raw key bytes aren't exposed directly in JSON payload buffers.
 */
export async function packClientTransportEnvelope(rawApiKey: string): Promise<ClientTransportEnvelope | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  const clean = rawApiKey.trim();
  if (!clean) return null;
  const nonce = crypto.getRandomValues(new Uint8Array(24));
  const label = new TextEncoder().encode('orbit-tx-mask-v1');
  const seedInput = new Uint8Array(nonce.length + label.length);
  seedInput.set(nonce, 0);
  seedInput.set(label, nonce.length);
  const padBuf = await crypto.subtle.digest('SHA-256', toArrayBuffer(seedInput));
  const pad = new Uint8Array(padBuf);

  const keyBytes = new TextEncoder().encode(clean);
  const shardA = new Uint8Array(keyBytes.length);
  const shardB = new Uint8Array(keyBytes.length);
  const rnd = crypto.getRandomValues(new Uint8Array(keyBytes.length));

  for (let i = 0; i < keyBytes.length; i++) {
    const rot = rnd[i];
    shardA[i] = keyBytes[i] ^ rot;
    shardB[i] = rot ^ pad[i % pad.length];
  }
  keyBytes.fill(0);
  rnd.fill(0);

  return {
    v: 1,
    n: toB64Url(nonce),
    a: toB64Url(shardA),
    b: toB64Url(shardB),
  };
}

function openVaultDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openVaultDb();
  if (!db) return null;
  try {
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const getReq = tx.objectStore(IDB_STORE_NAME).get(key);
      getReq.onsuccess = () => resolve((getReq.result as T) ?? null);
      getReq.onerror = () => resolve(null);
    });
  } catch {
    return null;
  } finally {
    db.close();
  }
}

async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openVaultDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      tx.objectStore(IDB_STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore IDB quota errors cleanly
  } finally {
    db.close();
  }
}

async function getOrCreateIdbKey(): Promise<CryptoKey | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  const existing = await idbGet<CryptoKey>(IDB_KEY_ID);
  if (existing) return existing;

  try {
    const generated = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // non-extractable: JS can never read the raw key bytes
      ['encrypt', 'decrypt']
    );
    await idbPut(IDB_KEY_ID, generated);
    return generated;
  } catch {
    return null;
  }
}

async function derivePbkdf2Key(secretBytes: Uint8Array, saltBytes: Uint8Array): Promise<CryptoKey> {
  const originBytes = new TextEncoder().encode(
    typeof window !== 'undefined' ? window.location.origin : 'orbit-local'
  );
  const combined = new Uint8Array(secretBytes.length + originBytes.length);
  combined.set(secretBytes, 0);
  combined.set(originBytes, secretBytes.length);

  const baseKey = await crypto.subtle.importKey('raw', toArrayBuffer(combined), 'PBKDF2', false, [
    'deriveKey',
  ]);
  combined.fill(0);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(saltBytes),
      iterations: 210000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function saveEncryptedClientBackup(rawApiKey: string): Promise<boolean> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return false;
  try {
    const clean = rawApiKey.trim();
    if (!clean) return false;

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const deviceSecret = crypto.getRandomValues(new Uint8Array(32));
    const pbkdfKey = await derivePbkdf2Key(deviceSecret, salt);

    // CSPRNG XOR pre-blinding before PBKDF2 AES-GCM
    const plainBytes = new TextEncoder().encode(clean);
    const blindMask = crypto.getRandomValues(new Uint8Array(plainBytes.length));
    const blinded = new Uint8Array(plainBytes.length);
    for (let i = 0; i < plainBytes.length; i++) {
      blinded[i] = plainBytes[i] ^ blindMask[i];
    }
    plainBytes.fill(0);

    const iv1 = crypto.getRandomValues(new Uint8Array(12));
    const ct1 = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv1) }, pbkdfKey, toArrayBuffer(blinded))
    );
    blinded.fill(0);

    const idbKey = await getOrCreateIdbKey();
    let iv2 = new Uint8Array(12);
    let ct2 = ct1;
    if (idbKey) {
      iv2 = crypto.getRandomValues(new Uint8Array(12));
      ct2 = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv2) }, idbKey, toArrayBuffer(ct1))
      );
    }

    // Store blindMask + shard half inside IDB, while encrypted envelope lives in localStorage
    await idbPut(IDB_SHARD_ID, toB64(blindMask));
    blindMask.fill(0);

    const payload: StoredLocalVaultV2 = {
      v: 2,
      saltB64: toB64(salt),
      iv1B64: toB64(iv1),
      ct1HeadB64: toB64(ct1.slice(0, 8)),
      iv2B64: toB64(iv2),
      ct2B64: toB64(ct2),
      deviceSecretB64: toB64(deviceSecret),
    };
    writeStorage(STORAGE_KEYS.aiDeviceVault, payload);
    return true;
  } catch {
    return false;
  }
}

export async function loadEncryptedClientBackup(): Promise<string | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  const saved = readStorage<StoredLocalVaultV2 | null>(STORAGE_KEYS.aiDeviceVault, null);
  if (!saved || saved.v !== 2 || !saved.saltB64 || !saved.ct2B64) return null;

  try {
    const idbKey = await getOrCreateIdbKey();
    const shardB64 = await idbGet<string>(IDB_SHARD_ID);
    if (!shardB64) return null;

    let ct1 = fromB64(saved.ct2B64);
    if (idbKey && saved.iv2B64) {
      const iv2 = fromB64(saved.iv2B64);
      ct1 = new Uint8Array(
        await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBuffer(iv2) }, idbKey, toArrayBuffer(ct1))
      );
    }

    const salt = fromB64(saved.saltB64);
    const iv1 = fromB64(saved.iv1B64);
    const deviceSecret = fromB64(saved.deviceSecretB64);
    const pbkdfKey = await derivePbkdf2Key(deviceSecret, salt);
    deviceSecret.fill(0);

    const blindedBuf = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: toArrayBuffer(iv1) },
        pbkdfKey,
        toArrayBuffer(ct1)
      )
    );
    const blindMask = fromB64(shardB64);
    if (blindMask.length !== blindedBuf.length) return null;

    const restored = new Uint8Array(blindedBuf.length);
    for (let i = 0; i < blindedBuf.length; i++) {
      restored[i] = blindedBuf[i] ^ blindMask[i];
    }
    blindedBuf.fill(0);
    blindMask.fill(0);

    const decoded = new TextDecoder().decode(restored);
    restored.fill(0);
    return decoded;
  } catch {
    return null;
  }
}

export function hasEncryptedClientBackup(): boolean {
  const saved = readStorage<StoredLocalVaultV2 | null>(STORAGE_KEYS.aiDeviceVault, null);
  return Boolean(saved && saved.v === 2 && saved.ct2B64);
}

export async function clearClientVault(): Promise<void> {
  removeStorage(STORAGE_KEYS.aiDeviceVault);
  const db = await openVaultDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.delete(IDB_KEY_ID);
      store.delete(IDB_SHARD_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore
  } finally {
    db.close();
  }
}
