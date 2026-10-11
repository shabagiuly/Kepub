# Kepubify Web 📚

Convertisseur en ligne rapide et confidentiel de fichiers **ePub** vers **KePub** (format optimisé pour liseuses Kobo), avec téléchargement direct et synchronisation sans fil vers **Dropbox**.

---

## ⚡ Pourquoi le format KePub sur Kobo ?

Sur les liseuses Kobo (Clara, Libra, Sage, Forma, Elipsa, etc.), les fichiers `.kepub.epub` activent le moteur de rendu natif **ACCESS NetFront** au lieu de l'ancien moteur Adobe RMSDK :
- **Tourne de page instantanée** sans latence d'encre électronique.
- **Statistiques de lecture en direct** : temps restant dans le chapitre et dans le livre.
- **Notes de bas de page en pop-up** : aperçu immédiat sans quitter la page de lecture.
- **Zoom sur les images et cartes**.
- **Césures automatiques** et polices personnalisées.

---

## 🚀 Déploiement sur GitHub Pages (Guide en 3 étapes)

Ce projet est 100% prêt pour **GitHub Pages** (aucun serveur requis, le traitement ePub et l'envoi Dropbox fonctionnent directement dans le navigateur).

### Étape 1 : Pousser le code sur votre dépôt GitHub
```bash
git init
git add .
git commit -m "Initial commit - Kepubify Web"
git branch -M main
git remote add origin https://github.com/<VOTRE-PSEUDO>/<VOTRE-DEPOT>.git
git push -u origin main
```

### Étape 2 : Activer GitHub Pages via GitHub Actions
1. Rendez-vous sur votre dépôt GitHub dans votre navigateur.
2. Cliquez sur l'onglet **Settings** (Paramètres).
3. Dans le menu de gauche, descendez jusqu'à **Pages**.
4. Sous la section **Build and deployment** :
   - Pour **Source**, sélectionnez **GitHub Actions** (au lieu de *Deploy from a branch*).
5. C'est tout ! Le workflow inclus (`.github/workflows/deploy.yml`) se déclenchera automatiquement et déploiera votre application en 1 minute à l'adresse :
   ```
   https://<VOTRE-PSEUDO>.github.io/<VOTRE-DEPOT>/
   ```

---

## ☁️ Configuration de la synchronisation Dropbox

Sur les liseuses Kobo compatibles (Forma, Sage, Elipsa, Clara Colour, Libra Colour...), Kobo synchronise automatiquement les livres situés dans votre dossier Dropbox :
- **`/Applications/Rakuten Kobo`** (si votre compte Dropbox est en français)
- **`/Apps/Rakuten Kobo`** (si votre compte Dropbox est en anglais)

### Pour connecter votre compte Dropbox :
1. Rendez-vous sur la [Dropbox App Console](https://www.dropbox.com/developers/apps).
2. Cliquez sur **Create app** :
   - Choisissez **Scoped access**
   - Choisissez **Full Dropbox** (ou *App folder*)
   - Donnez un nom à votre application (ex: `KoboSync-MonNom`).
3. Dans l'onglet **Permissions** :
   - Cochez **`files.content.write`** et **`account_info.read`** (cliquez sur *Submit* en bas).
4. **Ensuite**, retournez dans l'onglet **Settings** :
   - Sous *OAuth 2*, cliquez sur **"Generate"** sous *Generated access token*.
   - Copiez ce jeton d'accès et collez-le dans l'application.

> 🔒 **Confidentialité garantie** : Votre clé d'accès Dropbox est enregistrée uniquement dans le `localStorage` de votre navigateur. Si vous partagez le lien GitHub Pages avec d'autres personnes, elles n'auront jamais accès à votre clé ni à vos fichiers.

---

## 🔐 Protéger l'accès par mot de passe (Zéro stockage en clair)

Vous pouvez verrouiller l'accès à votre application sur GitHub Pages par mot de passe. Aucun mot de passe n'est stocké en clair dans le code : l'application utilise une **empreinte cryptographique SHA-256** unidirectionnelle.

1. Ouvrez l'application et cliquez sur **Options de conversion** en haut.
2. Sous la section **Protection par mot de passe**, saisissez votre mot de passe secret.
3. Cliquez sur **« Copier le hash pour GitHub Secrets »**.
4. Sur votre dépôt GitHub :
   - Allez dans **Settings** &rarr; **Secrets and variables** &rarr; **Actions**.
   - Cliquez sur **New repository secret**.
   - Nom : `APP_PASSWORD_HASH`
   - Valeur : Collez l'empreinte SHA-256 copiée.
5. GitHub Pages redéploie automatiquement : l'application est désormais verrouillée et demandera votre mot de passe à l'ouverture !

---

## 🛠️ Développement local

```bash
# Installation des dépendances
npm install

# Lancement du serveur de développement (port 3000)
npm run dev

# Construction de la version de production (dossier dist/)
npm run build
```

---

## 📄 Licence
Sous licence Apache-2.0. 
