# Suivi activité

Application web personnelle de suivi sportif et alimentaire, installable sur iPhone (PWA) et utilisable hors ligne.

Construite avec Vite, React et TypeScript. Hébergée sur GitHub Pages.

## Ce que fait l'app

- **Accueil** : minutes d'activité, calories brûlées (estimées), pas (saisie manuelle), semaine en pastilles, séance suggérée, résumé des repas.
- **Salle** : séance suggérée selon le temps disponible (45 / 60 / 75 min), saisie série par série, minuteur de repos, historique modifiable, gestion des exercices et des séances types.
- **Cardio** : course, vélo, natation ; dernière sortie, kilomètres par semaine, volume conseillé (+10 % maximum par semaine), objectif annuel.
- **Repas** : calories et macros du jour, idées de plats, ajout depuis tes aliments, les recettes, Open Food Facts (recherche ou code-barres) ou en saisie libre.
- **Stats** : totaux par jour, semaine, mois ou année, minutes par semaine, records personnels, courbe de poids.
- **Réglages** : thème, profil, objectifs, besoins estimés, sauvegarde et import d'un fichier JSON.

Les règles de suggestion (double progression, semaine allégée, cardio, nutrition, idées de repas) sont dans `src/lib/rules/`. Elles tournent sur le téléphone, sans réseau.

## Où sont les données

**Tout est d'abord enregistré sur l'appareil** (base IndexedDB du navigateur, via Dexie) : l'app marche sans réseau. Une fois connecté dans **Réglages > Compte et synchronisation**, les données sont aussi sauvegardées sur Supabase et partagées entre tes appareils.

Chaque enregistrement a un `id` (UUID), une date `updated_at` et un champ `deleted` (suppression douce). En cas de conflit, à la synchronisation comme à l'import d'un fichier, la version la plus récente gagne.

La synchronisation (`src/sync/`) envoie les changements locaux, puis récupère ceux du serveur. Elle se lance à l'ouverture, au retour du réseau, quelques secondes après une modification et toutes les 5 minutes. Un appareil neuf qui se connecte à un compte existant remplace ses données de départ par celles du compte (pas de doublons).

## Configurer Supabase (une seule fois)

1. Crée un projet sur [supabase.com](https://supabase.com) (offre gratuite).
2. **SQL Editor > New query** : colle le contenu de `supabase/schema.sql`, puis **Run**. Le script crée la table `records`, les règles d'accès (chaque compte ne voit que ses lignes) et la fonction d'envoi.
3. **Authentication > URL Configuration** :
   - Site URL : `https://hurelmaelig.github.io/suivi-activite/`
   - Redirect URLs : ajoute `http://localhost:5173/**` et `http://localhost:4173/**`
4. **Authentication > Emails > Magic Link** : le modèle doit contenir le code `{{ .Token }}`. Sur iPhone, l'app installée ne peut pas recevoir le lien (il s'ouvre dans Safari, qui a son propre stockage) : on tape donc le code dans l'app.
5. Récupère l'adresse du projet et la clé publique (**publishable** ou **anon**) :
   - en local, dans un fichier `.env.local` (jamais commité) :

     ```
     VITE_SUPABASE_URL=https://xxxx.supabase.co
     VITE_SUPABASE_KEY=sb_publishable_xxxx
     ```

   - pour le site en ligne, dans les variables du dépôt GitHub (`SUPABASE_URL` et `SUPABASE_KEY`) :

     ```bash
     gh variable set SUPABASE_URL --body "https://xxxx.supabase.co"
     ```

     ```bash
     gh variable set SUPABASE_KEY --body "sb_publishable_xxxx"
     ```

Ne mets **jamais** la clé `secret` / `service_role` ni le mot de passe de la base dans l'app ou dans Git.

**Pause du projet gratuit** : Supabase met en pause un projet gratuit inactif depuis environ 7 jours. Le workflow `.github/workflows/keep-alive.yml` envoie une petite requête le lundi et le jeudi pour l'éviter. Si le projet est quand même en pause, l'app l'indique et reste utilisable en local ; il suffit de le relancer depuis le tableau de bord Supabase (**Restore project**).

## Tests

```bash
npm test
```

Les tests vérifient les règles de calcul, la lecture des saisies et la sauvegarde.

## Lancer l'app sur le PC

Il faut [Node.js](https://nodejs.org) (version LTS). Dans PowerShell, depuis ce dossier :

```bash
npm install
```

```bash
npm run dev
```

Ouvre ensuite l'adresse affichée dans le terminal (`http://localhost:5173`).

Le mode hors ligne ne fonctionne pas avec `npm run dev`. Pour le tester, utilise la version finale :

```bash
npm run build
```

```bash
npm run preview
```

À savoir : Open Food Facts refuse la **recherche par nom** depuis `localhost`. Elle ne fonctionne que sur l'adresse en ligne. La recherche par code-barres marche partout.

## Déployer

Chaque envoi sur la branche `main` lance `.github/workflows/deploy.yml`, qui construit l'app et la publie :

```bash
git push
```

Le suivi se trouve dans l'onglet **Actions** du dépôt GitHub. L'adresse de l'app est `https://<compte>.github.io/<depot>/`.

Réglage à faire une seule fois sur GitHub : **Settings > Pages > Source : GitHub Actions**.

## Installer sur iPhone

1. Ouvre l'adresse de l'app dans **Safari**.
2. Touche le bouton **Partager**, puis **Sur l'écran d'accueil**.
3. Lance l'app depuis son icône : elle s'ouvre en plein écran et fonctionne sans réseau.

## Régénérer les icônes

Après une modification de `public/favicon.svg` :

```bash
npx @vite-pwa/assets-generator --preset minimal-2023 public/favicon.svg
```

## Secrets

Aucun secret ne doit se trouver dans le code ni dans Git. Seule la clé publique de Supabase (publishable / anon) figure dans l'app construite, car elle est protégée par les règles d'accès (RLS).
