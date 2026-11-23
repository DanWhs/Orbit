import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  isValidGeminiKeyFormat,
  maskApiKey,
  parseCookies,
  sealApiKeyMultiLayer,
  unpackClientTransportEnvelope,
  unsealApiKeyMultiLayer,
} from './aiVault';
import { selectGeminiModelAndRole } from './geminiService';

test('Gemini API key validation and masking guard against whitespace, short strings, and leaks', () => {
  assert.equal(isValidGeminiKeyFormat('AIzaSyD1234567890_ValidGeminiKey_99'), true);
  assert.equal(isValidGeminiKeyFormat('short'), false);
  assert.equal(isValidGeminiKeyFormat('AIzaSyD bad whitespace key 12345678'), false);
  assert.equal(isValidGeminiKeyFormat('AIzaSyD"quote_attempt_1234567890'), false);

  assert.equal(maskApiKey('AIzaSyD1234567890_ValidGeminiKey_99'), 'AIzaSy••••y_99');
});

test('5-layer cascade vault (Split-XOR + AES-256-GCM + ChaCha20-Poly1305 + HMAC) seals and detects tampering', () => {
  const sampleKey = 'AIzaSyD_SecretGeminiTestKey_9876543210';
  const sealed1 = sealApiKeyMultiLayer(sampleKey);
  const sealed2 = sealApiKeyMultiLayer(sampleKey);

  assert.notEqual(sealed1, sealed2, 'Fresh per-layer random salts, XOR pads, and IVs must prevent deterministic tokens');
  assert.equal(sealed1.includes('SecretGeminiTestKey'), false, 'Sealed payload must never expose key plaintext');

  const unsealed = unsealApiKeyMultiLayer(sealed1);
  assert.deepEqual(unsealed, {
    apiKey: sampleKey,
    maskedHint: 'AIzaSy••••3210',
  });

  // Tamper one character of the sealed token -> HMAC commitment + AEAD authentication tag must reject
  const tamperedChar = sealed1[14] === 'A' ? 'B' : 'A';
  const tampered = sealed1.slice(0, 14) + tamperedChar + sealed1.slice(15);
  assert.equal(unsealApiKeyMultiLayer(tampered), null);

  // Wrong binding context -> HKDF key mismatch must reject
  assert.equal(unsealApiKeyMultiLayer(sealed1, 'wrong-context'), null);
});

test('obfuscated client transport envelope unpacks split XOR shards cleanly', () => {
  const sampleKey = 'AIzaSyD_TransportSplitTestKey_123456';
  const nonce = crypto.randomBytes(24);
  const pad = crypto.createHash('sha256').update(nonce).update('orbit-tx-mask-v1').digest();
  const keyBytes = Buffer.from(sampleKey, 'utf8');
  const shardA = Buffer.alloc(keyBytes.length);
  const shardB = Buffer.alloc(keyBytes.length);
  const rnd = crypto.randomBytes(keyBytes.length);
  for (let i = 0; i < keyBytes.length; i++) {
    shardA[i] = keyBytes[i] ^ rnd[i];
    shardB[i] = rnd[i] ^ pad[i % pad.length];
  }

  const unpacked = unpackClientTransportEnvelope({
    v: 1,
    n: nonce.toString('base64url'),
    a: shardA.toString('base64url'),
    b: shardB.toString('base64url'),
  });
  assert.equal(unpacked, sampleKey);
  assert.equal(unpackClientTransportEnvelope({ v: 1, n: 'short', a: 'aa', b: 'bb' }), null);
});

test('Gemini model & role selector routes across Carbon, Neon, Hydrogen, and 3.1 Flash Lite', () => {
  assert.equal(selectGeminiModelAndRole({ role: 'reasoning', prompt: 'hello' }).model, 'gemini-4-carbon');
  assert.equal(selectGeminiModelAndRole({ role: 'interactive', prompt: 'hello' }).model, 'gemini-4-neon');
  assert.equal(selectGeminiModelAndRole({ role: 'assistant', prompt: 'hello' }).model, 'gemini-4-hydrogen');
  assert.equal(selectGeminiModelAndRole({ role: 'fast', prompt: 'hello' }).model, 'gemini-3.1-flash-lite');

  assert.equal(
    selectGeminiModelAndRole({ role: 'auto', prompt: 'Analizza l’architettura e i trade-off di sicurezza' }).model,
    'gemini-4-carbon'
  );
  assert.equal(
    selectGeminiModelAndRole({ role: 'auto', prompt: 'Scrivi codice TypeScript per un componente React' }).model,
    'gemini-4-neon'
  );
  assert.equal(
    selectGeminiModelAndRole({ role: 'auto', prompt: 'Cos’è la fotosintesi?' }).model,
    'gemini-3.1-flash-lite'
  );
  assert.equal(
    selectGeminiModelAndRole({ role: 'auto', prompt: 'Raccontami la storia degli anelli di Saturno' }).model,
    'gemini-4-hydrogen'
  );
});

test('cookie parser extracts encoded vault token cleanly', () => {
  const cookies = parseCookies('foo=bar; orbit_ai_vault=abc%3D123; theme=dark');
  assert.equal(cookies.orbit_ai_vault, 'abc=123');
});
