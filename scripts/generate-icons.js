import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resvg } from '@resvg/resvg-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Base SVG for iOS apple-touch-icon & PWA icons (square, full-bleed #1c1917 stone-900 with amber book)
function createSvg(size, scale = 0.55, borderRadius = 0) {
  const iconSize = size * scale;
  const offset = (size - iconSize) / 2;
  const rx = (borderRadius / 100) * size;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#292524" />
      <stop offset="100%" stop-color="#1c1917" />
    </linearGradient>
    <linearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef3c7" />
      <stop offset="100%" stop-color="#fde68a" />
    </linearGradient>
    <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="${size * 0.015}" stdDeviation="${size * 0.02}" flood-color="#000000" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Background tile -->
  <rect width="${size}" height="${size}" rx="${rx}" fill="url(#bgGrad)" />

  <!-- Center Book Icon (Lucide BookOpen geometry) -->
  <g transform="translate(${offset}, ${offset}) scale(${iconSize / 24})" filter="url(#subtleShadow)">
    <!-- Book pages line -->
    <path d="M12 7v14" stroke="url(#bookGrad)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    <!-- Book open wings -->
    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" stroke="url(#bookGrad)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>
`.trim();
}

// 2. Favicon SVG with rounded squircle
const faviconSvg = createSvg(64, 0.6, 22);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);
fs.writeFileSync(path.join(publicDir, 'icon.svg'), faviconSvg);

// 3. Render PNGs using Resvg
const targets = [
  { name: 'apple-touch-icon.png', size: 180, scale: 0.58, radius: 0 },
  { name: 'apple-touch-icon-precomposed.png', size: 180, scale: 0.58, radius: 0 },
  { name: 'pwa-192x192.png', size: 192, scale: 0.58, radius: 0 },
  { name: 'pwa-512x512.png', size: 512, scale: 0.58, radius: 0 },
  { name: 'pwa-maskable-512x512.png', size: 512, scale: 0.44, radius: 0 }, // with 15% safe zone padding
];

for (const target of targets) {
  const svg = createSvg(target.size, target.scale, target.radius);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: target.size },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  fs.writeFileSync(path.join(publicDir, target.name), pngBuffer);
  console.log(`Generated: ${target.name} (${target.size}x${target.size})`);
}

// 4. Generate Web App Manifest
const manifest = {
  id: './',
  name: 'Kepubify Web',
  short_name: 'Kepubify',
  description: 'Convertisseur ePub vers KePub pour liseuses Kobo avec synchronisation Dropbox.',
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'any',
  theme_color: '#1c1917',
  background_color: '#fafaf9',
  icons: [
    {
      src: './pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: './pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: './pwa-maskable-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};

fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(publicDir, 'site.webmanifest'), JSON.stringify(manifest, null, 2));
console.log('Generated manifest.json and site.webmanifest');
