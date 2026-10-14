import type { DropboxConfig } from '../types/epub';

const STORAGE_KEY = 'kepubify_dropbox_config';

export const DEFAULT_DROPBOX_FOLDER = '/Applications/Rakuten Kobo';

/**
 * Detects if app is running on static hosting (like GitHub Pages) where no backend proxy exists
 */
function isStaticHosting(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.endsWith('github.io') || host.endsWith('pages.dev') || host.endsWith('netlify.app');
}

/**
 * Checks which Kobo folder already exists in the user's Dropbox account
 */
export async function detectExistingKoboFolder(token: string): Promise<string | null> {
  const candidateFolders = [
    '/Applications/Rakuten Kobo',
    '/Apps/Rakuten Kobo',
    '/Rakuten Kobo',
  ];

  for (const folder of candidateFolders) {
    try {
      if (isStaticHosting()) {
        const res = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: folder }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data['.tag'] === 'folder') return folder;
        }
      } else {
        let res = await fetch('/api/dropbox/metadata', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: folder }),
        });

        if (res.status === 404) {
          res = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token.trim()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ path: folder }),
          });
        }

        if (res.ok) {
          const data = await res.json();
          if (data['.tag'] === 'folder') return folder;
        }
      }
    } catch {
      // Continue search
    }
  }

  return null;
}

export function getSavedDropboxConfig(): DropboxConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      let targetFolder = parsed.targetFolder || DEFAULT_DROPBOX_FOLDER;
      // Auto-migrate legacy default to the official French Kobo directory
      if (targetFolder === '/Rakuten Kobo') {
        targetFolder = '/Applications/Rakuten Kobo';
      }
      return {
        accessToken: parsed.accessToken || '',
        refreshToken: parsed.refreshToken || undefined,
        clientId: parsed.clientId || undefined,
        expiresAt: parsed.expiresAt ? Number(parsed.expiresAt) : undefined,
        accountEmail: parsed.accountEmail || '',
        accountName: parsed.accountName || '',
        targetFolder,
        isConnected: Boolean(parsed.accessToken),
      };
    }
  } catch (err) {
    console.error('Failed to load dropbox config', err);
  }

  return {
    accessToken: '',
    targetFolder: DEFAULT_DROPBOX_FOLDER,
    isConnected: false,
  };
}

export function saveDropboxConfig(config: DropboxConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save dropbox config', err);
  }
}

export function clearDropboxConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear dropbox config', err);
  }
}

const PKCE_VERIFIER_KEY = 'kepub_pkce_code_verifier';
const PKCE_CLIENT_ID_KEY = 'kepub_pkce_client_id';
const PKCE_REDIRECT_URI_KEY = 'kepub_pkce_redirect_uri';
const PKCE_TARGET_FOLDER_KEY = 'kepub_pkce_target_folder';

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function generateCodeVerifier(): string {
  const array = new Uint8Array(48);
  crypto.getRandomValues(array);
  return base64UrlEncode(array.buffer);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
}

export function getOAuthRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  return url.toString();
}

/**
 * Initiates the Dropbox OAuth 2.0 PKCE flow (requests offline access for permanent refresh_token)
 */
export async function startDropboxOAuth(clientId: string, targetFolder?: string): Promise<void> {
  const cleanClientId = clientId.trim();
  if (!cleanClientId) {
    throw new Error('Veuillez renseigner votre App Key Dropbox.');
  }

  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = getOAuthRedirectUri();

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(PKCE_CLIENT_ID_KEY, cleanClientId);
  sessionStorage.setItem(PKCE_REDIRECT_URI_KEY, redirectUri);
  if (targetFolder) {
    sessionStorage.setItem(PKCE_TARGET_FOLDER_KEY, targetFolder);
  }

  const authUrl = new URL('https://www.dropbox.com/oauth2/authorize');
  authUrl.searchParams.set('client_id', cleanClientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('token_access_type', 'offline');
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('redirect_uri', redirectUri);

  window.location.href = authUrl.toString();
}

/**
 * Checks for OAuth 2.0 PKCE redirect callback on app load and completes authentication
 */
export async function handleDropboxOAuthCallback(): Promise<DropboxConfig | null> {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error_description') || params.get('error');

  if (error) {
    const cleanUrl = getOAuthRedirectUri();
    window.history.replaceState({}, document.title, cleanUrl || window.location.pathname);
    throw new Error(`Autorisation Dropbox refusée : ${error}`);
  }

  if (!code) return null;

  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  const clientId = sessionStorage.getItem(PKCE_CLIENT_ID_KEY);
  const redirectUri = sessionStorage.getItem(PKCE_REDIRECT_URI_KEY) || getOAuthRedirectUri();
  const savedFolder = sessionStorage.getItem(PKCE_TARGET_FOLDER_KEY);

  if (!verifier || !clientId) {
    return null;
  }

  // Clear PKCE state from session
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(PKCE_CLIENT_ID_KEY);
  sessionStorage.removeItem(PKCE_REDIRECT_URI_KEY);
  sessionStorage.removeItem(PKCE_TARGET_FOLDER_KEY);

  // Clean URL immediately
  window.history.replaceState({}, document.title, redirectUri || window.location.pathname);

  // Exchange code for tokens
  const bodyParams = new URLSearchParams({
    code: code,
    grant_type: 'authorization_code',
    client_id: clientId,
    code_verifier: verifier,
    redirect_uri: redirectUri,
  });

  let tokenResponse: any;
  if (isStaticHosting()) {
    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Échec de l'obtention des jetons Dropbox (${res.status}): ${err}`);
    }
    tokenResponse = await res.json();
  } else {
    try {
      const res = await fetch('/api/dropbox/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(Object.fromEntries(bodyParams)),
      });
      if (res.ok) {
        tokenResponse = await res.json();
      } else {
        throw new Error(`Proxy token status ${res.status}`);
      }
    } catch {
      const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Échec OAuth Dropbox (${res.status}): ${err}`);
      }
      tokenResponse = await res.json();
    }
  }

  const accessToken = tokenResponse.access_token;
  const refreshToken = tokenResponse.refresh_token;
  const expiresIn = tokenResponse.expires_in || 14400; // in seconds
  const expiresAt = Date.now() + (expiresIn * 1000);

  // Retrieve account details
  const account = await verifyDropboxToken(accessToken);

  // Target folder preference
  let targetFolder = savedFolder || DEFAULT_DROPBOX_FOLDER;
  if (!savedFolder) {
    try {
      const detected = await detectExistingKoboFolder(accessToken);
      if (detected) targetFolder = detected;
    } catch {
      // ignore
    }
  }

  const newConfig: DropboxConfig = {
    accessToken,
    refreshToken,
    clientId,
    expiresAt,
    accountEmail: account.email,
    accountName: account.name,
    targetFolder,
    isConnected: true,
  };

  saveDropboxConfig(newConfig);
  return newConfig;
}

/**
 * Ensures the accessToken in config is valid, refreshing it via refreshToken if expired
 */
export async function getValidAccessToken(config?: DropboxConfig): Promise<string> {
  const currentConfig = config || getSavedDropboxConfig();
  if (!currentConfig.isConnected || !currentConfig.accessToken) {
    return '';
  }

  const now = Date.now();
  // If no refresh token or not yet expired (with 5 min safety margin), return current token
  if (!currentConfig.refreshToken || !currentConfig.clientId || (currentConfig.expiresAt && now < currentConfig.expiresAt - 5 * 60 * 1000)) {
    return currentConfig.accessToken;
  }

  // Refresh token required
  const bodyParams = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: currentConfig.refreshToken,
    client_id: currentConfig.clientId,
  });

  try {
    let res: Response;
    if (isStaticHosting()) {
      res = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bodyParams.toString(),
      });
    } else {
      res = await fetch('/api/dropbox/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(bodyParams)),
      });
      if (!res.ok && res.status === 404) {
        res = await fetch('https://api.dropboxapi.com/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: bodyParams.toString(),
        });
      }
    }

    if (res.ok) {
      const data = await res.json();
      const newAccessToken = data.access_token;
      const expiresIn = data.expires_in || 14400;
      const updatedConfig: DropboxConfig = {
        ...currentConfig,
        accessToken: newAccessToken,
        expiresAt: Date.now() + (expiresIn * 1000),
      };
      saveDropboxConfig(updatedConfig);
      return newAccessToken;
    }
  } catch (err) {
    console.warn('Automatic token refresh failed, falling back to current token:', err);
  }

  return currentConfig.accessToken;
}


export interface DropboxAccountInfo {
  name: string;
  email: string;
  profilePhoto?: string;
  spaceUsed?: number;
  spaceTotal?: number;
}

/**
 * Validate token and retrieve user details from Dropbox API
 */
export async function verifyDropboxToken(token: string): Promise<DropboxAccountInfo> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error('Le token Dropbox est vide.');
  }

  // 1. Get user profile
  const userRes = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cleanToken}`,
    },
  });

  if (!userRes.ok) {
    let errorDetail = 'Jeton d\'accès invalide ou expiré.';
    try {
      const errJson = await userRes.json();
      if (errJson.error_summary) {
        errorDetail = `Erreur Dropbox : ${errJson.error_summary}`;
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  const userData = await userRes.json();
  const name = userData.name?.display_name || 'Utilisateur Dropbox';
  const email = userData.email || '';
  const profilePhoto = userData.profile_photo_url;

  // 2. Get space usage (optional)
  let spaceUsed: number | undefined;
  let spaceTotal: number | undefined;
  try {
    const spaceRes = await fetch('https://api.dropboxapi.com/2/users/get_space_usage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
      },
    });
    if (spaceRes.ok) {
      const spaceData = await spaceRes.json();
      spaceUsed = spaceData.used;
      if (spaceData.allocation?.['.tag'] === 'individual') {
        spaceTotal = spaceData.allocation.allocated;
      }
    }
  } catch {
    // Space info is non-blocking
  }

  return {
    name,
    email,
    profilePhoto,
    spaceUsed,
    spaceTotal,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export interface UploadResult {
  path: string;
  name: string;
  size: number;
}

/**
 * Escapes non-ASCII characters to \uXXXX for Dropbox-API-Arg HTTP header compliance
 */
function escapeDropboxArg(obj: unknown): string {
  return JSON.stringify(obj).replace(/[\u007f-\uffff]/g, (c) => {
    return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
  });
}

/**
 * Parses Dropbox JSON error responses to human-readable actionable messages
 */
function parseDropboxError(errData: any, status: number): string {
  if (!errData) return `Erreur HTTP ${status} lors du transfert vers Dropbox.`;

  const summary = errData.error_summary || '';
  const errorObj = errData.error || {};

  // Missing write scope (files.content.write)
  if (summary.includes('missing_scope') || errorObj['.tag'] === 'missing_scope') {
    return 'Permission manquante : votre jeton Dropbox doit posséder la permission "files.content.write" (à cocher dans l\'onglet Permissions de Dropbox App Console).';
  }

  // Invalid token
  if (summary.includes('invalid_access_token') || errorObj['.tag'] === 'invalid_access_token') {
    return 'Jeton d\'accès Dropbox expiré ou invalide. Veuillez générer un nouveau jeton dans les paramètres de votre application Dropbox.';
  }

  // Generic "other" auth error
  if (summary.startsWith('other') || errorObj['.tag'] === 'other') {
    return 'Autorisation Dropbox refusée (other). Cause fréquente : dans la console Dropbox Developers (developers.dropbox.com), après avoir coché "files.content.write" dans l\'onglet Permissions, vous devez impérativement retourner dans l\'onglet "Settings" et cliquer à nouveau sur "Generate" pour régénérer un NOUVEAU jeton (les jetons créés avant d\'activer la permission ne la possèdent pas).';
  }

  // Path errors
  if (summary.includes('path') || errorObj['.tag'] === 'path') {
    const pathTag = errorObj.path?.['.tag'] || '';
    if (pathTag === 'not_found' || summary.includes('not_found')) {
      return `Dossier introuvable sur Dropbox. Vérifiez le chemin ou utilisez "/" pour la racine.`;
    }
    if (pathTag === 'conflict' || summary.includes('conflict')) {
      return `Conflit de nom sur Dropbox : un fichier ou dossier porte déjà ce nom.`;
    }
    if (pathTag === 'disallowed_name' || summary.includes('disallowed_name')) {
      return `Nom de fichier ou de dossier non autorisé par Dropbox.`;
    }
    if (pathTag === 'other' || summary.includes('path/other')) {
      return `Chemin Dropbox non valide ou inaccessible (path/other). Si votre application Dropbox est de type "App folder", vous ne pouvez écrire que dans son dossier racine (/), pas dans /Rakuten Kobo global. Réglez le dossier sur "/" dans les paramètres Dropbox.`;
    }
  }

  return `Erreur Dropbox : ${summary || JSON.stringify(errData)}`;
}

/**
 * Attempts to create the destination folder on Dropbox if it does not exist
 */
async function ensureFolderExists(token: string, folder: string): Promise<void> {
  const clean = folder.trim().replace(/\/+$/, '');
  if (!clean || clean === '/' || clean === '') return;

  const normalized = clean.startsWith('/') ? clean : `/${clean}`;

  try {
    if (isStaticHosting()) {
      await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: normalized,
          autorename: false,
        }),
      });
    } else {
      let res = await fetch('/api/dropbox/create_folder', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: normalized,
          autorename: false,
        }),
      });

      if (res.status === 404) {
        await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: normalized,
            autorename: false,
          }),
        });
      }
    }
  } catch (err) {
    // Ignore folder creation errors (folder might already exist)
    console.debug('Folder creation check:', err);
  }
}

/**
 * Upload a file to Dropbox in the specified folder.
 * Seamlessly handles both GitHub Pages (direct API) and local dev (proxy).
 */
export async function uploadFileToDropbox(
  token: string,
  folder: string,
  fileName: string,
  fileBlob: Blob,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const cleanFolder = folder.trim().replace(/\/+$/, '');
  const normalizedFolder = cleanFolder === '' || cleanFolder === '/' ? '' : (cleanFolder.startsWith('/') ? cleanFolder : `/${cleanFolder}`);
  const sanitizedFileName = fileName.trim().replace(/[/\\?%*:|"<>]/g, '-');
  const fullPath = `${normalizedFolder}/${sanitizedFileName}`;

  // Ensure target folder exists if not root
  if (normalizedFolder) {
    await ensureFolderExists(token, normalizedFolder);
  }

  // Dropbox upload API parameter header (properly escaped to pure ASCII)
  const apiArgs = escapeDropboxArg({
    path: fullPath,
    mode: 'overwrite',
    autorename: true,
    mute: false,
  });

  onProgress?.(15);

  // Direct upload to Dropbox using fetch (standard, reliable for browser on GitHub Pages)
  const uploadDirect = async (): Promise<UploadResult> => {
    onProgress?.(35);
    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Dropbox-API-Arg': apiArgs,
        'Content-Type': 'application/octet-stream',
      },
      body: fileBlob,
    });

    onProgress?.(85);

    if (response.ok) {
      const data = await response.json();
      onProgress?.(100);
      return {
        path: data.path_display || fullPath,
        name: data.name || fileName,
        size: data.size || fileBlob.size,
      };
    }

    let errData: any = null;
    try {
      errData = await response.json();
    } catch {
      // ignore
    }
    const msg = parseDropboxError(errData, response.status);
    throw new Error(msg);
  };

  // Upload via backend proxy (only when in dev server)
  const uploadProxy = async (): Promise<UploadResult> => {
    onProgress?.(25);
    const arrayBuffer = await fileBlob.arrayBuffer();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/dropbox/upload', true);
      xhr.setRequestHeader('Authorization', `Bearer ${token.trim()}`);
      xhr.setRequestHeader('Dropbox-API-Arg', apiArgs);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(25 + Math.round((event.loaded / event.total) * 70), 95);
          onProgress?.(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const resp = JSON.parse(xhr.responseText);
            onProgress?.(100);
            resolve({
              path: resp.path_display || fullPath,
              name: resp.name || fileName,
              size: resp.size || fileBlob.size,
            });
          } catch {
            resolve({
              path: fullPath,
              name: fileName,
              size: fileBlob.size,
            });
          }
        } else {
          let errData: any = null;
          try {
            errData = JSON.parse(xhr.responseText);
          } catch {
            // ignore
          }
          const msg = parseDropboxError(errData, xhr.status);
          reject(new Error(msg));
        }
      };

      xhr.onerror = () => {
        reject(new Error(`Échec réseau (${xhr.status || 'connexion'}).`));
      };

      xhr.send(arrayBuffer);
    });
  };

  // On GitHub Pages or static hosts, go directly to Dropbox
  if (isStaticHosting()) {
    return await uploadDirect();
  }

  // Otherwise try dev proxy first, fallback to direct upload
  try {
    return await uploadProxy();
  } catch (proxyError) {
    console.warn('Proxy upload failed, using direct upload fallback...', proxyError);
    return await uploadDirect();
  }
}
