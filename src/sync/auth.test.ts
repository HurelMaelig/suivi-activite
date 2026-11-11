import { describe, expect, it } from 'vitest'
import { parseAuthInput } from '.'

describe('connexion : lien ou code collé', () => {
  it('reconnaît le lien « Sign in » de Supabase', () => {
    const link = 'https://abc.supabase.co/auth/v1/verify?token=8f2e1c9a0b&type=magiclink&redirect_to=https://hurelmaelig.github.io/suivi-activite/'
    expect(parseAuthInput(link)).toEqual({ kind: 'link', tokenHash: '8f2e1c9a0b', type: 'magiclink' })
  })

  it('reconnaît le lien de première inscription', () => {
    const r = parseAuthInput(' https://abc.supabase.co/auth/v1/verify?token=xyz&type=signup ')
    expect(r).toEqual({ kind: 'link', tokenHash: 'xyz', type: 'signup' })
  })

  it('garde un lien collé au milieu de texte', () => {
    const r = parseAuthInput('Sign in <https://abc.supabase.co/auth/v1/verify?token=t1&type=magiclink>')
    expect(r.kind).toBe('link')
  })

  it('accepte un code à 6 chiffres', () => {
    expect(parseAuthInput('123 456')).toEqual({ kind: 'code', code: '123456' })
  })

  it('refuse le reste', () => {
    expect(parseAuthInput('bonjour').kind).toBe('invalid')
    expect(parseAuthInput('https://abc.supabase.co/auth/v1/verify?type=magiclink').kind).toBe('invalid')
  })
})
