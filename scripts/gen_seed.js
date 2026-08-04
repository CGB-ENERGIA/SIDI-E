const XLSX = require('../node_modules/xlsx')
const fs = require('fs')

const wb = XLSX.readFile('C:/Users/Italo/Downloads/BASE DE DADOS - SIDIE.xlsx')
const ws = wb.Sheets['BASE DE DADOS - SIDI-E']
const rows = XLSX.utils.sheet_to_json(ws)

const seen = new Set()
const teams = rows.filter(r => {
  const p = r['PREFIXO']
  if (!p || p === 'N/A' || seen.has(p)) return false
  seen.add(p)
  return true
})

const esc = s => (s || '').replace(/'/g, "''")

let sql = `-- Migração: colunas extras na tabela teams
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS responsavel text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS supervisor text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS gerencia text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS base text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS processo text;

-- Seed: equipes da base de dados SIDI-E (${teams.length} equipes)
INSERT INTO public.teams (prefixo, nome, responsavel, supervisor, gerencia, base, processo) VALUES
`

const values = teams.map(r => {
  const prefixo    = esc(r['PREFIXO'] || '')
  const nome       = esc(r['RESPONSÁVEL'] || '')
  const responsavel = esc(r['RESPONSÁVEL'] || '')
  const supervisor = esc(r['SUPERVISOR'] || '')
  const gerencia   = esc(r['GERÊNCIA'] || r['GERENCIA'] || '')
  const base       = esc(r['BASE'] || '')
  const processo   = esc(r['PROCESSO'] || '')
  return `('${prefixo}', '${nome}', '${responsavel}', '${supervisor}', '${gerencia}', '${base}', '${processo}')`
})

sql += values.join(',\n') + '\nON CONFLICT (prefixo) DO NOTHING;\n'

fs.writeFileSync('supabase/seed_teams.sql', sql)
console.log('Equipes:', teams.length)
console.log('Bases:', [...new Set(teams.map(t => t['BASE']))].join(', '))
console.log('Gerencias:', [...new Set(teams.map(t => t['GERÊNCIA'] || t['GERENCIA']))].join(', '))
console.log('Processos:', [...new Set(teams.map(t => t['PROCESSO']))].filter(Boolean).join(', '))
