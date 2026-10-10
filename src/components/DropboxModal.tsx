import React, { useState } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Folder,
  Key,
  LogOut,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import type { DropboxConfig } from '../types/epub';
import {
  verifyDropboxToken,
  saveDropboxConfig,
  clearDropboxConfig,
  DEFAULT_DROPBOX_FOLDER,
  formatBytes,
  detectExistingKoboFolder,
} from '../lib/dropbox';

interface DropboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DropboxConfig;
  onConfigChange: (newConfig: DropboxConfig) => void;
}

export const DropboxModal: React.FC<DropboxModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigChange,
}) => {
  const [tokenInput, setTokenInput] = useState(config.accessToken || '');
  const [folderInput, setFolderInput] = useState(config.targetFolder || DEFAULT_DROPBOX_FOLDER);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  if (!isOpen) return null;

  const handleAutoDetect = async () => {
    const token = (config.accessToken || tokenInput).trim();
    if (!token) {
      setErrorMsg('Veuillez d\'abord saisir ou connecter votre jeton Dropbox.');
      return;
    }

    setIsDetecting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const detected = await detectExistingKoboFolder(token);
      if (detected) {
        setFolderInput(detected);
        if (config.isConnected) {
          const updated = { ...config, targetFolder: detected };
          saveDropboxConfig(updated);
          onConfigChange(updated);
        }
        setSuccessMsg(`Dossier Kobo détecté avec succès : ${detected}`);
      } else {
        setFolderInput('/Applications/Rakuten Kobo');
        setSuccessMsg('Dossier réglé sur /Applications/Rakuten Kobo (dossier standard)');
      }
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setFolderInput('/Applications/Rakuten Kobo');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setErrorMsg('Veuillez saisir votre jeton d’accès Dropbox.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const accountInfo = await verifyDropboxToken(tokenInput.trim());

      // Auto-detect existing Kobo folder if user still has the generic default
      let targetFolderToUse = folderInput.trim();
      try {
        const detected = await detectExistingKoboFolder(tokenInput.trim());
        if (detected) {
          targetFolderToUse = detected;
          setFolderInput(detected);
        }
      } catch {
        // non-blocking
      }

      const newConfig: DropboxConfig = {
        accessToken: tokenInput.trim(),
        accountEmail: accountInfo.email,
        accountName: accountInfo.name,
        targetFolder: targetFolderToUse || DEFAULT_DROPBOX_FOLDER,
        isConnected: true,
      };

      saveDropboxConfig(newConfig);
      onConfigChange(newConfig);
      setSuccessMsg(`Connecté avec succès en tant que ${accountInfo.name} (${accountInfo.email})`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion';
      setErrorMsg(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisconnect = () => {
    clearDropboxConfig();
    const emptyConfig: DropboxConfig = {
      accessToken: '',
      targetFolder: DEFAULT_DROPBOX_FOLDER,
      isConnected: false,
    };
    setTokenInput('');
    setSuccessMsg(null);
    setErrorMsg(null);
    onConfigChange(emptyConfig);
  };

  const handleUpdateFolder = () => {
    const newConfig: DropboxConfig = {
      ...config,
      targetFolder: folderInput.trim() || DEFAULT_DROPBOX_FOLDER,
    };
    saveDropboxConfig(newConfig);
    onConfigChange(newConfig);
    setSuccessMsg('Dossier cible mis à jour !');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-stone-900 text-base">
              Synchronisation Dropbox & Kobo
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Kobo sync explanation callout */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-950 space-y-1.5 leading-relaxed">
            <div className="font-semibold flex items-center gap-1.5 text-amber-900">
              <BookOpen className="w-3.5 h-3.5 text-amber-700" />
              <span>Comment fonctionne la synchronisation Kobo ?</span>
            </div>
            <p>
              Sur les liseuses Kobo compatibles (Forma, Sage, Elipsa, Clara Colour, Libra Colour, etc.), activez la liaison Dropbox dans les paramètres de la liseuse.
              Kobo synchronise automatiquement le dossier <strong className="font-mono bg-amber-100/60 px-1 py-0.5 rounded text-amber-900">/Rakuten Kobo</strong> dès que vous êtes connecté en Wi-Fi.
            </p>
          </div>

          {config.isConnected ? (
            /* Connected state */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Compte Dropbox connecté</span>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Déconnecter</span>
                  </button>
                </div>
                <div className="text-xs text-stone-700 space-y-0.5 pt-1">
                  <p>
                    Utilisateur : <strong className="text-stone-900">{config.accountName}</strong>
                  </p>
                  <p>
                    Email : <span className="font-mono text-stone-600">{config.accountEmail}</span>
                  </p>
                </div>
              </div>

              {/* Target folder setting */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-stone-700">
                    Dossier de destination Dropbox
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoDetect}
                    disabled={isDetecting}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isDetecting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Folder className="w-3 h-3" />
                    )}
                    <span>{isDetecting ? 'Détection...' : '🔍 Détecter mon dossier Kobo'}</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <Folder className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={folderInput}
                      onChange={(e) => setFolderInput(e.target.value)}
                      placeholder="/Applications/Rakuten Kobo"
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                    />
                  </div>
                  <button
                    onClick={handleUpdateFolder}
                    className="px-3.5 py-2 bg-stone-900 text-stone-50 rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    Enregistrer
                  </button>
                </div>

                {/* Quick folder presets */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] text-stone-500 font-medium">
                    Sélection rapide selon votre configuration Kobo :
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFolderInput('/Applications/Rakuten Kobo');
                        const updated = { ...config, targetFolder: '/Applications/Rakuten Kobo' };
                        saveDropboxConfig(updated);
                        onConfigChange(updated);
                        setSuccessMsg('Dossier réglé sur /Applications/Rakuten Kobo');
                        setTimeout(() => setSuccessMsg(null), 3000);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        folderInput === '/Applications/Rakuten Kobo'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      📁 /Applications/Rakuten Kobo (FR)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFolderInput('/Apps/Rakuten Kobo');
                        const updated = { ...config, targetFolder: '/Apps/Rakuten Kobo' };
                        saveDropboxConfig(updated);
                        onConfigChange(updated);
                        setSuccessMsg('Dossier réglé sur /Apps/Rakuten Kobo');
                        setTimeout(() => setSuccessMsg(null), 3000);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        folderInput === '/Apps/Rakuten Kobo'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      📁 /Apps/Rakuten Kobo (EN)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFolderInput('/Rakuten Kobo');
                        const updated = { ...config, targetFolder: '/Rakuten Kobo' };
                        saveDropboxConfig(updated);
                        onConfigChange(updated);
                        setSuccessMsg('Dossier réglé sur /Rakuten Kobo');
                        setTimeout(() => setSuccessMsg(null), 3000);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        folderInput === '/Rakuten Kobo'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      📁 /Rakuten Kobo
                    </button>
                  </div>
                </div>
              </div>

              {/* Token renewal guide if user has error */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-950">
                <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>En cas d'erreur « other » lors de l'envoi :</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Dans la console Dropbox (<a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noreferrer" className="underline font-medium">developers.dropbox.com</a>) :
                  assurez-vous d'avoir coché <strong>files.content.write</strong> dans l'onglet <em>Permissions</em>, <strong>PUIS</strong> retournez dans l'onglet <em>Settings</em> pour régénérer un nouveau jeton (bouton <em>Generate</em>). Un jeton créé avant de cocher la permission ne permet pas l'écriture.
                </p>
                <div className="pt-1">
                  <button
                    onClick={handleDisconnect}
                    className="text-xs font-semibold text-stone-900 underline hover:text-stone-700 cursor-pointer"
                  >
                    Changer de jeton d'accès &rarr;
                  </button>
                </div>
              </div>

              {successMsg && (
                <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>
          ) : (
            /* Connection form */
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-stone-700">
                    Jeton d'accès personnel Dropbox (Access Token)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTokenHelp(!showTokenHelp)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Comment l'obtenir ?</span>
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="sl.u.AF9..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                  />
                </div>
              </div>

              {/* Target folder setting */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-stone-700">
                    Dossier de synchronisation
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoDetect}
                    disabled={isDetecting}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {isDetecting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Folder className="w-3 h-3" />
                    )}
                    <span>{isDetecting ? 'Détection...' : '🔍 Détecter'}</span>
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Folder className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={folderInput}
                    onChange={(e) => setFolderInput(e.target.value)}
                    placeholder="/Applications/Rakuten Kobo"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                  />
                </div>
                <div className="flex flex-wrap gap-1 pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFolderInput('/Applications/Rakuten Kobo')}
                    className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-mono text-[10px] cursor-pointer"
                  >
                    /Applications/Rakuten Kobo
                  </button>
                  <button
                    type="button"
                    onClick={() => setFolderInput('/Apps/Rakuten Kobo')}
                    className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-mono text-[10px] cursor-pointer"
                  >
                    /Apps/Rakuten Kobo
                  </button>
                  <button
                    type="button"
                    onClick={() => setFolderInput('/Rakuten Kobo')}
                    className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-mono text-[10px] cursor-pointer"
                  >
                    /Rakuten Kobo
                  </button>
                </div>
              </div>

              {/* Token guide help accordion */}
              {showTokenHelp && (
                <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-xs text-stone-600">
                  <div className="font-semibold text-stone-900">
                    Comment obtenir un jeton en 3 étapes :
                  </div>
                  <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                    <li>
                      Rendez-vous sur{' '}
                      <a
                        href="https://www.dropbox.com/developers/apps"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline font-medium inline-flex items-center gap-0.5"
                      >
                        Dropbox App Console <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      .
                    </li>
                    <li>
                      Cliquez sur <strong>"Create app"</strong> &rarr; Scoped access &rarr; Full Dropbox (ou App folder). Nommez votre application (ex: <em>KoboSync-MonNom</em>).
                    </li>
                    <li>
                      Dans l'onglet <strong>Permissions</strong>, cochez <span className="font-mono bg-stone-200 px-1 py-0.5 rounded">files.content.write</span> et <span className="font-mono bg-stone-200 px-1 py-0.5 rounded">account_info.read</span>. (Puis cliquez sur <em>Submit</em> en bas si demandé).
                    </li>
                    <li>
                      <strong>Seulement ensuite</strong>, retournez dans l'onglet <strong>Settings</strong>, et sous <em>OAuth 2</em> cliquez sur <strong>"Generate"</strong> sous <em>Generated access token</em>. Copiez et collez-le ici ! <em>(Si vous générez le jeton avant d'avoir validé les permissions, Dropbox refusera l'écriture avec l'erreur "other").</em>
                    </li>
                  </ol>
                </div>
              )}

              {errorMsg && (
                <div className="text-xs text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-stone-900 text-stone-50 text-xs font-semibold rounded-lg hover:bg-stone-800 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Vérification de l'accès Dropbox...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    <span>Enregistrer et lier mon Dropbox</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex justify-end rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
