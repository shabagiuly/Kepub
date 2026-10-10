import JSZip from 'jszip';

/**
 * Creates a valid, well-structured sample EPUB file in memory
 * (Jules Verne - Vingt Mille Lieues sous les mers)
 */
export async function createSampleEpub(): Promise<File> {
  const zip = new JSZip();

  // 1. mimetype (STORE)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // 3. SVG Cover Image as PNG or SVG
  const coverSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="600" height="900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="40%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <rect width="600" height="900" fill="url(#bg)"/>
  <rect x="24" y="24" width="552" height="852" fill="none" stroke="url(#gold)" stroke-width="2" stroke-opacity="0.6"/>
  <circle cx="300" cy="400" r="140" fill="none" stroke="url(#gold)" stroke-width="1.5" stroke-dasharray="4,6" opacity="0.5"/>
  <path d="M 220,400 Q 300,320 380,400 Q 300,480 220,400 Z" fill="none" stroke="url(#gold)" stroke-width="2" opacity="0.8"/>
  <circle cx="300" cy="400" r="18" fill="url(#gold)"/>
  <text x="300" y="160" text-anchor="middle" font-family="Georgia, serif" font-size="20" fill="#94a3b8" letter-spacing="4">JULES VERNE</text>
  <text x="300" y="240" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="bold" fill="#f8fafc">VINGT MILLE LIEUES</text>
  <text x="300" y="285" text-anchor="middle" font-family="Georgia, serif" font-size="28" font-style="italic" fill="url(#gold)">SOUS LES MERS</text>
  <text x="300" y="740" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#64748b" letter-spacing="2">ÉDITION HETZEL · KOBO READY</text>
</svg>`;

  zip.file('OEBPS/images/cover.svg', coverSvg);

  // 4. CSS
  zip.file(
    'OEBPS/styles/style.css',
    `body {
  font-family: Georgia, serif;
  line-height: 1.6;
  margin: 5%;
  color: #1a1a1a;
}
h1, h2 {
  font-family: 'Plus Jakarta Sans', sans-serif;
  text-align: center;
  margin-top: 1.5em;
  color: #0f172a;
}
p {
  text-indent: 1.2em;
  margin: 0 0 0.5em 0;
  text-align: justify;
}
.first-p {
  text-indent: 0;
}
.italic {
  font-style: italic;
}`
  );

  // 5. Chapters
  const chapter1 = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <title>Chapitre I : Un écueil fuyant</title>
  <link rel="stylesheet" type="text/css" href="styles/style.css"/>
</head>
<body>
  <h1>Chapitre I</h1>
  <h2>Un écueil fuyant</h2>
  <p class="first-p">L’année 1866 fut marquée par un événement bizarre, un phénomène inexpliqué et inexplicable qui n’a certainement été oublié de personne. Depuis quelque temps, les gens de mer étaient particulièrement émus.</p>
  <p>Les négociants, armateurs, capitaines de navires, skippers et masters de l’Europe et de l’Amérique, officiers des marines militaires de tous pays, et, après eux, les gouvernements des divers États des deux continents, s’inquiétaient au plus haut point.</p>
  <p>En effet, depuis quelque temps, plusieurs navires s’étaient rencontrés avec « une chose énorme », un objet long, fusiforme, parfois phosphorescent, infiniment plus vaste et plus rapide qu’une baleine. Les faits relatifs à cette apparition, consignés sur divers livres de bord, s’accordaient assez exactement sur la structure de l’objet ou de l’être en question, la vitesse inouïe de ses mouvements, la puissance surprenante de sa locomotion, la vie particulière dont il semblait doué.</p>
  <p>Si c’était un cétacé, il surpassait en volume tous ceux que la science avait classés jusqu’alors. Ni Cuvier, ni Lacépède, ni M. Dumeril, ni M. de Quatrefages n’eussent admis l’existence d’un tel monstre, à moins de l’avoir vu de leurs propres yeux de savants.</p>
</body>
</html>`;

  const chapter2 = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <title>Chapitre II : M. Aronnax</title>
  <link rel="stylesheet" type="text/css" href="styles/style.css"/>
</head>
<body>
  <h1>Chapitre II</h1>
  <h2>Monsieur Aronnax</h2>
  <p class="first-p">Au moment où ces événements se produisaient, je revenais d’une exploration scientifique entreprise dans les mauvaises terres du Nebraska, aux États-Unis.</p>
  <p>En ma qualité de professeur adjoint au Muséum d’histoire naturelle de Paris, le gouvernement français m’avait adjoint à cette expédition. Après six mois passés dans le Nebraska, chargé de précieuses collections, j’arrivai à New York vers la fin de mars. Mon départ pour la France était fixé aux premiers jours de mai.</p>
  <p>Je m’occupais donc de classer mes richesses minéralogiques, botaniques et zoologiques, quand arriva l’incident du <em>Scotia</em>. J’étais parfaitement au courant de la question à l’ordre du jour, et comment ne l’aurais-je pas été ? J’avais lu et relu tous les journaux américains et européens sans être plus avancé.</p>
  <p>Ce mystère m’intriguait. Dans l’impossibilité de me former une opinion, je flottais d’un extrême à l’autre. Qu’il y eût une chose, cela ne pouvait être mis en doute, et les incrédules étaient invités à mettre le doigt sur la plaie du <em>Scotia</em>.</p>
</body>
</html>`;

  zip.file('OEBPS/chapter1.xhtml', chapter1);
  zip.file('OEBPS/chapter2.xhtml', chapter2);

  // 6. content.opf
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">urn:uuid:12345678-verne-20000lieues-sample</dc:identifier>
    <dc:title>Vingt Mille Lieues sous les mers (Extrait)</dc:title>
    <dc:creator>Jules Verne</dc:creator>
    <dc:language>fr</dc:language>
    <dc:publisher>Éditions Pierre-Jules Hetzel</dc:publisher>
    <meta name="cover" content="cover-image"/>
  </metadata>
  <manifest>
    <item id="cover-image" href="images/cover.svg" media-type="image/svg+xml" properties="cover-image"/>
    <item id="style" href="styles/style.css" media-type="text/css"/>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`;

  zip.file('OEBPS/content.opf', opf);

  // Generate blob and File object
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
  });

  return new File([blob], 'Vingt-Mille-Lieues-sous-les-mers-Jules-Verne.epub', {
    type: 'application/epub+zip',
  });
}
