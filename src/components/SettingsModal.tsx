import React, { useState } from 'react';
import { X, Sliders, Check, Shield, Key, Copy, CheckCheck, Trash2 } from 'lucide-react';
import type { ConversionOptions } from '../types/epub';
import {
  hashPassword,
  getTargetPasswordHash,
  setLocalPassword,
  removeLocalPassword,
} from '../lib/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: ConversionOptions;
  onOptionsChange: (newOptions: ConversionOptions) => void;
  onPasswordConfigChanged?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  options,
  onOptionsChange,
  onPasswordConfigChanged,
}) => {
  const [newPassInput, setNewPassInput] = useState('');
  const [generatedHash, setGeneratedHash] = useState('');
  const [copied, setCopied] = useState(false);
  const [securityStatusMsg, setSecurityStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const envHash = import.meta.env.VITE_PASSWORD_HASH;
  const currentHash = getTargetPasswordHash();
  const isEnvActive = Boolean(envHash && envHash.trim() !== '');
  const isLocalActive = Boolean(!isEnvActive && currentHash);

  const toggleOption = (key: keyof ConversionOptions) => {
    onOptionsChange({
      ...options,
      [key]: !options[key],
    });
  };

  const handleComputeHash = async (val: string) => {
    setNewPassInput(val);
    if (val.trim()) {
      const h = await hashPassword(val);
      setGeneratedHash(h);
    } else {
      setGeneratedHash('');
    }
  };

  const handleCopyHash = () => {
    if (!generatedHash) return;
    navigator.clipboard.writeText(generatedHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveLocalPassword = async () => {
    if (!newPassInput.trim()) return;
    await setLocalPassword(newPassInput);
    setSecurityStatusMsg('Mot de passe local activé avec succès.');
    onPasswordConfigChanged?.();
    setTimeout(() => setSecurityStatusMsg(null), 3000);
  };

  const handleRemoveLocalPassword = () => {
    removeLocalPassword();
    setSecurityStatusMsg('Mot de passe local désactivé.');
    setNewPassInput('');
    setGeneratedHash('');
    onPasswordConfigChanged?.();
    setTimeout(() => setSecurityStatusMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 my-8">
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-stone-900 text-base">
              Options & Sécurité
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Section 1: Conversion settings */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Paramètres du moteur KePub
            </div>

            <div
              onClick={() => toggleOption('addHyphenation')}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-stone-200 hover:border-stone-300 bg-stone-50/50 cursor-pointer transition-colors"
            >
              <div
                className={`w-5 h-5 rounded flex items-center justify-center mt-0.5 border ${
                  options.addHyphenation
                    ? 'bg-stone-900 border-stone-900 text-white'
                    : 'bg-white border-stone-300'
                }`}
              >
                {options.addHyphenation && <Check className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-stone-900">
                  Activer les césures automatiques (-webkit-hyphens)
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Améliore la justification du texte sur les petits écrans de liseuse en coupant proprement les mots longs.
                </p>
              </div>
            </div>

            <div
              onClick={() => toggleOption('addSpecifiedFontsMeta')}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-stone-200 hover:border-stone-300 bg-stone-50/50 cursor-pointer transition-colors"
            >
              <div
                className={`w-5 h-5 rounded flex items-center justify-center mt-0.5 border ${
                  options.addSpecifiedFontsMeta
                    ? 'bg-stone-900 border-stone-900 text-white'
                    : 'bg-white border-stone-300'
                }`}
              >
                {options.addSpecifiedFontsMeta && <Check className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-stone-900">
                  Autoriser les polices intégrées (specified-fonts)
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Ajoute la métadonnée autorisant Kobo à utiliser soit les polices choisies par l'éditeur, soit la police configurée par le lecteur.
                </p>
              </div>
            </div>

            <div
              onClick={() => toggleOption('addKoboStyle')}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-stone-200 hover:border-stone-300 bg-stone-50/50 cursor-pointer transition-colors"
            >
              <div
                className={`w-5 h-5 rounded flex items-center justify-center mt-0.5 border ${
                  options.addKoboStyle
                    ? 'bg-stone-900 border-stone-900 text-white'
                    : 'bg-white border-stone-300'
                }`}
              >
                {options.addKoboStyle && <Check className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-stone-900">
                  Balises de style .koboSpan
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Garantit que les règles CSS koboSpan n'interfèrent pas avec la mise en page d'origine du livre.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Zero-Plaintext Security & Password Protection */}
          <div className="space-y-3 pt-3 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-stone-500" />
                <span>Protection par mot de passe</span>
              </div>
              {isEnvActive ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                  Actif via GitHub Secrets
                </span>
              ) : isLocalActive ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-semibold">
                  Actif sur ce navigateur
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-semibold">
                  Désactivé
                </span>
              )}
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed">
              Pour protéger l'accès <strong>sans jamais stocker votre mot de passe en clair</strong>, l'application utilise une empreinte cryptographique unidirectionnelle (<strong>hachage SHA-256</strong>).
            </p>

            {/* Generator */}
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-700">
                  Générateur d'empreinte SHA-256 :
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Key className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={newPassInput}
                    onChange={(e) => handleComputeHash(e.target.value)}
                    placeholder="Tapez un mot de passe (ex: MonCodeSecret123)"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                  />
                </div>
              </div>

              {generatedHash && (
                <div className="space-y-2 pt-1">
                  <div>
                    <span className="text-[10px] font-mono font-medium text-stone-500 uppercase tracking-wider">
                      Empreinte SHA-256 calculée (irréversible) :
                    </span>
                    <div className="p-2 bg-stone-100/90 rounded-lg font-mono text-[11px] text-stone-700 break-all select-all border border-stone-200/60 mt-0.5">
                      {generatedHash}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyHash}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white hover:bg-stone-800 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                    >
                      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Hash copié !' : 'Copier pour GitHub Secrets'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveLocalPassword}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Activer sur ce navigateur</span>
                    </button>
                  </div>
                </div>
              )}

              {isLocalActive && !generatedHash && (
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-xs text-stone-600">
                    Mot de passe local activé.
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveLocalPassword}
                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer</span>
                  </button>
                </div>
              )}
            </div>

            {securityStatusMsg && (
              <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                {securityStatusMsg}
              </div>
            )}

            <div className="p-3 bg-stone-100/80 rounded-xl text-[11px] text-stone-600 space-y-1">
              <strong className="text-stone-800">Comment l'activer sur GitHub Pages :</strong>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Générez et copiez le hash ci-dessus.</li>
                <li>Sur GitHub : <em>Settings</em> &rarr; <em>Secrets and variables</em> &rarr; <em>Actions</em>.</li>
                <li>Ajoutez le Secret nommé <strong><code>APP_PASSWORD_HASH</code></strong> avec la valeur copiée.</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex justify-end rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
