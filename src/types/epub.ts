export interface BookMetadata {
  title: string;
  creator: string;
  language?: string;
  publisher?: string;
  identifier?: string;
  coverUrl?: string; // Blob URL or base64
  chapterCount: number;
  wordCount: number;
  originalSize: number;
}

export type ConversionStatus = 'idle' | 'parsing' | 'converting' | 'done' | 'error';
export type UploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error';

export interface BookItem {
  id: string;
  file: File;
  name: string;
  metadata: BookMetadata;
  status: ConversionStatus;
  progress: number; // 0 to 100
  statusMessage?: string;
  convertedBlob?: Blob;
  convertedName?: string;
  convertedSize?: number;
  error?: string;
  uploadStatus: UploadStatus;
  uploadProgress?: number;
  uploadError?: string;
  dropboxPath?: string;
}

export interface DropboxConfig {
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
  expiresAt?: number; // timestamp in ms when accessToken expires
  accountEmail?: string;
  accountName?: string;
  targetFolder: string; // e.g. "/Applications/Rakuten Kobo"
  isConnected: boolean;
}

export interface ConversionOptions {
  addHyphenation: boolean;
  addSpecifiedFontsMeta: boolean;
  cleanEmptySpans: boolean;
  addKoboStyle: boolean;
}
