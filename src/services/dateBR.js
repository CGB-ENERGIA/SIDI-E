// Datas no fuso de Brasília (UTC-3, sem horário de verão desde 2019).
// toISOString() e "T00:00:00" sem offset usam UTC e viram o dia às 21h de Brasília.
const TZ = 'America/Sao_Paulo'

/** Hoje em Brasília, YYYY-MM-DD. */
export function hojeBrasilia () {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

/** Dia (YYYY-MM-DD, Brasília) de um timestamp ISO. */
export function diaBrasilia (iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA', { timeZone: TZ })
}

/** Início do dia (Brasília) de uma data YYYY-MM-DD, como ISO em UTC. */
export function inicioDiaBrasilia (ymd) {
  return new Date(`${ymd}T00:00:00-03:00`).toISOString()
}

/** Fim do dia (Brasília) de uma data YYYY-MM-DD, como ISO em UTC. */
export function fimDiaBrasilia (ymd) {
  return new Date(`${ymd}T23:59:59.999-03:00`).toISOString()
}
