# Plan d'implémentation : Connexion Dropbox OAuth 2.0 PKCE permanente & Jeton de secours

## Objectif
Activer le flux **OAuth 2.0 PKCE** pour Dropbox afin d'obtenir un jeton d'actualisation permanent (*refresh token*) qui se renouvelle automatiquement et silencieusement en arrière-plan sans jamais expirer, tout en conservant l'option de **saisie manuelle de jeton (4h)** comme solution de secours.

---

## 1. Modifications de l'interface (`DropboxModal.tsx`)

- **Système d'onglets pour le choix de méthode** :
  1. **Onglet « Connexion permanente (Recommandé) »** :
     - Champ de saisie pour l'**App Key** Dropbox (clé publique présente dans l'onglet *Settings* de votre console Dropbox).
     - Affichage de l'**URI de redirection** calculée dynamiquement (compatible GitHub Pages `https://<user>.github.io/<repo>` et environnement local) avec bouton **« Copier l'URL »** en un clic pour l'ajouter dans la console Dropbox.
     - Bouton principal **« 🔗 Se connecter avec Dropbox »** qui lance l'autorisation sécurisée PKCE (redirection officielle Dropbox avec validation des permissions).
     - Guide pas-à-pas concis pour configurer l'App Key et l'URL de redirection.
  2. **Onglet « Jeton manuel (Secours) »** :
     - Conserve le champ de saisie existant avec le jeton temporaire généré manuellement (valable 4h).
     - Rappel utile pour les tests rapides sans configuration de Redirect URI.

- **État connecté amélioré** :
  - Badge de statut indiquant clairement le type de session :
    - 🟢 *Connexion permanente (OAuth PKCE) — Renouvellement automatique actif*
    - 🟡 *Jeton temporaire manuel (expiration après 4h)* avec un bouton direct pour basculer vers la connexion permanente.
  - Conservation des réglages de dossier (`/Applications/Rakuten Kobo`, détection automatique, etc.).

---

## 2. Cycle de vie et rafraîchissement automatique (`src/App.tsx` & `src/lib/dropbox.ts`)

- **Gestion du retour OAuth (`handleDropboxOAuthCallback`)** :
  - Dans `App.tsx`, ajout d'un `useEffect` au chargement de l'application qui détecte le paramètre `?code=` retourné par Dropbox après autorisation.
  - Échange immédiat du code contre l'`access_token` et le `refresh_token`.
  - Nettoyage propre de l'URL sans rechargement de page (`history.replaceState`).
  - Notification toast de confirmation de connexion permanente.

- **Rafraîchissement automatique et silencieux (`getValidAccessToken`)** :
  - Avant chaque téléversement de livre (`uploadFileToDropbox`), l'application appelle `getValidAccessToken(config)`.
  - Si le jeton d'accès actuel est expiré ou proche de l'expiration (< 5 min), l'application utilise automatiquement le `refresh_token` pour obtenir un nouvel `access_token` sans aucune interruption pour l'utilisateur.
  - La nouvelle clé et sa date d'expiration sont sauvegardées dans `localStorage`.

- **Compatibilité multi-environnements** :
  - Support transparent du mode proxy serveur local (`/api/dropbox/token`) et du mode direct GitHub Pages (`https://api.dropboxapi.com/oauth2/token`).
  - Détection fiable de l'URL de redirection exacte (prenant en compte le sous-chemin éventuel sur GitHub Pages).

---

## 3. Plan de vérification et tests

1. **Compilation & Linting** :
   - Exécution de `lint_applet` (`tsc --noEmit`).
   - Exécution de `compile_applet` (`vite build && esbuild server.ts`).
2. **Validation fonctionnelle** :
   - Vérification de l'affichage des deux onglets dans la modale Dropbox.
   - Vérification du bouton de copie de l'URI de redirection.
   - Vérification de l'interception du callback `?code=` et de l'initialisation de session.
   - Vérification du rafraîchissement transparent de token lors de l'envoi de fichier.
