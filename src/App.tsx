import React, { useState, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import {
  BookOpen,
  Cloud,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Laptop,
  Wifi,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import type { BookItem, DropboxConfig, ConversionOptions } from './types/epub';
import {
  parseEpubMetadata,
  convertEpubToKepub,
  DEFAULT_CONVERSION_OPTIONS,
} from './lib/kepubify';
import { createSampleEpub } from './lib/sampleEpub';
import {
  getSavedDropboxConfig,
  saveDropboxConfig,
  uploadFileToDropbox,
} from './lib/dropbox';
import { Header } from './components/Header';
import { FileDropzone } from './components/FileDropzone';
import { BookList } from './components/BookList';
import { DropboxModal } from './components/DropboxModal';
import { KoboTipsModal } from './components/KoboTipsModal';
import { SettingsModal } from './components/SettingsModal';
import { PasswordLockScreen } from './components/PasswordLockScreen';
import {
  isPasswordProtectionEnabled,
  isSessionAuthenticated,
  lockSession,
} from './lib/auth';

export default function App() {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [dropboxConfig, setDropboxConfig] = useState<DropboxConfig>(getSavedDropboxConfig());
  const [conversionOptions, setConversionOptions] = useState<ConversionOptions>(DEFAULT_CONVERSION_OPTIONS);

  // Authentication & Lock state
  const [isProtected, setIsProtected] = useState<boolean>(isPasswordProtectionEnabled());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(isSessionAuthenticated());

  // Modals state
  const [isDropboxModalOpen, setIsDropboxModalOpen] = useState(false);
  const [isTipsModalOpen, setIsTipsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  // Status feedback toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Add files to list
  const handleFilesSelected = async (files: File[]) => {
    const newItems: BookItem[] = [];

    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      try {
        const metadata = await parseEpubMetadata(file);
        newItems.push({
          id,
          file,
          name: file.name,
          metadata,
          status: 'idle',
          progress: 0,
          uploadStatus: 'idle',
        });
      } catch (err: unknown) {
        console.warn('Failed to parse epub metadata', err);
        // Fallback item with basic metadata
        newItems.push({
          id,
          file,
          name: file.name,
          metadata: {
            title: file.name.replace(/\.epub$/i, ''),
            creator: 'Inconnu',
            chapterCount: 1,
            wordCount: 0,
            originalSize: file.size,
          },
          status: 'idle',
          progress: 0,
          uploadStatus: 'idle',
        });
      }
    }

    setBooks((prev) => [...prev, ...newItems]);
    showToast(
      `${files.length} ${files.length > 1 ? 'livres ajoutés' : 'livre ajouté'} à la liste.`,
      'info'
    );
  };

  // Load sample book
  const handleLoadSample = async () => {
    setIsLoadingSample(true);
    try {
      const sampleFile = await createSampleEpub();
      await handleFilesSelected([sampleFile]);
      showToast('Livre exemple chargé : Vingt Mille Lieues sous les mers !', 'success');
    } catch (err: unknown) {
      console.error(err);
      showToast('Erreur lors du chargement de l’exemple.', 'error');
    } finally {
      setIsLoadingSample(false);
    }
  };

  // Convert a single book
  const handleConvertBook = async (id: string) => {
    const book = books.find((b) => b.id === id);
    if (!book || book.status === 'converting') return;

    setBooks((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, status: 'converting', progress: 5, statusMessage: 'Initialisation...' }
          : b
      )
    );

    try {
      const result = await convertEpubToKepub(
        book.file,
        conversionOptions,
        (progress, statusMessage) => {
          setBooks((prev) =>
            prev.map((b) =>
              b.id === id ? { ...b, progress, statusMessage } : b
            )
          );
        }
      );

      setBooks((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                status: 'done',
                progress: 100,
                convertedBlob: result.blob,
                convertedName: result.fileName,
                convertedSize: result.size,
                statusMessage: 'Prêt',
              }
            : b
        )
      );

      showToast(`Conversion réussie : ${book.metadata.title}`, 'success');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur de conversion';
      setBooks((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, status: 'error', error: errorMsg, statusMessage: 'Erreur' }
            : b
        )
      );
      showToast(`Échec pour ${book.metadata.title} : ${errorMsg}`, 'error');
    }
  };

  // Convert all idle books
  const handleConvertAll = async () => {
    const idleBooks = books.filter((b) => b.status === 'idle');
    for (const b of idleBooks) {
      await handleConvertBook(b.id);
    }
  };

  // Download converted book
  const handleDownloadBook = (book: BookItem) => {
    if (!book.convertedBlob || !book.convertedName) return;

    const url = URL.createObjectURL(book.convertedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = book.convertedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Téléchargement lancé : ${book.convertedName}`, 'info');
  };

  // Download all converted books as a ZIP
  const handleDownloadAllZip = async () => {
    const convertedBooks = books.filter((b) => b.status === 'done' && b.convertedBlob);
    if (convertedBooks.length === 0) return;

    const zip = new JSZip();
    convertedBooks.forEach((b) => {
      if (b.convertedBlob && b.convertedName) {
        zip.file(b.convertedName, b.convertedBlob);
      }
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Livres_Kepub_Kobo_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Archive ZIP téléchargée (${convertedBooks.length} livres)`, 'success');
  };

  // Upload single book to Dropbox
  const handleUploadBookToDropbox = async (book: BookItem) => {
    if (!dropboxConfig.isConnected || !dropboxConfig.accessToken) {
      setIsDropboxModalOpen(true);
      return;
    }

    if (!book.convertedBlob || !book.convertedName) {
      showToast('Veuillez convertir le livre avant de l’envoyer.', 'error');
      return;
    }

    setBooks((prev) =>
      prev.map((b) =>
        b.id === book.id
          ? { ...b, uploadStatus: 'uploading', uploadProgress: 10, uploadError: undefined }
          : b
      )
    );

    try {
      const result = await uploadFileToDropbox(
        dropboxConfig.accessToken,
        dropboxConfig.targetFolder,
        book.convertedName,
        book.convertedBlob,
        (uploadProgress) => {
          setBooks((prev) =>
            prev.map((b) =>
              b.id === book.id ? { ...b, uploadProgress } : b
            )
          );
        }
      );

      setBooks((prev) =>
        prev.map((b) =>
          b.id === book.id
            ? {
                ...b,
                uploadStatus: 'uploaded',
                uploadProgress: 100,
                dropboxPath: result.path,
              }
            : b
        )
      );

      showToast(`Envoyé sur Dropbox : ${result.path}`, 'success');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur d\'envoi';
      setBooks((prev) =>
        prev.map((b) =>
          b.id === book.id
            ? { ...b, uploadStatus: 'error', uploadError: errorMsg }
            : b
        )
      );
      showToast(`Échec du transfert : ${errorMsg}`, 'error');
    }
  };

  // Upload all converted books to Dropbox
  const handleUploadAllToDropbox = async () => {
    if (!dropboxConfig.isConnected || !dropboxConfig.accessToken) {
      setIsDropboxModalOpen(true);
      return;
    }

    const convertedBooks = books.filter((b) => b.status === 'done' && b.convertedBlob);
    for (const b of convertedBooks) {
      await handleUploadBookToDropbox(b);
    }
  };

  const handleRemoveBook = (id: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleClearAll = () => {
    setBooks([]);
  };

  const handleLock = () => {
    lockSession();
    setIsAuthenticated(false);
    showToast('Session verrouillée.', 'info');
  };

  const isConvertingAny = books.some(
    (b) => b.status === 'converting' || b.status === 'parsing'
  );
  const isUploadingAny = books.some((b) => b.uploadStatus === 'uploading');

  // If password protection is enabled and user is not authenticated, show lock screen
  if (isProtected && !isAuthenticated) {
    return <PasswordLockScreen onUnlock={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-full flex flex-col bg-stone-50 text-stone-900">
      {/* Header */}
      <Header
        dropboxConfig={dropboxConfig}
        onOpenDropboxModal={() => setIsDropboxModalOpen(true)}
        onOpenTipsModal={() => setIsTipsModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        isProtected={isProtected}
        onLock={handleLock}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/70 border border-amber-200/60 text-xs font-semibold text-amber-900 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Format optimisé liseuse Kobo</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-stone-900 text-balance">
            Convertissez vos livres <span className="text-amber-800">ePub</span> en format <span className="text-stone-950 underline decoration-amber-300 decoration-3">KePub</span>
          </h1>

          <p className="text-sm sm:text-base text-stone-600 leading-relaxed text-pretty">
            Activez la vitesse de lecture Kobo, le temps restant par chapitre, les notes pop-up et synchronisez directement avec votre dossier Dropbox.
          </p>

          <div className="flex items-center justify-center gap-6 pt-2 text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-stone-400" />
              <span>Desktop</span>
            </span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-stone-400" />
              <span>Mobile & Tablette</span>
            </span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="flex items-center gap-1.5">
              <Wifi className="w-4 h-4 text-emerald-600" />
              <span>Synchro Wi-Fi Kobo</span>
            </span>
          </div>
        </div>

        {/* File Dropzone */}
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          onLoadSample={handleLoadSample}
          isLoadingSample={isLoadingSample}
        />

        {/* Dropbox Active Target Folder Info */}
        {dropboxConfig.isConnected && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5 text-stone-700">
              <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Dossier Dropbox actif :</span>
              <strong className="font-mono text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded">
                {dropboxConfig.targetFolder}
              </strong>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {dropboxConfig.targetFolder !== '/Applications/Rakuten Kobo' && (
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...dropboxConfig, targetFolder: '/Applications/Rakuten Kobo' };
                    setDropboxConfig(updated);
                    saveDropboxConfig(updated);
                    showToast('Dossier basculé sur /Applications/Rakuten Kobo', 'success');
                  }}
                  className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Basculer vers /Applications/Rakuten Kobo
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsDropboxModalOpen(true)}
                className="text-stone-500 hover:text-stone-900 underline text-xs cursor-pointer"
              >
                Changer de dossier
              </button>
            </div>
          </div>
        )}

        {/* Books List / Dashboard */}
        <BookList
          books={books}
          dropboxConfig={dropboxConfig}
          onConvertBook={handleConvertBook}
          onConvertAll={handleConvertAll}
          onDownloadBook={handleDownloadBook}
          onDownloadAllZip={handleDownloadAllZip}
          onUploadBookToDropbox={handleUploadBookToDropbox}
          onUploadAllToDropbox={handleUploadAllToDropbox}
          onRemoveBook={handleRemoveBook}
          onClearAll={handleClearAll}
          isConvertingAny={isConvertingAny}
          isUploadingAny={isUploadingAny}
        />

        {/* 3-Step Feature Explainer Grid */}
        <div className="pt-8 border-t border-stone-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 text-center mb-6">
            Fonctionnement simple et sans installation
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-white border border-stone-200/80 rounded-xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center font-bold text-xs text-stone-800">
                1
              </div>
              <h4 className="text-sm font-semibold text-stone-900">
                Importez vos fichiers ePub
              </h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                Glissez-déposez un livre ou un lot complet depuis votre ordinateur ou smartphone.
              </p>
            </div>

            <div className="p-5 bg-white border border-stone-200/80 rounded-xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h4 className="text-sm font-semibold text-stone-900">
                Segmentation kepubify
              </h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                Le moteur ajoute les balises <code className="text-stone-700 bg-stone-100 px-1 rounded">koboSpan</code> et les métadonnées requises par le lecteur Kobo NetFront.
              </p>
            </div>

            <div className="p-5 bg-white border border-stone-200/80 rounded-xl space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h4 className="text-sm font-semibold text-stone-900">
                Téléchargez ou Dropbox
              </h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                Enregistrez le <code className="text-stone-700 bg-stone-100 px-1 rounded">.kepub.epub</code> en direct ou transférez-le dans votre dossier Dropbox pour synchronisation sans fil.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-800">Kepubify Web</span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span>Compatible toutes liseuses Kobo (Clara, Libra, Sage, Forma, Elipsa)</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsTipsModalOpen(true)}
              className="hover:text-stone-800 transition-colors cursor-pointer"
            >
              Guide KePub
            </button>
            <button
              onClick={() => setIsDropboxModalOpen(true)}
              className="hover:text-stone-800 transition-colors cursor-pointer"
            >
              Synchro Dropbox
            </button>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="hover:text-stone-800 transition-colors cursor-pointer"
            >
              Options
            </button>
          </div>
        </div>
      </footer>

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 transition-all">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-lg border text-xs font-medium flex items-center gap-2 max-w-sm ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900 text-emerald-50 border-emerald-700'
                : toastMessage.type === 'error'
                ? 'bg-red-900 text-red-50 border-red-700'
                : 'bg-stone-900 text-stone-50 border-stone-800'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {toastMessage.type === 'info' && <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Modals */}
      <DropboxModal
        isOpen={isDropboxModalOpen}
        onClose={() => setIsDropboxModalOpen(false)}
        config={dropboxConfig}
        onConfigChange={(newConfig) => {
          setDropboxConfig(newConfig);
          if (newConfig.isConnected) {
            showToast('Dropbox connecté avec succès !', 'success');
          } else {
            showToast('Dropbox déconnecté.', 'info');
          }
        }}
      />

      <KoboTipsModal
        isOpen={isTipsModalOpen}
        onClose={() => setIsTipsModalOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        options={conversionOptions}
        onOptionsChange={(newOptions) => {
          setConversionOptions(newOptions);
          showToast('Options de conversion enregistrées.', 'info');
        }}
        onPasswordConfigChanged={() => {
          setIsProtected(isPasswordProtectionEnabled());
          setIsAuthenticated(isSessionAuthenticated());
        }}
      />
    </div>
  );
}
