import JSZip from 'jszip';
import type { BookMetadata, ConversionOptions } from '../types/epub';

export const DEFAULT_CONVERSION_OPTIONS: ConversionOptions = {
  addHyphenation: true,
  addSpecifiedFontsMeta: true,
  cleanEmptySpans: true,
  addKoboStyle: true,
};

/**
 * Parses container.xml to locate the OPF package document.
 */
async function getOpfPath(zip: JSZip): Promise<string> {
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) {
    throw new Error("Fichier META-INF/container.xml introuvable dans l'archive ePub.");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(containerXml, 'application/xml');
  const rootfile = doc.querySelector('rootfile');
  const fullPath = rootfile?.getAttribute('full-path');

  if (!fullPath) {
    throw new Error("Balise rootfile avec full-path introuvable dans container.xml.");
  }

  return fullPath;
}

/**
 * Helper to get directory path from a file path
 */
function getDir(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.length > 0 ? parts.join('/') + '/' : '';
}

/**
 * Extract book metadata and cover image
 */
export async function parseEpubMetadata(file: File): Promise<BookMetadata> {
  const zip = await JSZip.loadAsync(file);
  const opfPath = await getOpfPath(zip);
  const opfDir = getDir(opfPath);
  const opfContent = await zip.file(opfPath)?.async('text');

  if (!opfContent) {
    throw new Error(`Fichier OPF introuvable à l'emplacement : ${opfPath}`);
  }

  const parser = new DOMParser();
  const opfDoc = parser.parseFromString(opfContent, 'application/xml');

  // Title & Creator
  const title = opfDoc.querySelector('title, dc\\:title')?.textContent?.trim() || file.name.replace(/\.epub$/i, '');
  const creator = opfDoc.querySelector('creator, dc\\:creator')?.textContent?.trim() || 'Auteur inconnu';
  const language = opfDoc.querySelector('language, dc\\:language')?.textContent?.trim() || 'fr';
  const publisher = opfDoc.querySelector('publisher, dc\\:publisher')?.textContent?.trim() || undefined;
  const identifier = opfDoc.querySelector('identifier, dc\\:identifier')?.textContent?.trim() || undefined;

  // Manifest items and spine
  const manifestItems = new Map<string, { href: string; mediaType: string; properties?: string }>();
  opfDoc.querySelectorAll('manifest > item').forEach((el) => {
    const id = el.getAttribute('id');
    const href = el.getAttribute('href');
    const mediaType = el.getAttribute('media-type');
    const properties = el.getAttribute('properties');
    if (id && href && mediaType) {
      manifestItems.set(id, { href, mediaType, properties: properties || '' });
    }
  });

  const spineItemRefs = Array.from(opfDoc.querySelectorAll('spine > itemref'))
    .map((el) => el.getAttribute('idref'))
    .filter(Boolean) as string[];

  const chapterCount = Math.max(spineItemRefs.length, 1);

  // Cover extraction
  let coverUrl: string | undefined = undefined;
  let coverHref: string | null = null;

  // 1. Check EPUB 3 cover-image property
  for (const [, item] of manifestItems) {
    if (item.properties?.includes('cover-image')) {
      coverHref = item.href;
      break;
    }
  }

  // 2. Check EPUB 2 meta name="cover"
  if (!coverHref) {
    const coverMeta = opfDoc.querySelector('metadata > meta[name="cover"]');
    const coverId = coverMeta?.getAttribute('content');
    if (coverId && manifestItems.has(coverId)) {
      coverHref = manifestItems.get(coverId)!.href;
    }
  }

  // 3. Fallback: item with id or href containing "cover" and image type
  if (!coverHref) {
    for (const [id, item] of manifestItems) {
      if (
        (id.toLowerCase().includes('cover') || item.href.toLowerCase().includes('cover')) &&
        item.mediaType.startsWith('image/')
      ) {
        coverHref = item.href;
        break;
      }
    }
  }

  if (coverHref) {
    // Resolve relative path
    const fullCoverPath = normalizeZipPath(opfDir + coverHref);
    const coverFile = zip.file(fullCoverPath);
    if (coverFile) {
      const coverData = await coverFile.async('blob');
      coverUrl = URL.createObjectURL(coverData);
    }
  }

  // Estimate word count by reading first few spine chapters
  let totalWords = 0;
  const sampleLimit = Math.min(spineItemRefs.length, 8);
  for (let i = 0; i < sampleLimit; i++) {
    const idref = spineItemRefs[i];
    const item = manifestItems.get(idref);
    if (item) {
      const chapterPath = normalizeZipPath(opfDir + item.href);
      const content = await zip.file(chapterPath)?.async('text');
      if (content) {
        const textOnly = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
        const words = textOnly.trim().split(/\s+/).filter(Boolean).length;
        totalWords += words;
      }
    }
  }

  // Extrapolate if there are more chapters
  const wordCount = spineItemRefs.length > sampleLimit && sampleLimit > 0
    ? Math.round((totalWords / sampleLimit) * spineItemRefs.length)
    : totalWords;

  return {
    title,
    creator,
    language,
    publisher,
    identifier,
    coverUrl,
    chapterCount,
    wordCount,
    originalSize: file.size,
  };
}

/**
 * Normalizes relative path segments like 'OEBPS/../OEBPS/text.xhtml'
 */
function normalizeZipPath(path: string): string {
  const parts = path.split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
}

/**
 * Splits prose text into sentence segments while preserving trailing spaces and punctuation.
 */
function splitIntoSentences(text: string): string[] {
  if (!text || text.trim().length === 0) return [text];

  // Regex to match sentence endings followed by spaces or end of string.
  // Supports '.', '!', '?', '…', and French dialogue dashes/quotes.
  const regex = /([^.!?…]+[.!?…]+["»”']?\s*|[^.!?…]+$)/g;
  const matches = text.match(regex);
  if (!matches || matches.length === 0) {
    return [text];
  }
  return matches;
}

/**
 * Processes an XHTML document string, adding Kobo styles and wrapping paragraphs into koboSpan elements.
 */
function processXhtmlContent(
  rawContent: string,
  options: ConversionOptions
): string {
  const parser = new DOMParser();
  // Try parsing as XML
  let doc = parser.parseFromString(rawContent, 'application/xhtml+xml');
  const parserError = doc.querySelector('parsererror');

  let isHtmlFallback = false;
  if (parserError) {
    // Fallback to text/html
    doc = parser.parseFromString(rawContent, 'text/html');
    isHtmlFallback = true;
  }

  // 1. Add Kobo CSS styles to <head>
  if (options.addKoboStyle) {
    let head = doc.querySelector('head');
    if (!head && doc.documentElement) {
      head = doc.createElement('head');
      doc.documentElement.insertBefore(head, doc.documentElement.firstChild);
    }

    if (head) {
      const styleEl = doc.createElement('style');
      styleEl.setAttribute('type', 'text/css');
      styleEl.textContent = `
        body {
          -webkit-hyphens: ${options.addHyphenation ? 'auto' : 'none'};
          -moz-hyphens: ${options.addHyphenation ? 'auto' : 'none'};
          hyphens: ${options.addHyphenation ? 'auto' : 'none'};
        }
        .koboSpan { }
      `;
      head.appendChild(styleEl);
    }
  }

  // 2. Select block-level elements to add koboSpan
  // Block tags typically holding book prose
  const targetBlocks = ['p', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'dd', 'dt'];
  const blockElements = doc.querySelectorAll(targetBlocks.join(', '));

  let paragraphIndex = 1;

  blockElements.forEach((block) => {
    // Skip if already contains koboSpan
    if (block.querySelector('.koboSpan')) {
      return;
    }

    // Skip special elements like code, pre, script
    if (block.closest('pre, code, script, style, svg, math')) {
      return;
    }

    const currentPIdx = paragraphIndex++;
    let sentenceIndex = 1;

    // We process all child nodes inside the block
    const childNodes = Array.from(block.childNodes);

    childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textContent = node.textContent || '';
        if (textContent.trim().length === 0) {
          return; // preserve pure whitespace without span
        }

        const sentences = splitIntoSentences(textContent);
        const fragment = doc.createDocumentFragment();

        sentences.forEach((sentenceText) => {
          if (!sentenceText) return;
          if (sentenceText.trim().length === 0) {
            fragment.appendChild(doc.createTextNode(sentenceText));
            return;
          }

          const span = doc.createElement('span');
          span.className = 'koboSpan';
          span.id = `kobo.${currentPIdx}.${sentenceIndex++}`;
          span.textContent = sentenceText;
          fragment.appendChild(span);
        });

        if (node.parentNode) {
          node.parentNode.replaceChild(fragment, node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // If it's an inline element like <em>, <strong>, <span>, <a>
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();
        if (['em', 'strong', 'i', 'b', 'span', 'a', 'small', 'cite', 'q'].includes(tagName)) {
          // If the element has plain text, wrap its text in koboSpan
          const innerText = el.textContent || '';
          if (innerText.trim().length > 0 && !el.querySelector('.koboSpan')) {
            const span = doc.createElement('span');
            span.className = 'koboSpan';
            span.id = `kobo.${currentPIdx}.${sentenceIndex++}`;
            while (el.firstChild) {
              span.appendChild(el.firstChild);
            }
            el.appendChild(span);
          }
        }
      }
    });
  });

  // 3. Serialize back
  const serializer = new XMLSerializer();
  let serialized = serializer.serializeToString(doc);

  // If originally had XML declaration, preserve it
  if (!serialized.startsWith('<?xml') && rawContent.startsWith('<?xml')) {
    const xmlDecl = rawContent.match(/^<\?xml[^>]*\?>/)?.[0] || '<?xml version="1.0" encoding="utf-8"?>';
    serialized = xmlDecl + '\n' + serialized;
  }

  // Ensure DOCTYPE is preserved if present
  if (!serialized.includes('<!DOCTYPE') && rawContent.includes('<!DOCTYPE')) {
    const doctypeMatch = rawContent.match(/<!DOCTYPE[^>]*>/i)?.[0];
    if (doctypeMatch && !serialized.includes(doctypeMatch)) {
      if (serialized.startsWith('<?xml')) {
        const endDecl = serialized.indexOf('?>') + 2;
        serialized = serialized.slice(0, endDecl) + '\n' + doctypeMatch + '\n' + serialized.slice(endDecl).trimStart();
      } else {
        serialized = doctypeMatch + '\n' + serialized;
      }
    }
  }

  return serialized;
}

/**
 * Main conversion function: EPUB -> KEPUB.EPUB
 */
export async function convertEpubToKepub(
  file: File,
  options: ConversionOptions = DEFAULT_CONVERSION_OPTIONS,
  onProgress?: (percent: number, message: string) => void
): Promise<{ blob: Blob; fileName: string; size: number }> {
  onProgress?.(5, "Ouverture et extraction de l'archive ePub...");

  const zip = await JSZip.loadAsync(file);

  onProgress?.(15, "Lecture de la structure et du fichier package OPF...");
  const opfPath = await getOpfPath(zip);
  const opfDir = getDir(opfPath);
  const opfContent = await zip.file(opfPath)?.async('text');

  if (!opfContent) {
    throw new Error("Impossible de lire le fichier OPF de l'ePub.");
  }

  const parser = new DOMParser();
  const opfDoc = parser.parseFromString(opfContent, 'application/xml');

  // Check and add <meta property="ibooks:specified-fonts">true</meta>
  if (options.addSpecifiedFontsMeta) {
    let metadataEl: Element | null = opfDoc.getElementsByTagName('metadata')[0] || null;
    if (!metadataEl) {
      metadataEl = opfDoc.createElement('metadata');
      if (opfDoc.documentElement) {
        opfDoc.documentElement.insertBefore(metadataEl, opfDoc.documentElement.firstChild);
      } else {
        opfDoc.appendChild(metadataEl);
      }
    }
    if (metadataEl) {
      const metaTags = Array.from(metadataEl.getElementsByTagName('meta'));
      const hasSpecifiedFonts = metaTags.some(
        (m) => m.getAttribute('property') === 'ibooks:specified-fonts'
      );
      if (!hasSpecifiedFonts) {
        const meta = opfDoc.createElement('meta');
        meta.setAttribute('property', 'ibooks:specified-fonts');
        meta.textContent = 'true';
        metadataEl.appendChild(meta);
      }
    }
  }

  // Update OPF file in zip
  const serializer = new XMLSerializer();
  const updatedOpfContent = serializer.serializeToString(opfDoc);
  zip.file(opfPath, updatedOpfContent);

  // Find all XHTML and HTML content items
  const items = Array.from(opfDoc.querySelectorAll('manifest > item'));
  const xhtmlItems = items.filter((item) => {
    const mediaType = item.getAttribute('media-type') || '';
    return mediaType === 'application/xhtml+xml' || mediaType === 'text/html';
  });

  const totalItems = xhtmlItems.length;
  onProgress?.(25, `Transformation de ${totalItems} chapitres et pages...`);

  // Process each XHTML file
  let processedCount = 0;
  for (const item of xhtmlItems) {
    const href = item.getAttribute('href');
    if (!href) continue;

    const fullPath = normalizeZipPath(opfDir + href);
    const contentFile = zip.file(fullPath);

    if (contentFile) {
      const originalText = await contentFile.async('text');
      const transformedText = processXhtmlContent(originalText, options);
      zip.file(fullPath, transformedText);
    }

    processedCount++;
    const percent = Math.min(25 + Math.round((processedCount / totalItems) * 55), 80);
    onProgress?.(
      percent,
      `Optimisation Kobo (koboSpan & styles) : ${processedCount}/${totalItems} chapitres traités...`
    );
  }

  onProgress?.(85, "Reconstruction de l'archive KePub conforme aux normes Kobo...");

  // Generate output zip
  // Important EPUB specification: 'mimetype' MUST be the first file and uncompressed (STORE)
  const newZip = new JSZip();

  // 1. mimetype first
  newZip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. Add all other files
  const filePromises: Promise<void>[] = [];
  zip.forEach((relativePath, zipEntry) => {
    if (relativePath === 'mimetype') return; // already added

    if (zipEntry.dir) {
      newZip.folder(relativePath);
    } else {
      filePromises.push(
        zipEntry.async('uint8array').then((content) => {
          newZip.file(relativePath, content, { compression: 'DEFLATE' });
        })
      );
    }
  });

  await Promise.all(filePromises);

  onProgress?.(95, "Finalisation de la compression de l'archive .kepub.epub...");

  const convertedBlob = await newZip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  // Calculate new filename
  let baseName = file.name.replace(/\.epub$/i, '');
  if (!baseName.endsWith('.kepub')) {
    baseName += '.kepub';
  }
  const fileName = `${baseName}.epub`;

  onProgress?.(100, "Conversion réussie ! Prêt au téléchargement ou à l'envoi Dropbox.");

  return {
    blob: convertedBlob,
    fileName,
    size: convertedBlob.size,
  };
}
