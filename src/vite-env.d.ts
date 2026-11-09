/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Adresse et clé publique du projet Supabase (fichier .env.local ou variables GitHub)
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
