# Sportifano Admin — installation & notifications commandes

## Ce qui fonctionne dès le déploiement GitHub Pages
- PWA installable via **https://www.sportifano.com/admin.html**.
- Tableau de bord mobile et gestion des commandes.
- Nouvelle commande mise à jour **en direct**, avec bandeau ouvrant les détails quand la page admin est ouverte et que l'administrateur est authentifié.
- Authentification et accès aux commandes réservés aux administrateurs définis dans `admins/<uid> = "admin"` de Firebase Realtime Database.

## Activer les notifications quand l'application est fermée
L'hébergement GitHub Pages ne peut **pas** envoyer les notifications tout seul. Cette partie nécessite Firebase Cloud Messaging **et** la Cloud Function du dossier `functions/`.

1. Dans [Firebase Console](https://console.firebase.google.com/) ouvrez le projet **sport24-b111c** (même projet que `firebase.js`).
2. Dans **Project settings → Cloud Messaging → Web Push certificates**, créez ou copiez votre **clé publique VAPID**. Pas de clé privée sur GitHub. Vérifiez que l'API Firebase Cloud Messaging est activée.
3. Ouvrez l'administration Sportifano → **Paramètres** → **Clé Web Push publique (VAPID)**, collez la clé publique et enregistrez.
4. Activez la facturation **Blaze** si nécessaire pour déployer Cloud Functions. Vérifiez les quotas et règles de facturation.
5. Sur votre PC avec Node.js + Firebase CLI : `npm install -g firebase-tools`, `firebase login`, `firebase use sport24-b111c`.
6. Dans le dossier du projet : `npm --prefix functions install` puis `firebase deploy --only database,functions:notifySportifanoNewOrder`.
7. Sur le téléphone : ouvrez **https://www.sportifano.com/admin.html** via Chrome Android, connectez-vous avec le compte admin, utilisez **Installer l’application** (ou le menu Chrome → Installer). Dans l'application admin : **Activer les notifications**, puis autorisez les notifications du navigateur/système.
8. Pour tester : créez une commande réelle de test avec un compte client distinct et vérifiez l'alerte et son ouverture sur votre téléphone. Ne partagez pas vos mots de passe ni le token FCM.

### iPhone / Safari
Sur iPhone, utilisez Safari → Partager → **Sur l'écran d'accueil**. Les notifications Web Push requièrent une version iOS compatible, une PWA installée et l'autorisation explicite de l'utilisateur. **La disponibilité Firebase Messaging varie selon le navigateur** : vérifiez `isSupported()` sur le téléphone. Si elle n'est pas prise en charge, la consultation en temps réel reste disponible quand l'admin est ouvert, mais les notifications à application fermée exigent une autre voie (p.ex. app native ou service push compatible).

## Sécurité
- La Cloud Function se déclenche **une seule fois par commande nouvellement créée** dans Realtime Database.
- Elle vérifie les administrateurs autorisés avant d'envoyer les notifications à leurs appareils enregistrés.
- Le message push ne contient **aucune donnée personnelle** : ni nom, téléphone, adresse, ni détails des produits. Pour les consulter, il faut être connecté au compte admin.
- Les tokens d'appareils sont enregistrés dans `adminPushTokens/<uid>/<deviceId>`, avec des règles de lecture/écriture réservées aux administrateurs.
- Déconnexion via le bouton de l'Admin tente de révoquer les notifications de cet appareil.
- Aucun secret de serveur ou clé de compte de service ne doit être commité dans GitHub.
- Le service worker ne met pas en cache les pages ou commandes administrateur.

## Diagnostic
- **Aucune proposition d'installation** : vérifier HTTPS, Chrome, les icônes, le manifest et le menu Installer.
- **Clé VAPID manquante** : remplir Paramètres, puis réactiver.
- **Notifications refusées** : réinitialiser le droit dans les réglages navigateur ou téléphone.
- **Les notifications fonctionnent dans l'admin mais pas fermé** : vérifier la Cloud Function déployée, les logs Firebase et l'enregistrement FCM token dans RTDB.
- **Pas de notification pour une commande existante** : normal, l'alerte serveur ne concerne que les **nouvelles commandes**.
- **Application sur iPhone sans Push** : tester la compatibilité du navigateur/SDK, puis envisager une application native ou fournisseur Web Push compatible.

## Important
Une mise à jour GitHub Pages **ne déploie pas** les règles Firebase et les Cloud Functions. Ces commandes doivent être exécutées explicitement dans Firebase avant de promettre les push à application fermée.
