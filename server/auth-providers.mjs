import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { HttpError } from './errors.mjs';
import { normalizeMobile } from './phone.mjs';

export function normalizeFirebasePrivateKey(value) {
  if (typeof value !== 'string') throw new TypeError('Firebase private key must be configured.');
  let key = value.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    try { const decoded = JSON.parse(key); key = typeof decoded === 'string' ? decoded : key; }
    catch { key = key.slice(1, -1); }
  }
  return key.replace(/\\+r\\+n/g, '\n').replace(/\\+n/g, '\n').replace(/\r\n/g, '\n').trim() + '\n';
}

function safeInitializationCode(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  return /^(?:(?:app|auth)\/[a-z-]+|ERR_[A-Z0-9_]+|ENOENT|EACCES)$/.test(code) ? code : 'unknown';
}

function privateKeyShape(value) {
  if (typeof value !== 'string') return { present: false };
  return {
    present: true,
    format: value.includes('-----BEGIN RSA PRIVATE KEY-----') ? 'pkcs1' : value.includes('-----BEGIN PRIVATE KEY-----') ? 'pkcs8' : 'unrecognized',
    escapedNewlines: /\\+n/.test(value),
    actualNewlines: value.includes('\n'),
    wrappedInQuotes: /^["']/.test(value.trim()),
  };
}

// This module never inspects unsigned token claims or implements a local OTP.
// Tests inject provider functions into createApp; no environment flag enables a bypass.
export function createAuthProviders({ env = process.env, fetchImpl = fetch } = {}) {
  const explicitFirebase = !!(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
  const credentialFile = env.GOOGLE_APPLICATION_CREDENTIALS;
  const googleConfigured = explicitFirebase || !!credentialFile;
  const mobileConfigured = !!(env.MSG91_AUTH_KEY && env.MSG91_TEMPLATE_ID);
  const widgetConfigured = !!(env.MSG91_AUTH_KEY && env.VITE_MSG91_WIDGET_ID && env.VITE_MSG91_TOKEN_AUTH);
  let firebaseAuth;

  async function getFirebaseAuth() {
    if (env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      throw new HttpError(503, 'Google sign-in requires live Firebase verification.');
    }
    if (!firebaseAuth) firebaseAuth = (async () => {
      let stage = 'load-admin-sdk';
      let keyShape = { present: false };
      try {
        const [{ initializeApp, cert }, { getAuth }] = await Promise.all([
          import('firebase-admin/app'), import('firebase-admin/auth'),
        ]);
        stage = 'load-credential';
        const account = explicitFirebase ? {
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY,
        } : JSON.parse(await readFile(credentialFile, 'utf8'));
        const keyField = Object.hasOwn(account, 'private_key') ? 'private_key' : 'privateKey';
        keyShape = privateKeyShape(account[keyField]);
        stage = 'normalize-private-key';
        account[keyField] = normalizeFirebasePrivateKey(account[keyField]);
        stage = 'create-credential';
        const credential = cert(account);
        stage = 'initialize-admin-app';
        const app = initializeApp({
          credential,
          ...(env.FIREBASE_PROJECT_ID ? { projectId: env.FIREBASE_PROJECT_ID } : {}),
        }, `osudh24-${randomUUID()}`);
        stage = 'create-auth-client';
        return getAuth(app);
      } catch (error) {
        console.error('Firebase Admin initialization failed', {
          stage, code: safeInitializationCode(error),
          credentialSource: explicitFirebase ? 'environment' : 'file', privateKey: keyShape,
        });
        firebaseAuth = undefined;
        throw new HttpError(503, 'Google sign-in is not configured correctly. Please contact the store owner.');
      }
    })();
    return firebaseAuth;
  }

  async function msg91(path, { mobile, otp, send = false }) {
    const url = new URL(`https://control.msg91.com/api/v5/${path}`);
    url.searchParams.set('mobile', mobile);
    if (send) {
      url.searchParams.set('template_id', env.MSG91_TEMPLATE_ID);
      url.searchParams.set('otp_length', '6');
      url.searchParams.set('otp_expiry', '5');
    } else url.searchParams.set('otp', otp);
    try {
      const response = await fetchImpl(url, {
        method: send ? 'POST' : 'GET',
        headers: { authkey: env.MSG91_AUTH_KEY, ...(send ? { 'Content-Type': 'application/json' } : {}) },
        ...(send ? { body: '{}' } : {}),
        signal: AbortSignal.timeout(10_000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error('provider unavailable');
      if (result?.type !== 'success') {
        if (!send) return false;
        throw new Error('provider rejected send');
      }
      return true;
    } catch {
      throw new HttpError(502, 'The SMS service could not complete this request. Please try again later.');
    }
  }

  async function verifyWidget(accessToken) {
    try {
      const response = await fetchImpl('https://api.msg91.com/api/v5/widget/verifyAccessToken', {
        method: 'POST',
        headers: { authkey: env.MSG91_AUTH_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'access-token': accessToken }),
        signal: AbortSignal.timeout(10_000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error('provider unavailable');
      if (result?.type !== 'success') throw new HttpError(401, 'Mobile verification is invalid or has already been used. Please verify again.');
      try { return normalizeMobile(result.message); }
      catch { throw new HttpError(401, 'Mobile verification did not confirm a valid Indian mobile number. Please verify again.'); }
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(502, 'The mobile verification service could not complete this request. Please try again later.');
    }
  }

  return {
    google: googleConfigured ? {
      async verifyIdToken(idToken) {
        const auth = await getFirebaseAuth();
        let timer;
        try {
          return await Promise.race([
            auth.verifyIdToken(idToken, true),
            new Promise((_, reject) => {
              timer = setTimeout(() => reject(new HttpError(503, 'Google sign-in is temporarily unavailable. Please try again.')), 10_000);
              timer.unref?.();
            }),
          ]);
        } catch (error) {
          if (error instanceof HttpError) throw error;
          if (typeof error?.code === 'string' && error.code.startsWith('auth/')) throw new HttpError(401, 'Google could not verify this sign-in. Please sign in again.');
          throw new HttpError(503, 'Google sign-in is temporarily unavailable. Please try again.');
        } finally { clearTimeout(timer); }
      },
    } : null,
    mobile: mobileConfigured ? {
      sendOtp: mobile => msg91('otp', { mobile, send: true }),
      verifyOtp: (mobile, otp) => msg91('otp/verify', { mobile, otp }),
    } : null,
    widget: widgetConfigured ? { verifyAccessToken: verifyWidget } : null,
  };
}
