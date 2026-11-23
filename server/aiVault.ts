import crypto from 'node:crypto';
import type { Request, Response } from 'express';

/**
 * 5-Layer Cryptographic Vault for user-supplied Gemini API keys (Zero-Server-Key BYOK).
 *
 * Layer 1 (Strict Input Validation & Non-Reversible Masking): Rejects malformed keys; never echoes plaintext.
 * Layer 2 (Split-XOR Blinding Shares): Splits key bytes against a CSPRNG blinding pad so no contiguous plaintext exists inside sealed records.
 * Layer 3 (Inner AES-256-GCM Seal): Independent HKDF-SHA256 subkey + random IV + AAD binding.
 * Layer 4 (Cascade ChaCha20-Poly1305 Seal): Distinct cipher suite + independent HKDF-SHA256 subkey + fresh nonce + AAD binding.
 * Layer 5 (Outer AES-256-GCM Envelope + HMAC-SHA256 Key-Commitment Tag): Bound to context inside HttpOnly; Partitioned cookie (Path=/api/ai).
 */

const EPHEMERAL_MASTER_SECRET = crypto.randomBytes(32);

function getMasterSecret(): Buffer {
  const configured = process.env.ORBIT_VAULT_SECRET?.trim();
  if (configured && configured.length >= 16) {
    return crypto.createHash('sha256').update(configured, 'utf8').digest();
  }
  return EPHEMERAL_MASTER_SECRET;
}

const VAULT_COOKIE_NAME = 'orbit_ai_vault';
const COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function deriveHkdfKey(salt: Buffer, info: string): Buffer {
  const key = crypto.hkdfSync('sha256', getMasterSecret(), salt, Buffer.from(info, 'utf8'), 32);
  return Buffer.from(key);
}

function cipherSeal(
  algorithm: 'aes-256-gcm' | 'chacha20-poly1305',
  key: Buffer,
  plaintext: Buffer,
  aad: string
): { iv: Buffer; tag: Buffer; ct: Buffer } {
  const iv = crypto.randomBytes(12);
  const cipher =
    algorithm === 'chacha20-poly1305'
      ? crypto.createCipheriv('chacha20-poly1305', key, iv, { authTagLength: 16 })
      : crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad, 'utf8'), { plaintextLength: plaintext.length });
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv, tag, ct };
}

function cipherOpen(
  algorithm: 'aes-256-gcm' | 'chacha20-poly1305',
  key: Buffer,
  iv: Buffer,
  tag: Buffer,
  ct: Buffer,
  aad: string
): Buffer {
  const decipher =
    algorithm === 'chacha20-poly1305'
      ? crypto.createDecipheriv('chacha20-poly1305', key, iv, { authTagLength: 16 })
      : crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(Buffer.from(aad, 'utf8'), { plaintextLength: ct.length });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

function computeCommitmentMac(macKey: Buffer, payload: Buffer): string {
  return crypto.createHmac('sha256', macKey).update(payload).digest('base64url');
}

export function isValidGeminiKeyFormat(rawKey: unknown): rawKey is string {
  if (typeof rawKey !== 'string') return false;
  const trimmed = rawKey.trim();
  if (trimmed.length < 20 || trimmed.length > 256) return false;
  if (/[\s\r\n\t"'`]/.test(trimmed)) return false;
  return /^[A-Za-z0-9_-]+$/.test(trimmed);
}

export function maskApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 10) return '••••';
  return `${trimmed.slice(0, 6)}••••${trimmed.slice(-4)}`;
}

/**
 * Unpacks an obfuscated client transport envelope (XOR-split shards + random nonce)
 * so user-entered API keys aren't sent as obvious raw strings across browser memory/JSON.
 */
export function unpackClientTransportEnvelope(envelope: unknown): string | null {
  if (!envelope || typeof envelope !== 'object') return null;
  const env = envelope as { v?: unknown; n?: unknown; a?: unknown; b?: unknown };
  if (env.v !== 1 || typeof env.n !== 'string' || typeof env.a !== 'string' || typeof env.b !== 'string') {
    return null;
  }
  try {
    const nonce = Buffer.from(env.n, 'base64url');
    const shardA = Buffer.from(env.a, 'base64url');
    const shardB = Buffer.from(env.b, 'base64url');
    if (nonce.length < 16 || shardA.length === 0 || shardA.length !== shardB.length || shardA.length > 512) {
      return null;
    }
    const pad = crypto.createHash('sha256').update(nonce).update('orbit-tx-mask-v1').digest();
    const out = Buffer.alloc(shardA.length);
    for (let i = 0; i < shardA.length; i++) {
      const rot = shardB[i] ^ pad[i % pad.length];
      const origByte = shardA[i] ^ rot;
      out[i] = origByte;
    }
    const decoded = out.toString('utf8');
    out.fill(0);
    shardA.fill(0);
    shardB.fill(0);
    return isValidGeminiKeyFormat(decoded) ? decoded.trim() : null;
  } catch {
    return null;
  }
}

export function sealApiKeyMultiLayer(rawApiKey: string, bindingContext = 'orbit-vault'): string {
  const cleanKey = rawApiKey.trim();
  if (!isValidGeminiKeyFormat(cleanKey)) {
    throw new Error('INVALID_KEY_FORMAT');
  }

  const keyBytes = Buffer.from(cleanKey, 'utf8');
  const xorPad = crypto.randomBytes(keyBytes.length);
  const blindedShare = Buffer.alloc(keyBytes.length);
  for (let i = 0; i < keyBytes.length; i++) {
    blindedShare[i] = keyBytes[i] ^ xorPad[i];
  }
  keyBytes.fill(0);

  // Layer 3: Inner AES-256-GCM envelope with per-record salt & HKDF key over split XOR shares
  const innerSalt = crypto.randomBytes(16);
  const innerKey = deriveHkdfKey(innerSalt, `orbit-inner-v3:${bindingContext}`);
  const innerRecord = Buffer.from(
    JSON.stringify({
      v: 3,
      p: xorPad.toString('base64url'),
      x: blindedShare.toString('base64url'),
      m: maskApiKey(cleanKey),
      ts: Date.now(),
    }),
    'utf8'
  );
  xorPad.fill(0);
  blindedShare.fill(0);

  const innerEnc = cipherSeal('aes-256-gcm', innerKey, innerRecord, 'orbit:inner:v3');
  innerKey.fill(0);
  innerRecord.fill(0);

  const packedInner = Buffer.from(
    JSON.stringify({
      v: 3,
      s: innerSalt.toString('base64url'),
      i: innerEnc.iv.toString('base64url'),
      t: innerEnc.tag.toString('base64url'),
      c: innerEnc.ct.toString('base64url'),
    }),
    'utf8'
  );

  // Layer 4: Intermediate ChaCha20-Poly1305 cascade seal
  const midSalt = crypto.randomBytes(16);
  const midKey = deriveHkdfKey(midSalt, `orbit-chacha-v3:${bindingContext}`);
  const midEnc = cipherSeal('chacha20-poly1305', midKey, packedInner, 'orbit:mid:v3');
  midKey.fill(0);
  packedInner.fill(0);

  const packedMid = Buffer.from(
    JSON.stringify({
      v: 3,
      ms: midSalt.toString('base64url'),
      mi: midEnc.iv.toString('base64url'),
      mt: midEnc.tag.toString('base64url'),
      mc: midEnc.ct.toString('base64url'),
    }),
    'utf8'
  );

  // Layer 5: Outer AES-256-GCM transport seal + HMAC-SHA256 commitment tag
  const outerSalt = crypto.randomBytes(16);
  const outerKey = deriveHkdfKey(outerSalt, `orbit-outer-v3:${bindingContext}`);
  const macKey = deriveHkdfKey(outerSalt, `orbit-mac-v3:${bindingContext}`);
  const outerEnc = cipherSeal('aes-256-gcm', outerKey, packedMid, 'orbit:outer:v3');
  const commitment = computeCommitmentMac(macKey, outerEnc.ct);
  outerKey.fill(0);
  macKey.fill(0);
  packedMid.fill(0);

  const envelope = {
    v: 3,
    os: outerSalt.toString('base64url'),
    oi: outerEnc.iv.toString('base64url'),
    ot: outerEnc.tag.toString('base64url'),
    oc: outerEnc.ct.toString('base64url'),
    om: commitment,
  };

  return Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64url');
}

export function unsealApiKeyMultiLayer(
  sealedToken: string,
  bindingContext = 'orbit-vault'
): { apiKey: string; maskedHint: string } | null {
  try {
    if (!sealedToken || sealedToken.length > 6144) return null;
    const outerJson = Buffer.from(sealedToken, 'base64url').toString('utf8');
    const outer = JSON.parse(outerJson) as {
      v?: number;
      os?: string;
      oi?: string;
      ot?: string;
      oc?: string;
      om?: string;
    };
    if (outer.v !== 3 || !outer.os || !outer.oi || !outer.ot || !outer.oc || !outer.om) {
      return null;
    }

    const outerSalt = Buffer.from(outer.os, 'base64url');
    const outerCt = Buffer.from(outer.oc, 'base64url');
    const macKey = deriveHkdfKey(outerSalt, `orbit-mac-v3:${bindingContext}`);
    const expectedMac = computeCommitmentMac(macKey, outerCt);
    macKey.fill(0);

    const actualMacBuf = Buffer.from(outer.om, 'utf8');
    const expectedMacBuf = Buffer.from(expectedMac, 'utf8');
    if (
      actualMacBuf.length !== expectedMacBuf.length ||
      !crypto.timingSafeEqual(actualMacBuf, expectedMacBuf)
    ) {
      return null;
    }

    const outerKey = deriveHkdfKey(outerSalt, `orbit-outer-v3:${bindingContext}`);
    const packedMidBuf = cipherOpen(
      'aes-256-gcm',
      outerKey,
      Buffer.from(outer.oi, 'base64url'),
      Buffer.from(outer.ot, 'base64url'),
      outerCt,
      'orbit:outer:v3'
    );
    outerKey.fill(0);

    const mid = JSON.parse(packedMidBuf.toString('utf8')) as {
      v?: number;
      ms?: string;
      mi?: string;
      mt?: string;
      mc?: string;
    };
    packedMidBuf.fill(0);

    if (mid.v !== 3 || !mid.ms || !mid.mi || !mid.mt || !mid.mc) {
      return null;
    }

    const midSalt = Buffer.from(mid.ms, 'base64url');
    const midKey = deriveHkdfKey(midSalt, `orbit-chacha-v3:${bindingContext}`);
    const packedInnerBuf = cipherOpen(
      'chacha20-poly1305',
      midKey,
      Buffer.from(mid.mi, 'base64url'),
      Buffer.from(mid.mt, 'base64url'),
      Buffer.from(mid.mc, 'base64url'),
      'orbit:mid:v3'
    );
    midKey.fill(0);

    const inner = JSON.parse(packedInnerBuf.toString('utf8')) as {
      v?: number;
      s?: string;
      i?: string;
      t?: string;
      c?: string;
    };
    packedInnerBuf.fill(0);

    if (inner.v !== 3 || !inner.s || !inner.i || !inner.t || !inner.c) {
      return null;
    }

    const innerSalt = Buffer.from(inner.s, 'base64url');
    const innerKey = deriveHkdfKey(innerSalt, `orbit-inner-v3:${bindingContext}`);
    const recordBuf = cipherOpen(
      'aes-256-gcm',
      innerKey,
      Buffer.from(inner.i, 'base64url'),
      Buffer.from(inner.t, 'base64url'),
      Buffer.from(inner.c, 'base64url'),
      'orbit:inner:v3'
    );
    innerKey.fill(0);

    const record = JSON.parse(recordBuf.toString('utf8')) as {
      v?: number;
      p?: string;
      x?: string;
      m?: string;
    };
    recordBuf.fill(0);

    if (record.v !== 3 || !record.p || !record.x) {
      return null;
    }

    const pad = Buffer.from(record.p, 'base64url');
    const share = Buffer.from(record.x, 'base64url');
    if (pad.length === 0 || pad.length !== share.length) {
      return null;
    }
    const keyOut = Buffer.alloc(pad.length);
    for (let i = 0; i < pad.length; i++) {
      keyOut[i] = share[i] ^ pad[i];
    }
    pad.fill(0);
    share.fill(0);

    const apiKey = keyOut.toString('utf8');
    keyOut.fill(0);

    if (!isValidGeminiKeyFormat(apiKey)) {
      return null;
    }
    return {
      apiKey,
      maskedHint: record.m || maskApiKey(apiKey),
    };
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return result;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx <= 0) continue;
    const name = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (!name) continue;
    try {
      result[name] = decodeURIComponent(val);
    } catch {
      result[name] = val;
    }
  }
  return result;
}

export function verifySameOriginRequest(req: Request): boolean {
  const requestedWith = req.get('x-requested-with');
  if (requestedWith === 'OrbitSearch') return true;

  const origin = req.get('origin');
  const host = req.get('x-forwarded-host') || req.get('host');
  if (!origin || !host) return false;
  try {
    const parsedOrigin = new URL(origin);
    return parsedOrigin.host === host;
  } catch {
    return false;
  }
}

function isHttpsRequest(req: Request): boolean {
  if (req.secure) return true;
  const proto = req.get('x-forwarded-proto');
  return typeof proto === 'string' && proto.split(',')[0].trim().toLowerCase() === 'https';
}

export function setSealedVaultCookie(req: Request, res: Response, sealedEnvelope: string): void {
  const maxAgeSec = Math.floor(COOKIE_MAX_AGE_MS / 1000);
  const parts = [
    `${VAULT_COOKIE_NAME}=${encodeURIComponent(sealedEnvelope)}`,
    'Path=/api/ai',
    `Max-Age=${maxAgeSec}`,
    'HttpOnly',
  ];
  if (isHttpsRequest(req)) {
    parts.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.append('Set-Cookie', parts.join('; '));
}

export function clearSealedVaultCookie(req: Request, res: Response): void {
  const parts = [
    `${VAULT_COOKIE_NAME}=`,
    'Path=/api/ai',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'HttpOnly',
  ];
  if (isHttpsRequest(req)) {
    parts.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.append('Set-Cookie', parts.join('; '));
}

export function readVaultFromRequest(req: Request): { apiKey: string; maskedHint: string } | null {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[VAULT_COOKIE_NAME];
  if (!token) return null;
  return unsealApiKeyMultiLayer(token);
}
