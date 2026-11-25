import assert from 'node:assert/strict';
import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import { normalizeFirebasePrivateKey } from './auth-providers.mjs';

test('environment PEM formatting preserves the RSA key across supported newline and quote encodings', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'der' },
  });
  const variants = [
    privateKey,
    privateKey.replace(/\n/g, '\\n'),
    privateKey.replace(/\n/g, '\\\\n'),
    JSON.stringify(privateKey),
    `'${privateKey.replace(/\n/g, '\\n')}'`,
    privateKey.replace(/\n/g, '\r\n'),
  ];
  for (const value of variants) {
    const normalized = createPrivateKey(normalizeFirebasePrivateKey(value));
    assert.deepEqual(createPublicKey(normalized).export({ type: 'spki', format: 'der' }), publicKey);
  }
});
