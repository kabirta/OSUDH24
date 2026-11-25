import {getApps, initializeApp} from 'firebase/app';
import {browserPopupRedirectResolver, initializeAuth, GoogleAuthProvider, inMemoryPersistence, signInWithPopup, signOut, type Auth} from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function googleError(cause: unknown): Error {
  const code = typeof cause === 'object' && cause !== null && 'code' in cause ? String(cause.code) : '';
  const messages: Record<string, string> = {
    'auth/popup-blocked': 'The Google sign-in window could not open. Click Continue with Google to try again.',
    'auth/popup-closed-by-user': 'The Google sign-in window was closed. You can try again.',
    'auth/cancelled-popup-request': 'Another sign-in window was opened. Close it and try again.',
    'auth/unauthorized-domain': 'Google sign-in is not enabled for this website address yet.',
    'auth/operation-not-allowed': 'Google sign-in has not been enabled for this store yet.',
    'auth/network-request-failed': 'Google sign-in could not connect. Check your connection and try again.',
    'auth/invalid-api-key': 'Google sign-in is not configured correctly yet.',
    'auth/configuration-not-found': 'Google sign-in is not configured correctly yet.',
    'auth/app-not-authorized': 'Google sign-in is not enabled for this app yet.',
    'auth/account-exists-with-different-credential': 'This account uses another sign-in method. Please use that method to continue.',
    'auth/user-disabled': 'This Google sign-in is unavailable. Please contact support.',
    'auth/too-many-requests': 'There have been too many sign-in attempts. Please wait and try again.',
  };
  return new Error(messages[code] || 'Google sign-in could not be completed. Please try again.');
}

let preparedAuth: Auth | undefined;
let preparation: Promise<void> | undefined;
let popupReady = false;

// Firebase Auth 1.13's popup flow loads its event iframe before opening the
// popup. Public getRedirectResult skips this work when no redirect is pending.
// Isolate the SDK-specific warmup here so slow first loads never consume the
// click's transient browser activation. An SDK change fails closed and retries.
async function preparePopupTransport(auth: Auth) {
  const resolver = (auth as Auth & {
    _popupRedirectResolver?: {_initialize?: (auth: Auth) => Promise<unknown>};
  })._popupRedirectResolver;
  if (typeof resolver?._initialize !== 'function') throw new Error('Google sign-in could not be prepared. Please try again.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      resolver._initialize(auth),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Google sign-in took too long to prepare. Please try again.')), 20000);
      }),
    ]);
  } finally {if (timer) clearTimeout(timer);}
}

// Preload when the sign-in dialog opens. Memory-only persistence applies from
// initialization; no persistent Firebase user or token is written to storage.
export function prepareGoogleSignIn(): Promise<void> {
  if (!preparation) preparation = (async () => {
    if (Object.values(config).some(value => !value?.trim())) throw new Error('Google sign-in is not configured yet.');
    if (!preparedAuth) {
      const app = getApps().find(item => item.name === 'osudh24-auth') || initializeApp(config, 'osudh24-auth');
      preparedAuth = initializeAuth(app, {
        persistence: inMemoryPersistence,
        popupRedirectResolver: browserPopupRedirectResolver,
      });
    }
    await preparedAuth.authStateReady();
    await preparePopupTransport(preparedAuth);
    popupReady = true;
  })().catch(cause => {
    preparation = undefined;
    popupReady = false;
    throw googleError(cause);
  });
  return preparation;
}

// Call directly in the click handler after preparation. Do not add an awaited
// import, initialization, or persistence change before signInWithPopup here.
export function googleIdToken(): Promise<string> {
  const auth = preparedAuth;
  if (!auth || !popupReady) return Promise.reject(new Error('Google sign-in is still preparing. Please try again in a moment.'));
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({prompt: 'select_account'});
    return signInWithPopup(auth, provider)
      .then(result => result.user.getIdToken(true))
      .catch(cause => {throw googleError(cause);})
      .finally(() => signOut(auth).catch(() => undefined));
  } catch (cause) {
    return signOut(auth).catch(() => undefined).then(() => {throw googleError(cause);});
  }
}
