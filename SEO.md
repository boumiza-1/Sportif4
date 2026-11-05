# Publication et référencement de Sportifano

Le site publié est généré par `.github/workflows/seo-pages.yml` à partir du catalogue public Firebase. Les commandes, comptes et données privées ne sont jamais utilisés pour la génération. Le domaine canonique reste `https://www.sportifano.com`, conforme au fichier `CNAME`.

## Pages créées

- Accueil avec les produits déjà présents dans le HTML, le slogan « MOVE YOUR WAY » et une présentation de la boutique en Tunisie.
- `/produits/<identifiant-Firebase>/` : une URL stable par produit visible, même après changement de nom. Chaque fiche possède son titre, sa description, son canonical, ses métadonnées de partage, ses informations produit, ses liens et ses données structurées `Product`/`Offer` en TND.
- `/collections/<nom-normalisé-et-identifiant>/` : une page par collection, avec ses liens produits et son fil d’Ariane. Les collections vides ne sont pas indexables et sont exclues du sitemap.
- `/contact/` et `/livraison/` : coordonnées réellement renseignées, étapes de commande et paiement à la livraison. Aucun délai, adresse, politique de retour ni information commerciale manquante n’est inventé.
- `/sitemap.xml`, `/robots.txt` et une vraie page 404. La connexion administrateur porte `noindex` et reste protégée par l’authentification et les règles Firebase.

Les images Cloudinary sont délivrées avec des tailles adaptées et un format/une qualité automatiques. L’image principale est présente dès le HTML initial. Les titres, textes alternatifs et liens restent lisibles sans JavaScript ; le panier et les comptes nécessitent JavaScript et Firebase.

## Actualisation des produits

Les nouvelles données restent affichées directement depuis Firebase dans la boutique. Les pages destinées aux moteurs sont régénérées après chaque publication du code et chaque heure, à la minute 17, selon la disponibilité des exécuteurs GitHub. Les horaires GitHub Actions peuvent être retardés et les tâches planifiées des dépôts publics peuvent être désactivées après une longue période sans activité.

Un nouveau produit ajouté entre deux générations reste achetable par sa fiche interactive ; aucun lien vers une page non encore générée n’est montré. Après génération réussie, il possède sa vraie page et apparaît dans le sitemap. Même principe pour une nouvelle catégorie. Les prix/stock actuels sont relus pour le panier ; si leur lecture échoue, les pages restent consultables mais la commande est désactivée, sans données fictives.

Pour actualiser immédiatement les pages : GitHub → Actions → **Publish SEO storefront** → **Run workflow** sur `main`. Aucun token GitHub ne doit être enregistré dans le navigateur ou dans l’interface Admin.

## Déploiement

Le workflow utilise Node.js 24 et les actions officielles épinglées. Il teste, lit les collections publiques `products` et `settings/store`, puis génère et publie `dist`. Un échec de lecture Firebase fait échouer le build ; il ne remplace pas les produits par des exemples. `dist` ne contient que les fichiers nécessaires au site, pas les tests, scripts de génération ni documents internes.

Au premier déploiement réussi sur `main`, le workflow tente de sélectionner **GitHub Actions** comme source Pages, sans changer le domaine. Si GitHub refuse cette opération, le propriétaire doit choisir **Settings → Pages → Build and deployment → Source → GitHub Actions**, puis relancer le workflow. Une branche `seo-static-pages` sert à vérifier le build réel avant la première migration ; elle ne déploie pas le site.

## Vérifications locales

- `node tests/seo-build.test.mjs` : génération, échappement, prix/stock, liens, sitemap, données privées exclues, refus d’effacement de dossiers étrangers.
- `node tests/seo-browser.cjs` : avec Playwright/Chromium installés, lecture sans JavaScript, navigation, options, panier, données actuelles, pannes et mobile. `CHROMIUM_PATH` sélectionne le binaire si nécessaire. Ces tests utilisent exclusivement des données simulées.
- `node scripts/build-seo.mjs --data /chemin/catalogue.json --out /tmp/sportifano-site` : génération de contrôle à partir d’un export public `{ "products": { ... }, "settings": { ... } }`. Sans `--data`, la commande lit le catalogue public réel.

## Après publication : Google

La technique permet aux moteurs de découvrir et comprendre les pages ; elle ne garantit ni une place dans les résultats ni un délai de mise à jour. Le propriétaire peut ajouter `sportifano.com` dans Google Search Console, vérifier la propriété du domaine, puis soumettre `https://www.sportifano.com/sitemap.xml`. Inspecter ensuite l’accueil et quelques fiches produit dans l’outil d’inspection d’URL. La vérification DNS/Search Console nécessite l’accès du propriétaire et n’est pas effectuée par ce changement.

Vérifier également que HTTP et le domaine sans `www` redirigent vers le domaine HTTPS canonique. Le code et le sitemap définissent l’URL préférée ; les enregistrements DNS et les redirections de l’hébergeur doivent rester cohérents. Les performances réelles et les éventuelles erreurs d’indexation se suivent dans Search Console après collecte de données.
