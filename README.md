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

Pour l'instant, **tout est enregistré sur l'appareil** (base IndexedDB du navigateur, via Dexie). Supprimer l'app de l'écran d'accueil ou effacer les données de Safari efface tout : exporte régulièrement une sauvegarde depuis **Réglages > Sauvegarde**. La synchronisation en ligne arrive en Phase 2.

Chaque enregistrement a un `id` (UUID), une date `updated_at` et un champ `deleted` (suppression douce). L'import fusionne : pour chaque élément, la version la plus récente gagne.

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

Aucun secret ne doit se trouver dans le code ni dans Git. Seule la clé publique "anon" de Supabase pourra figurer dans le front (à partir de la Phase 2), car elle est protégée par les règles d'accès (RLS).
