# Suivi activité

Application web personnelle de suivi sportif et alimentaire, installable sur iPhone (PWA) et utilisable hors ligne.

Construite avec Vite, React et TypeScript. Hébergée sur GitHub Pages.

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
