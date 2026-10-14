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

const REG_KEY = 'gstc_pending_session_register'

function readReg () {
  const v = LocalStorage.getItem(REG_KEY)
  return Array.isArray(v) ? v : []
}

function writeReg (list) {
  if (list.length) LocalStorage.set(REG_KEY, list)
  else LocalStorage.remove(REG_KEY)
}

export function hasPendingSessionReleases () {
  return read().length > 0 || readReg().length > 0
}

/** Guarda o registro do turno (active_sessions) quando o login não conseguiu gravar no servidor. */
export function queueSessionRegister ({ teamId, prefixo, colaboradores, data }) {
  if (!teamId || !colaboradores?.length) return
  const list = readReg().filter(r => r.teamId !== teamId)
  list.push({ teamId, prefixo, colaboradores, data, queuedAt: new Date().toISOString() })
  writeReg(list)
}

/** Grava no servidor os turnos pendentes do turno ainda aberto neste aparelho. */
async function flushSessionRegisters (currentSession) {
  const list = readReg()
  if (!list.length) return
  const remaining = []
  for (const item of list) {
    if (currentSession?.equipeId !== item.teamId) continue
    const del = await supabase.from('active_sessions').delete().eq('team_id', item.teamId)
    if (del.error) { remaining.push(item); continue }
    const { error } = await supabase.from('active_sessions').insert(
      item.colaboradores.map(colaborador => ({
        team_id: item.teamId,
        prefixo: item.prefixo,
        colaborador,
        data: item.data
      }))
    )
    if (error) remaining.push(item)
  }
  writeReg(remaining)
}

/** Guarda a liberação de active_sessions para quando houver conexão. */
export function queueSessionRelease (session) {
  if (!session?.equipeId) return
  writeReg(readReg().filter(r => r.teamId !== session.equipeId))
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
  await flushSessionRegisters(currentSession)
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
