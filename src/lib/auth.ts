/**
 * Cryptographic Authentication Helper using native Web Crypto API
 * Never stores plain text passwords. Only SHA-256 hashes are handled.
 */

const SESSION_AUTH_KEY = 'kepub_session_authenticated';
const LOCAL_PASSWORD_HASH_KEY = 'kepub_app_password_hash';
const FAILED_ATTEMPTS_KEY = 'kepub_failed_attempts';
const LOCKOUT_UNTIL_KEY = 'kepub_lockout_until';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds cooldown

/**
 * Computes a SHA-256 hex hash from a plain text string using the browser's native Web Crypto API
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Gets the configured target hash:
 * 1. From environment variable VITE_PASSWORD_HASH (set via GitHub Secrets at build time)
 * 2. Or from localStorage if the user configured a custom password in-app
 */
export function getTargetPasswordHash(): string | null {
  const envHash = import.meta.env.VITE_PASSWORD_HASH;
  if (envHash && typeof envHash === 'string' && envHash.trim() !== '') {
    return envHash.trim().toLowerCase();
  }

  try {
    const localHash = localStorage.getItem(LOCAL_PASSWORD_HASH_KEY);
    if (localHash) return localHash.trim().toLowerCase();
  } catch {
    // localStorage may be disabled
  }

  return null;
}

/**
 * Checks if the application currently has password protection active
 */
export function isPasswordProtectionEnabled(): boolean {
  return getTargetPasswordHash() !== null;
}

/**
 * Checks if the current session is authenticated
 */
export function isSessionAuthenticated(): boolean {
  if (!isPasswordProtectionEnabled()) {
    return true; // No password configured, allow access
  }

  try {
    return sessionStorage.getItem(SESSION_AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Verifies an entered password against the target hash with rate limiting
 */
export async function verifyPassword(password: string): Promise<{ success: boolean; error?: string; lockoutSeconds?: number }> {
  const targetHash = getTargetPasswordHash();
  if (!targetHash) {
    return { success: true };
  }

  // Check rate limiting / brute-force cooldown
  const now = Date.now();
  const lockoutUntil = Number(sessionStorage.getItem(LOCKOUT_UNTIL_KEY) || '0');
  if (now < lockoutUntil) {
    const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
    return {
      success: false,
      error: `Trop de tentatives. Veuillez patienter ${remainingSeconds}s.`,
      lockoutSeconds: remainingSeconds,
    };
  }

  const computedHash = await hashPassword(password);
  if (computedHash === targetHash) {
    // Reset failed attempts on success
    sessionStorage.removeItem(FAILED_ATTEMPTS_KEY);
    sessionStorage.removeItem(LOCKOUT_UNTIL_KEY);
    sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
    return { success: true };
  }

  // Handle failure & rate limit increments
  let attempts = Number(sessionStorage.getItem(FAILED_ATTEMPTS_KEY) || '0') + 1;
  sessionStorage.setItem(FAILED_ATTEMPTS_KEY, String(attempts));

  if (attempts >= MAX_ATTEMPTS) {
    const lockoutTime = now + LOCKOUT_DURATION_MS;
    sessionStorage.setItem(LOCKOUT_UNTIL_KEY, String(lockoutTime));
    sessionStorage.setItem(FAILED_ATTEMPTS_KEY, '0');
    return {
      success: false,
      error: 'Trop de tentatives erronées. Accès bloqué pendant 30 secondes.',
      lockoutSeconds: 30,
    };
  }

  return {
    success: false,
    error: `Mot de passe incorrect (${MAX_ATTEMPTS - attempts} essai${MAX_ATTEMPTS - attempts > 1 ? 's' : ''} restant${MAX_ATTEMPTS - attempts > 1 ? 's' : ''}).`,
  };
}

/**
 * Sets or updates a local password hash
 */
export async function setLocalPassword(password: string): Promise<string> {
  const hash = await hashPassword(password);
  localStorage.setItem(LOCAL_PASSWORD_HASH_KEY, hash);
  sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
  return hash;
}

/**
 * Removes local password protection
 */
export function removeLocalPassword(): void {
  localStorage.removeItem(LOCAL_PASSWORD_HASH_KEY);
  sessionStorage.removeItem(SESSION_AUTH_KEY);
}

/**
 * Locks the current session immediately
 */
export function lockSession(): void {
  sessionStorage.removeItem(SESSION_AUTH_KEY);
}
