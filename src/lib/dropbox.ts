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
      return {
        accessToken: parsed.accessToken || '',
        accountEmail: parsed.accountEmail || '',
        accountName: parsed.accountName || '',
        targetFolder: parsed.targetFolder || DEFAULT_DROPBOX_FOLDER,
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
