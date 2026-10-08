import { LocalStorage } from 'quasar'
import { supabase } from 'src/services/supabase'

const KEY = 'gstc_pending_session_release'

function read () {
  const v = LocalStorage.getItem(KEY)
  return Array.isArray(v) ? v : []
}

function write (list) {
  if (list.length) LocalStorage.set(KEY, list)
  else LocalStorage.remove(KEY)
}

export function hasPendingSessionReleases () {
  return read().length > 0
}

/** Guarda a liberação de active_sessions para quando houver conexão. */
export function queueSessionRelease (session) {
  if (!session?.equipeId) return
  const list = read().filter(r => r.teamId !== session.equipeId)
  list.push({
    teamId: session.equipeId,
    colaboradores: session.colaboradores || [],
    queuedAt: new Date().toISOString()
  })
  write(list)
}

/**
 * Libera no servidor as sessões enfileiradas. Itens que falham continuam na fila.
 * Se este aparelho já abriu novo turno da mesma equipe, o item é descartado
 * (o login novo já limpou as linhas antigas da equipe).
 */
export async function flushSessionReleases (currentSession) {
  const list = read()
  if (!list.length) return
  const remaining = []
  for (const item of list) {
    if (currentSession?.equipeId === item.teamId) continue
    let q = supabase.from('active_sessions').delete().eq('team_id', item.teamId)
    if (item.colaboradores?.length) q = q.in('colaborador', item.colaboradores)
    const { error } = await q
    if (error) remaining.push(item)
  }
  write(remaining)
}
