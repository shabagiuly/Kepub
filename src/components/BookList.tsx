import React from 'react';
import {
  Download,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Book,
  ArrowRight,
  ExternalLink,
  Archive,
  RefreshCw
} from 'lucide-react';
import type { BookItem, DropboxConfig } from '../types/epub';

interface BookListProps {
  books: BookItem[];
  dropboxConfig: DropboxConfig;
  onConvertBook: (id: string) => void;
  onConvertAll: () => void;
  onDownloadBook: (book: BookItem) => void;
  onDownloadAllZip: () => void;
  onUploadBookToDropbox: (book: BookItem) => void;
  onUploadAllToDropbox: () => void;
  onRemoveBook: (id: string) => void;
  onClearAll: () => void;
  isConvertingAny: boolean;
  isUploadingAny: boolean;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const BookList: React.FC<BookListProps> = ({
  books,
  dropboxConfig,
  onConvertBook,
  onConvertAll,
  onDownloadBook,
  onDownloadAllZip,
  onUploadBookToDropbox,
  onUploadAllToDropbox,
  onRemoveBook,
  onClearAll,
  isConvertingAny,
  isUploadingAny,
}) => {
  const convertedCount = books.filter((b) => b.status === 'done').length;
  const idleCount = books.filter((b) => b.status === 'idle').length;

  if (books.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-4">
      {/* Batch toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-stone-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 text-sm text-stone-700">
          <span className="font-semibold text-stone-900">{books.length}</span>
          <span>{books.length > 1 ? 'livres ajoutés' : 'livre ajouté'}</span>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <span className="text-stone-500">
            {convertedCount} {convertedCount > 1 ? 'convertis' : 'converti'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {idleCount > 0 && (
            <button
              onClick={onConvertAll}
              disabled={isConvertingAny}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-stone-50 text-xs font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isConvertingAny ? 'animate-spin' : ''}`} />
              <span>Tout convertir ({idleCount})</span>
            </button>
          )}

          {convertedCount > 0 && (
            <button
              onClick={onDownloadAllZip}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-800 text-xs font-medium hover:bg-stone-200 transition-colors cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5 text-stone-600" />
              <span>Tout télécharger (.zip)</span>
            </button>
          )}

          {convertedCount > 0 && dropboxConfig.isConnected && (
            <button
              onClick={onUploadAllToDropbox}
              disabled={isUploadingAny}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Tout envoyer sur Dropbox</span>
            </button>
          )}

          <button
            onClick={onClearAll}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100 text-xs font-medium transition-colors cursor-pointer ml-auto sm:ml-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Effacer</span>
          </button>
        </div>
      </div>

      {/* Book cards */}
      <div className="space-y-3">
        {books.map((book) => {
          const isDone = book.status === 'done';
          const isConverting = book.status === 'converting' || book.status === 'parsing';
          const isError = book.status === 'error';
          const isUploading = book.uploadStatus === 'uploading';
          const isUploaded = book.uploadStatus === 'uploaded';

          return (
            <div
              key={book.id}
              className="p-4 sm:p-5 bg-white border border-stone-200 rounded-xl hover:border-stone-300 transition-all shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Book cover or fallback icon */}
                <div className="w-16 h-22 sm:w-20 sm:h-28 shrink-0 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center relative shadow-xs">
                  {book.metadata.coverUrl ? (
                    <img
                      src={book.metadata.coverUrl}
                      alt={book.metadata.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-linear-to-b from-stone-100 to-stone-200 flex flex-col items-center justify-center p-2 text-center">
                      <Book className="w-6 h-6 text-stone-400 mb-1" />
                      <span className="text-[9px] text-stone-500 font-medium line-clamp-2 leading-tight">
                        {book.metadata.title}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info & metadata */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-base font-semibold text-stone-900 truncate">
                        {book.metadata.title}
                      </h4>
                      <p className="text-xs text-stone-600 font-medium truncate mt-0.5">
                        {book.metadata.creator}
                      </p>
                    </div>

                    <button
                      onClick={() => onRemoveBook(book.id)}
                      className="text-stone-400 hover:text-red-600 p-1 rounded-md transition-colors cursor-pointer shrink-0"
                      title="Supprimer ce livre"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Clean unboxed metadata */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-stone-500 tabular-nums">
                    <span>{formatBytes(book.metadata.originalSize)}</span>
                    <span aria-hidden="true" className="text-stone-300">·</span>
                    <span>{book.metadata.chapterCount} chapitres</span>
                    {book.metadata.wordCount > 0 && (
                      <>
                        <span aria-hidden="true" className="text-stone-300">·</span>
                        <span>~{book.metadata.wordCount.toLocaleString('fr-FR')} mots</span>
                      </>
                    )}
                    {isDone && book.convertedSize && (
                      <>
                        <span aria-hidden="true" className="text-stone-300">·</span>
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          KePub : {formatBytes(book.convertedSize)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Progress bar during conversion */}
                  {isConverting && (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-stone-600">
                        <span className="truncate max-w-[280px]">
                          {book.statusMessage || 'Conversion en cours...'}
                        </span>
                        <span className="font-mono text-stone-800 font-medium">
                          {book.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-600 h-1.5 rounded-full transition-all duration-200"
                          style={{ width: `${book.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Progress bar during Dropbox upload */}
                  {isUploading && (
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-emerald-700">
                        <span>Transfert vers Dropbox ({dropboxConfig.targetFolder})...</span>
                        <span className="font-mono">{book.uploadProgress || 0}%</span>
                      </div>
                      <div className="w-full bg-emerald-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-1.5 rounded-full transition-all duration-200"
                          style={{ width: `${book.uploadProgress || 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Upload success info */}
                  {isUploaded && book.dropboxPath && (
                    <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        Synchronisé sur Dropbox : <strong className="font-mono font-medium">{book.dropboxPath}</strong>
                      </span>
                    </div>
                  )}

                  {/* Errors */}
                  {isError && (
                    <div className="mt-2 text-xs text-red-600 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{book.error || 'Erreur lors de la conversion.'}</span>
                    </div>
                  )}

                  {book.uploadStatus === 'error' && (
                    <div className="mt-2 text-xs text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                      <span className="leading-relaxed">{book.uploadError || "Échec de l'envoi sur Dropbox."}</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-3.5 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2">
                    {book.status === 'idle' && (
                      <button
                        onClick={() => onConvertBook(book.id)}
                        disabled={isConvertingAny}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-900 text-stone-50 text-xs font-semibold hover:bg-stone-800 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <span>Convertir en KePub</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isDone && (
                      <>
                        <button
                          onClick={() => onDownloadBook(book)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-stone-50 text-xs font-semibold hover:bg-stone-800 transition-colors cursor-pointer shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Télécharger .kepub.epub</span>
                        </button>

                        <button
                          onClick={() => onUploadBookToDropbox(book)}
                          disabled={isUploading}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            isUploaded
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                          }`}
                        >
                          {isUploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Cloud className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isUploading
                              ? 'Envoi en cours...'
                              : isUploaded
                              ? 'Renvoyer sur Dropbox'
                              : 'Envoyer sur Dropbox'}
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
