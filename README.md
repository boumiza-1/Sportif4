# SPORTIFANO — Boutique + Admin — GitHub Pages + Firebase RTDB

## Architecture
All files sit **directly at the repository root**. `index.html` = customer storefront. `admin.html` = management. No PHP, Python, server process, or build step needed.

### Setup
1. Upload every file to your GitHub repository root (main). Settings > Pages > Deploy from branch > main > /(root).
2. Firebase Console > project sport24-b111c > Project settings > Your apps > add Web app. Copy **apiKey**, **messagingSenderId**, **appId** to `firebase.js`. Auth domain, databaseURL and projectId are already included; check storageBucket if changed.
3. Authentication > Sign-in method > enable Email/Password. Add your admin account in Users.
4. Realtime Database > Data > `admins` > `<YOUR COMPLETE UID>` = string `admin`. **Only the Firebase console project owner should set this**. Rules below prevent clients from editing admin privileges.
5. Realtime Database > Rules > paste `database.rules.json` and publish. Never use `.read:true, .write:true` at root.
6. Auth > Settings > Authorized domains > add `USERNAME.github.io` if needed.
7. Open `https://USERNAME.github.io/REPOSITORY/` and `/admin.html`. Sign in as the UID-marked admin, add real products with image HTTPS URLs, size/color/stock, manage orders and settings.

### No demo data
Store starts without fake products; add your own from admin. An optional button allows you to import sample products **only if you want**. Real products, orders, categories and settings persist in RTDB.

### Important limitations before taking real payments/orders
- This is a **working Firebase-connected front-end**, not a fully hardened commercial checkout. Orders originate from untrusted client browsers: prices, totals and stock are not verified server-side and stock is not reserved atomically. For real-money production, add Firebase Cloud Functions or a trusted payment/order backend, rate-limiting and server-side validation.
- Cash on delivery only; no online payment integration.
- Images use public HTTPS URLs, not Firebase Storage upload. `storage.rules` denies uploads until a secure admin upload backend is implemented.
- Customer orders require signing in; a customer can view only their orders via filtered RTDB queries.
- Dynamic product/catalog updates require refresh. CSS motion design changes with hover and viewport, but **Google does not automatically redesign this website**. Google Fonts used for typography; other external images are optional and sourced from public URLs.
- A custom domain like `www.sportifano.com` can later point to GitHub Pages with DNS + Pages settings.


CONFIGURATION 10/10/2026: firebase.js already contains the supplied Firebase Web configuration for sport24-b111c. Realtime Database rules must be published separately in Firebase Console. Authentication Email/Password and admins/UID="admin" must be enabled. Firebase storage image upload requires configured storage rules and available Storage service. This is not a payment-processing or server-side verified stock/order system.


## Photos et couverture (mise à jour)
- Admin > Produits > Ajouter > choisir photo: aperçu avant envoi, puis upload dans Firebase Storage et URL sauvegardée sous `products`.
- Admin > Paramètres > Couverture accueil: envoyer une image puis enregistrer. La boutique affichera cette image sur l'accueil.
- La case Email du service client a été enlevée des Paramètres. L'email de connexion Admin reste obligatoire avec Firebase Email/Password.
- IMPORTANT: Pour autoriser les uploads en toute sécurité, les règles `storage.rules` utilisent un **custom claim `admin: true`** qui DOIT être attribué à l'utilisateur administrateur avec le Firebase Admin SDK depuis un environnement sûr; `admins/UID = admin` dans Realtime Database ne suffit PAS pour les règles Storage. Ne jamais mettre une clé Admin SDK/service account sur GitHub. Firebase Storage peut exiger un compte de facturation. Tant que le custom claim et Firebase Storage ne sont pas configurés, l'upload sera refusé (`storage/unauthorized`).
- Ces règles sont intentionnellement restrictives : ne pas autoriser tout utilisateur connecté à uploader.


## Cloudinary (ajout octobre 2026)
- Cloud Name: `b1gbrfyv`
- Upload Preset: `sportifano_upload` (Unsigned)
- `admin.html` -> Produits -> Choisir une photo; Paramètres -> Couverture.
- Fichier `cloudinary.js` : upload direct de JPG/PNG/WEBP jusqu'à 5 Mo, puis sauvegarde de l'URL dans Realtime Database.
- **Important** : vérifiez que `sportifano_upload` est bien en mode Unsigned et que les formats/taille maximale sont limités dans Cloudinary. Un preset Unsigned n'est **pas** réservé au seul administrateur : toute personne le découvrant dans le code public peut potentiellement téléverser des images. Pour une mise en production sécurisée, utilisez un backend de signature des uploads, avec contrôle admin; n'exposez jamais l'API Secret côté GitHub Pages.
- Les commandes stockées côté navigateur ne sont pas une source de vérité financière : prix et stocks doivent être vérifiés côté serveur avant ventes réelles.


## Correction du blocage "Envoi image"
- `cloudinary.js` now limits each upload to 25 seconds and shows the API error.
- Upload preset `sportifano_upload` must be **Unsigned**, active, and allow JPG/PNG/WEBP under 5 MB.
- Commit ALL root files to GitHub including `cloudinary.js` and configured `firebase.js`.
- If the error says "Upload preset not found" or "must be signed", fix preset settings in Cloudinary.
- If the error says "permission_denied", inspect Firebase Realtime Database rules.
- Security: unsigned uploads are not administrator-only; production should use an authenticated upload service.
