import React, { useState, useEffect } from 'react';
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
  BookOpen,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import type { DropboxConfig } from '../types/epub';
import {
  verifyDropboxToken,
  saveDropboxConfig,
  clearDropboxConfig,
  DEFAULT_DROPBOX_FOLDER,
  detectExistingKoboFolder,
  getOAuthRedirectUri,
  startDropboxOAuth,
} from '../lib/dropbox';

interface DropboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DropboxConfig;
  onConfigChange: (newConfig: DropboxConfig) => void;
}

const CLIENT_ID_STORAGE_KEY = 'kepub_saved_client_id';

export const DropboxModal: React.FC<DropboxModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigChange,
}) => {
  const [activeTab, setActiveTab] = useState<'permanent' | 'manual'>('permanent');
  const [tokenInput, setTokenInput] = useState(config.accessToken || '');
  const [clientIdInput, setClientIdInput] = useState(
    config.clientId || (typeof localStorage !== 'undefined' ? localStorage.getItem(CLIENT_ID_STORAGE_KEY) || '' : '')
  );
  const [folderInput, setFolderInput] = useState(config.targetFolder || DEFAULT_DROPBOX_FOLDER);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);
  const [showAppKeyHelp, setShowAppKeyHelp] = useState(false);
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  const redirectUri = getOAuthRedirectUri();

  useEffect(() => {
    if (config.targetFolder) {
      setFolderInput(config.targetFolder);
    }
  }, [config.targetFolder]);

  if (!isOpen) return null;

  const handleCopyRedirectUri = async () => {
    if (!redirectUri) return;
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopiedRedirectUri(true);
      setTimeout(() => setCopiedRedirectUri(false), 2500);
    } catch {
      // Fallback
      setCopiedRedirectUri(true);
      setTimeout(() => setCopiedRedirectUri(false), 2500);
    }
  };

  const handleStartOAuth = async () => {
    const cleanId = clientIdInput.trim();
    if (!cleanId) {
      setErrorMsg('Veuillez renseigner votre App Key Dropbox.');
      return;
    }

    setErrorMsg(null);
    setIsRedirecting(true);

    try {
      localStorage.setItem(CLIENT_ID_STORAGE_KEY, cleanId);
      await startDropboxOAuth(cleanId, folderInput.trim() || DEFAULT_DROPBOX_FOLDER);
    } catch (err: unknown) {
      setIsRedirecting(false);
      const msg = err instanceof Error ? err.message : 'Erreur lors du lancement de la connexion';
      setErrorMsg(msg);
    }
  };

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

  const handleConnectManual = async (e: React.FormEvent) => {
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

  const isPermanentAuth = Boolean(config.refreshToken && config.refreshToken.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900 text-base leading-tight">
                Synchronisation Dropbox & Kobo
              </h3>
              <p className="text-[11px] text-stone-500">
                Envoi direct sans câble vers votre liseuse Kobo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
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
              Kobo synchronise automatiquement le dossier <strong className="font-mono bg-amber-100/60 px-1 py-0.5 rounded text-amber-900">/Applications/Rakuten Kobo</strong> (ou <span className="font-mono text-stone-600">/Apps/Rakuten Kobo</span> en anglais) dès que vous êtes connecté en Wi-Fi.
            </p>
          </div>

          {config.isConnected ? (
            /* Connected state */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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

                <div className="text-xs text-stone-700 space-y-1 pt-1">
                  <p>
                    Utilisateur : <strong className="text-stone-900">{config.accountName || 'Compte Kobo'}</strong>
                  </p>
                  <p>
                    Email : <span className="font-mono text-stone-600">{config.accountEmail || 'Non spécifié'}</span>
                  </p>
                </div>

                {/* Connection type badge */}
                <div className="pt-2 border-t border-emerald-200/70">
                  {isPermanentAuth ? (
                    <div className="flex items-start gap-2 bg-emerald-100/60 border border-emerald-300/70 px-3 py-2 rounded-lg text-emerald-950 text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                          <span>Connexion permanente OAuth 2.0 active</span>
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                            Illimitée
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
                          Votre session se renouvelle automatiquement en arrière-plan à chaque téléversement d'eBook via jeton d'actualisation. Aucun renouvellement manuel requis !
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg text-amber-950 text-xs">
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                            <span>Jeton manuel temporaire (validité 4 heures)</span>
                          </div>
                          <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                            Ce jeton expire au bout de 4 heures. Vous pouvez passer en connexion permanente pour ne plus avoir à le renouveler.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleDisconnect}
                        className="shrink-0 px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium text-[11px] rounded cursor-pointer transition-colors"
                      >
                        Passer en permanent &rarr;
                      </button>
                    </div>
                  )}
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

              {successMsg && (
                <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>
          ) : (
            /* Connection Mode Tabs */
            <div className="space-y-4">
              <div className="flex border-b border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('permanent');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'permanent'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Connexion permanente (Recommandé)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('manual');
                    setErrorMsg(null);
                  }}
                  className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'manual'
                      ? 'border-stone-900 text-stone-900 font-semibold'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Jeton manuel (Secours)</span>
                </button>
              </div>

              {activeTab === 'permanent' ? (
                /* OAuth PKCE Permanent connection tab */
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-1 text-xs text-blue-950">
                    <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                      <span>Renouvellement automatique permanent</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-blue-800">
                      Grâce au flux officiel OAuth 2.0 PKCE, Dropbox délivre un jeton d'actualisation permanent. Votre session ne s'interrompra plus jamais !
                    </p>
                  </div>

                  {/* App Key input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-stone-700">
                        App Key Dropbox (Clé d'application)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAppKeyHelp(!showAppKeyHelp)}
                        className="text-[11px] text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="w-3 h-3" />
                        <span>Où la trouver ?</span>
                      </button>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                        <Key className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={clientIdInput}
                        onChange={(e) => setClientIdInput(e.target.value)}
                        placeholder="Ex: z9xk21plq..."
                        className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* Redirect URI helper with 1-click copy */}
                  <div className="space-y-1.5 bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-stone-700">
                        URL de redirection (Redirect URI) à ajouter dans Dropbox :
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyRedirectUri}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-700 hover:text-stone-900 bg-white border border-stone-200 px-2 py-0.5 rounded shadow-2xs cursor-pointer transition-colors"
                      >
                        {copiedRedirectUri ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700 font-semibold">Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-stone-500" />
                            <span>Copier l'URL</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-2 bg-white rounded border border-stone-200 font-mono text-[11px] text-stone-800 break-all select-all">
                      {redirectUri || window.location.href}
                    </div>
                    <p className="text-[10px] text-stone-500 leading-tight">
                      Dans votre console Dropbox &rarr; <em>Settings</em> &rarr; <em>OAuth 2</em> &rarr; <em>Redirect URIs</em> : collez cette URL et cliquez sur <strong>Add</strong>.
                    </p>
                  </div>

                  {/* Expandable guide for App Key */}
                  {showAppKeyHelp && (
                    <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-xs text-stone-600">
                      <div className="font-semibold text-stone-900">
                        Comment configurer l'App Key en 3 minutes :
                      </div>
                      <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                        <li>
                          Ouvrez la{' '}
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
                          Cliquez sur votre application Kobo existante (ou créez-en une : <em>Scoped access</em> &rarr; <em>Full Dropbox</em>).
                        </li>
                        <li>
                          Dans l'onglet <strong>Permissions</strong>, cochez <span className="font-mono bg-stone-200 px-1 py-0.5 rounded">files.content.write</span> et <span className="font-mono bg-stone-200 px-1 py-0.5 rounded">account_info.read</span> puis validez (Submit).
                        </li>
                        <li>
                          Dans l'onglet <strong>Settings</strong> :
                          <ul className="list-disc pl-4 mt-1 space-y-0.5">
                            <li>Copiez votre <strong>App key</strong> et collez-la dans le champ ci-dessus.</li>
                            <li>Sous <em>Redirect URIs</em>, collez l'URL copiée ci-dessus et cliquez sur <strong>Add</strong>.</li>
                          </ul>
                        </li>
                      </ol>
                    </div>
                  )}

                  {/* Target folder setting */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-stone-700">
                      Dossier de destination Dropbox
                    </label>
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
                        className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                          folderInput === '/Applications/Rakuten Kobo'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                        }`}
                      >
                        /Applications/Rakuten Kobo (FR)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFolderInput('/Apps/Rakuten Kobo')}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                          folderInput === '/Apps/Rakuten Kobo'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                        }`}
                      >
                        /Apps/Rakuten Kobo (EN)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFolderInput('/Rakuten Kobo')}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                          folderInput === '/Rakuten Kobo'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                        }`}
                      >
                        /Rakuten Kobo
                      </button>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="text-xs text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Connect with Dropbox PKCE button */}
                  <button
                    type="button"
                    onClick={handleStartOAuth}
                    disabled={isRedirecting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                  >
                    {isRedirecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Redirection vers Dropbox...</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-4 h-4" />
                        <span>Se connecter avec Dropbox (Permanent)</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Manual Access Token fallback tab */
                <form onSubmit={handleConnectManual} className="space-y-4">
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-950">
                    <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Jeton manuel à durée limitée (4 heures)</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-800">
                      Ce jeton d'accès expire automatiquement après 4 heures selon les règles Dropbox. Pour un renouvellement automatique à vie, utilisez l'onglet <strong>Connexion permanente</strong>.
                    </p>
                  </div>

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
                        className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                          folderInput === '/Applications/Rakuten Kobo'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                        }`}
                      >
                        /Applications/Rakuten Kobo (FR)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFolderInput('/Apps/Rakuten Kobo')}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                          folderInput === '/Apps/Rakuten Kobo'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                        }`}
                      >
                        /Apps/Rakuten Kobo (EN)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFolderInput('/Rakuten Kobo')}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                          folderInput === '/Rakuten Kobo'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                        }`}
                      >
                        /Rakuten Kobo
                      </button>
                    </div>
                  </div>

                  {/* Token guide help accordion */}
                  {showTokenHelp && (
                    <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2 text-xs text-stone-600">
                      <div className="font-semibold text-stone-900">
                        Comment générer un jeton temporaire :
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
                          Dans l'onglet <strong>Permissions</strong>, cochez <span className="font-mono bg-stone-200 px-1 py-0.5 rounded">files.content.write</span> et <span className="font-mono bg-stone-200 px-1 py-0.5 rounded">account_info.read</span>.
                        </li>
                        <li>
                          Dans l'onglet <strong>Settings</strong>, sous <em>OAuth 2</em>, cliquez sur <strong>"Generate"</strong> sous <em>Generated access token</em>. Copiez et collez-le ici.
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
                        <Key className="w-4 h-4" />
                        <span>Enregistrer le jeton temporaire</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
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
