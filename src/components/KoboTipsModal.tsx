import React from 'react';
import { X, Zap, Clock, Bookmark, Search, Type, Check, FolderSync } from 'lucide-react';

interface KoboTipsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KoboTipsModal: React.FC<KoboTipsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200">
        <div className="flex items-center justify-between p-5 border-b border-stone-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-stone-900 text-base">
              Pourquoi convertir ses ePubs en KePub ?
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
          <p className="text-sm text-stone-600 leading-relaxed">
            Sur une liseuse Kobo, un fichier <span className="font-mono text-xs bg-stone-100 px-1 py-0.5 rounded">.epub</span> standard utilise le moteur Adobe (RMSDK), plus ancien et plus lent. En convertissant vos livres au format <span className="font-mono text-xs bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-semibold">.kepub.epub</span> (comme le fait l'outil de référence <em>kepubify</em>), Kobo active son moteur natif <strong>ACCESS NetFront BookReader</strong>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-stone-900 font-semibold text-xs">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>Tourne de page ultra-rapide</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Le changement de page est quasi instantané, sans latence ni scintillement d'encre excessif.
              </p>
            </div>

            <div className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-stone-900 font-semibold text-xs">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Temps restant par chapitre</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Affiche les minutes restantes dans le chapitre actuel ainsi que dans le livre complet en temps réel.
              </p>
            </div>

            <div className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-stone-900 font-semibold text-xs">
                <Bookmark className="w-4 h-4 text-emerald-600" />
                <span>Notes de bas de page en pop-up</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Appuyer sur un renvoi de note ouvre une bulle d'aperçu contextuelle sans vous téléporter à la fin de l'ouvrage.
              </p>
            </div>

            <div className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-stone-900 font-semibold text-xs">
                <Search className="w-4 h-4 text-purple-600" />
                <span>Zoom sur les images & cartes</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Double-tapez sur les illustrations, couvertures et cartes pour zoomer et vous déplacer dessus.
              </p>
            </div>

            <div className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-xl space-y-1 sm:col-span-2">
              <div className="flex items-center gap-2 text-stone-900 font-semibold text-xs">
                <Type className="w-4 h-4 text-rose-600" />
                <span>Coupure des mots & polices personnalisées</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Prise en charge de la césure intelligente (hyphenation) et des polices OpenType/TrueType sans briser la mise en page.
              </p>
            </div>
          </div>

          {/* Dropbox auto-sync instructions */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-blue-900 font-semibold text-xs">
              <FolderSync className="w-4 h-4 text-blue-700" />
              <span>Comment activer Dropbox sur sa liseuse Kobo ?</span>
            </div>
            <ol className="text-xs text-blue-950 list-decimal pl-4 space-y-1 leading-relaxed">
              <li>Sur votre Kobo, allez dans <strong>Paramètres</strong> &rarr; <strong>Comptes</strong>.</li>
              <li>Section Dropbox : appuyez sur <strong>Lier</strong> et suivez le code affiché.</li>
              <li>Kobo crée le dossier <code>/Rakuten Kobo</code> dans votre Dropbox.</li>
              <li>Tous les livres KePub envoyés ici via notre application apparaîtront directement dans votre bibliothèque dès la prochaine synchronisation Wi-Fi !</li>
            </ol>
          </div>
        </div>

        <div className="p-4 border-t border-stone-100 bg-stone-50/50 flex justify-end rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-stone-900 text-stone-50 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
};
