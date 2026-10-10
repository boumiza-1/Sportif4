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
