import React from 'react';
import { X, Sliders, Check } from 'lucide-react';
import type { ConversionOptions } from '../types/epub';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: ConversionOptions;
  onOptionsChange: (newOptions: ConversionOptions) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  options,
  onOptionsChange,
}) => {
  if (!isOpen) return null;

  const toggleOption = (key: keyof ConversionOptions) => {
    onOptionsChange({
      ...options,
      [key]: !options[key],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200">
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-stone-900 text-base">
              Options de conversion KePub
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
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

        <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex justify-end rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};
