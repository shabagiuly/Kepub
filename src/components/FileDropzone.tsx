import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Sparkles, Plus } from 'lucide-react';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFilesSelected,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter(
        (f) => f.name.toLowerCase().endsWith('.epub') || f.type.includes('epub')
      );
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = Array.from(e.target.files);
      onFilesSelected(validFiles);
      // Reset input value to allow re-uploading the same file if needed
      e.target.value = '';
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group border-2 border-dashed rounded-2xl p-8 sm:p-12 transition-all cursor-pointer text-center bg-white ${
          isDragging
            ? 'border-amber-500 bg-amber-50/50 scale-[1.005]'
            : 'border-stone-300 hover:border-stone-400 hover:bg-stone-50/50 shadow-xs'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".epub,application/epub+zip"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 group-hover:bg-amber-100/70 text-stone-700 group-hover:text-amber-800 flex items-center justify-center transition-colors mb-4">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-semibold text-stone-900 mb-1">
            Déposez vos fichiers ePub ici
          </h3>

          <p className="text-sm text-stone-500 mb-5 leading-relaxed">
            Glissez-déposez un ou plusieurs livres <span className="font-mono text-xs bg-stone-100 px-1.5 py-0.5 rounded text-stone-700">.epub</span> ou parcourez les dossiers de votre appareil.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-stone-900 text-stone-50 text-xs font-semibold hover:bg-stone-800 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Sélectionner des fichiers ePub
            </button>
          </div>
        </div>

        {/* Clean unboxed metadata footer */}
        <div className="mt-8 pt-6 border-t border-stone-100 flex flex-wrap items-center justify-center gap-4 text-xs text-stone-500">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-stone-400" />
            Conversion ultra-rapide côté navigateur
          </span>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <span>100% confidentiel (aucun fichier stocké en externe)</span>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <span>Compatible Kobo Forma, Clara, Libra, Sage, Elipsa</span>
        </div>
      </div>
    </div>
  );
};
