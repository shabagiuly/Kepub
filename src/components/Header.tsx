import React from 'react';
import { BookOpen, Cloud, Sliders, HelpCircle, Check } from 'lucide-react';
import type { DropboxConfig } from '../types/epub';

interface HeaderProps {
  dropboxConfig: DropboxConfig;
  onOpenDropboxModal: () => void;
  onOpenTipsModal: () => void;
  onOpenSettingsModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dropboxConfig,
  onOpenDropboxModal,
  onOpenTipsModal,
  onOpenSettingsModal,
}) => {
  return (
    <header className="border-b border-stone-200 bg-white/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-stone-900 text-amber-100 flex items-center justify-center font-bold shadow-sm">
            <BookOpen className="w-5 h-5 text-amber-200" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-stone-900 leading-none">
              Kepubify Web
            </span>
            <span className="text-[11px] text-stone-500 mt-1 leading-none">
              ePub &rarr; KePub pour Kobo
            </span>
          </div>
        </div>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
          <button
            onClick={onOpenTipsModal}
            className="flex items-center gap-1.5 hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 text-left cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-stone-400" />
            <span>Pourquoi le format KePub ?</span>
          </button>
          <button
            onClick={onOpenDropboxModal}
            className="flex items-center gap-1.5 hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 text-left cursor-pointer"
          >
            <Cloud className="w-4 h-4 text-stone-400" />
            <span>Synchronisation Kobo & Dropbox</span>
          </button>
          <button
            onClick={onOpenSettingsModal}
            className="flex items-center gap-1.5 hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 text-left cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-stone-400" />
            <span>Options de conversion</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenDropboxModal}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              dropboxConfig.isConnected
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-stone-900 text-stone-50 hover:bg-stone-800 shadow-xs'
            }`}
          >
            <Cloud className={`w-3.5 h-3.5 ${dropboxConfig.isConnected ? 'text-emerald-600' : 'text-stone-300'}`} />
            {dropboxConfig.isConnected ? (
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Dropbox lié</span>
              </span>
            ) : (
              <span>Lier Dropbox</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
