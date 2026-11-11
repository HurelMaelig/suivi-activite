import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { OutgoingRow, Remote, RemoteRow } from './engine'

// Chargé seulement si la synchronisation est configurée, pour garder l'app légère sinon.

export function makeClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: true, // reste connecté d'une ouverture à l'autre
      autoRefreshToken: true,
      detectSessionInUrl: true, // connexion par le lien de l'e-mail, si on l'ouvre
      storageKey: 'suivi-activite-auth',
      flowType: 'implicit', // le lien de l'e-mail peut alors être collé dans l'app (voir parseAuthInput)
    },
  })
}

export function supabaseRemote(client: SupabaseClient): Remote {
  return {
    async push(rows: OutgoingRow[]) {
      const { error } = await client.rpc('push_records', { rows })
      if (error) throw error
    },
    async pull(since: string, limit: number) {
      const { data, error } = await client
        .from('records')
        .select('id, collection, data, updated_at, deleted, server_updated_at')
        .gt('server_updated_at', since || '1970-01-01T00:00:00Z')
        .order('server_updated_at', { ascending: true })
        .limit(limit)
      if (error) throw error
      // Les dates reviennent au format Postgres : on les remet au format ISO de l'app pour les comparer.
      return (data ?? []).map((r) => ({
        ...r,
        updated_at: new Date(r.updated_at).toISOString(),
        server_updated_at: new Date(r.server_updated_at).toISOString(),
      })) as RemoteRow[]
    },
    async isEmpty() {
      const { data, error } = await client.from('records').select('id').limit(1)
      if (error) throw error
      return (data ?? []).length === 0
    },
  }
}
