<template>
  <q-page class="teams-page">

    <!-- Acesso restrito -->
    <div v-if="!isAdmin" class="access-denied">
      <q-icon name="lock" size="64px" class="q-mb-md" style="color:#ef4444;opacity:.6" />
      <div class="denied-title">Acesso restrito</div>
      <div class="denied-sub">Você não tem permissão para acessar esta página.</div>
    </div>

    <template v-else>
      <!-- ── Header ─────────────────────────────────────────── -->
      <div class="teams-header">
        <div>
          <div class="teams-title">Equipes</div>
          <div class="teams-sub">{{ filtered.length }} de {{ teamsStore.teams.length }} equipes</div>
        </div>
        <div class="header-actions">
          <button class="action-btn action-btn--ghost" @click="triggerImport" :disabled="importing">
            <q-spinner-dots v-if="importing" size="14px" />
            <q-icon v-else name="upload_file" size="16px" />
            Importar Excel
          </button>
          <button class="action-btn action-btn--ghost" @click="exportExcel">
            <q-icon name="download" size="16px" /> Exportar Excel
          </button>
          <button class="action-btn" @click="openCreate">
            <q-icon name="add" size="16px" /> Nova equipe
          </button>
          <!-- input oculto para importação -->
          <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display:none" @change="handleImport" />
        </div>
      </div>

      <!-- ── Filtros ─────────────────────────────────────────── -->
      <div class="filters-bar">
        <div class="search-wrap">
          <q-icon name="search" size="18px" style="color:#4b5680" />
          <input
            v-model="search"
            class="search-input"
            placeholder="Buscar por prefixo, nome ou responsável…"
          />
        </div>

        <select v-model="filterBase" class="filter-select">
          <option value="">Todas as bases</option>
          <option v-for="b in bases" :key="b" :value="b">{{ b }}</option>
        </select>

        <select v-model="filterProcesso" class="filter-select">
          <option value="">Todos os processos</option>
          <option v-for="p in processos" :key="p" :value="p">{{ p }}</option>
        </select>

        <select v-model="filterStatus" class="filter-select">
          <option value="">Qualquer status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>

        <button v-if="hasFilters" class="clear-btn" @click="clearFilters">
          <q-icon name="close" size="14px" /> Limpar
        </button>
      </div>

      <!-- ── Tabela ──────────────────────────────────────────── -->
      <div class="table-wrap">
        <div v-if="teamsStore.loading" class="table-loading">
          <q-spinner-dots size="40px" color="primary" />
        </div>

        <table v-else class="teams-table">
          <thead>
            <tr>
              <th @click="sortBy('prefixo')" class="sortable">Prefixo
                <q-icon :name="sortCol === 'prefixo' ? (sortAsc ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'" size="14px" />
              </th>
              <th @click="sortBy('nome')" class="sortable">Nome
                <q-icon :name="sortCol === 'nome' ? (sortAsc ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'" size="14px" />
              </th>
              <th>Responsável</th>
              <th>Base</th>
              <th>Processo</th>
              <th>Status</th>
              <th class="col-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="team in paginated" :key="team.id" class="team-row">
              <td>
                <span class="prefix-chip">{{ team.prefixo }}</span>
              </td>
              <td class="cell-nome">{{ team.nome }}</td>
              <td class="cell-resp">{{ team.responsavel || '—' }}</td>
              <td>
                <span class="base-tag">{{ team.base || '—' }}</span>
              </td>
              <td>
                <span class="proc-tag" :class="`proc-${(team.processo||'').toLowerCase()}`">
                  {{ team.processo || '—' }}
                </span>
              </td>
              <td>
                <span class="status-dot" :class="team.status === 'ativo' ? 'dot-on' : 'dot-off'" />
                {{ team.status === 'ativo' ? 'Ativo' : 'Inativo' }}
              </td>
              <td class="cell-actions">
                <button class="icon-btn edit-btn" title="Editar" @click="openEdit(team)">
                  <q-icon name="edit" size="16px" />
                </button>
                <button class="icon-btn del-btn" title="Excluir" @click="confirmDelete(team)">
                  <q-icon name="delete_outline" size="16px" />
                </button>
              </td>
            </tr>
            <tr v-if="!paginated.length">
              <td colspan="7" class="empty-row">Nenhuma equipe encontrada</td>
            </tr>
          </tbody>
        </table>

        <!-- Paginação -->
        <div class="pagination" v-if="totalPages > 1">
          <button class="page-btn" :disabled="page === 1" @click="page--">‹</button>
          <button
            v-for="p in totalPages" :key="p"
            class="page-btn" :class="{ active: p === page }"
            @click="page = p"
          >{{ p }}</button>
          <button class="page-btn" :disabled="page === totalPages" @click="page++">›</button>
        </div>
      </div>
    </template>

    <!-- ── Dialog importação ─────────────────────────────── -->
    <q-dialog v-model="showImport" persistent style="z-index:9999">
      <div class="import-dialog">
        <div class="dialog-header">
          <div class="dialog-title">
            <q-icon name="upload_file" size="18px" class="q-mr-xs" color="primary" />
            Importar equipes — {{ importRows.length }} linha(s)
          </div>
          <button class="dialog-close" @click="showImport = false"><q-icon name="close" size="20px" /></button>
        </div>

        <div class="import-legend">
          <q-badge color="positive" label="Novo" class="q-mr-sm" />registro não existe ainda
          <q-badge color="warning" label="Atualizar" class="q-mx-sm" />prefixo já existe
          <q-badge color="negative" label="Erro" class="q-mx-sm" />linha inválida (sem prefixo)
        </div>

        <div class="import-table-wrap">
          <table class="teams-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Prefixo</th>
                <th>Nome</th>
                <th>Responsável</th>
                <th>Base</th>
                <th>Processo</th>
                <th>Status equipe</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in importRows" :key="i" :class="rowClass(row)">
                <td>
                  <q-badge
                    :color="row._status === 'novo' ? 'positive' : row._status === 'atualizar' ? 'warning' : 'negative'"
                    :label="row._status === 'novo' ? 'Novo' : row._status === 'atualizar' ? 'Atualizar' : 'Erro'"
                  />
                </td>
                <td><span class="prefix-chip">{{ row.prefixo || '—' }}</span></td>
                <td>{{ row.nome }}</td>
                <td>{{ row.responsavel }}</td>
                <td>{{ row.base }}</td>
                <td>{{ row.processo }}</td>
                <td>{{ row.status }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="dialog-footer">
          <div class="import-summary">
            <span class="import-stat import-stat--new">{{ importStats.novo }} novos</span>
            <span class="import-stat import-stat--upd">{{ importStats.atualizar }} atualizações</span>
            <span v-if="importStats.erro" class="import-stat import-stat--err">{{ importStats.erro }} erros (ignorados)</span>
          </div>
          <button class="btn-cancel" @click="showImport = false">Cancelar</button>
          <button class="btn-save" :class="{ loading: saving }" @click="applyImport" :disabled="saving || !importStats.valid">
            <q-spinner-dots v-if="saving" size="16px" />
            <template v-else>
              <q-icon name="save" size="16px" />
              Aplicar importação
            </template>
          </button>
        </div>
      </div>
    </q-dialog>

    <!-- ── Dialog editar/criar ────────────────────────────── -->
    <q-dialog v-model="showDialog" persistent>
      <div class="edit-dialog">
        <div class="dialog-header">
          <div class="dialog-title">{{ isEditing ? 'Editar equipe' : 'Nova equipe' }}</div>
          <button class="dialog-close" @click="showDialog = false"><q-icon name="close" size="20px" /></button>
        </div>

        <div class="dialog-body">
          <div class="field-row">
            <div class="field-col">
              <label class="field-lbl">Prefixo *</label>
              <input v-model="form.prefixo" class="field-inp" placeholder="MA-PDS-M001M" :disabled="isEditing" />
            </div>
            <div class="field-col">
              <label class="field-lbl">Nome da equipe *</label>
              <input v-model="form.nome" class="field-inp" placeholder="Nome do responsável" />
            </div>
          </div>
          <div class="field-row">
            <div class="field-col">
              <label class="field-lbl">Responsável</label>
              <input v-model="form.responsavel" class="field-inp" />
            </div>
            <div class="field-col">
              <label class="field-lbl">Supervisor</label>
              <input v-model="form.supervisor" class="field-inp" />
            </div>
          </div>
          <div class="field-row">
            <div class="field-col">
              <label class="field-lbl">Base</label>
              <select v-model="form.base" class="field-inp">
                <option value="">— Selecione —</option>
                <option v-for="b in bases" :key="b" :value="b">{{ b }}</option>
              </select>
            </div>
            <div class="field-col">
              <label class="field-lbl">Processo</label>
              <select v-model="form.processo" class="field-inp">
                <option value="">— Selecione —</option>
                <option v-for="p in processos" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
          </div>
          <div class="field-row">
            <div class="field-col">
              <label class="field-lbl">Gerência</label>
              <input v-model="form.gerencia" class="field-inp" />
            </div>
            <div class="field-col">
              <label class="field-lbl">Coordenador</label>
              <input v-model="form.coordenador" class="field-inp" />
            </div>
          </div>
          <div class="field-row">
            <div class="field-col">
              <label class="field-lbl">Status</label>
              <select v-model="form.status" class="field-inp">
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn-cancel" @click="showDialog = false">Cancelar</button>
          <button class="btn-save" :class="{ loading: saving }" @click="saveTeam" :disabled="saving">
            <q-spinner-dots v-if="saving" size="16px" />
            <template v-else>
              <q-icon name="save" size="16px" />
              {{ isEditing ? 'Salvar alterações' : 'Criar equipe' }}
            </template>
          </button>
        </div>
      </div>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTeamsStore } from 'src/stores/teams'
import { useAuthStore } from 'src/stores/auth'
import { useQuasar } from 'quasar'
import * as XLSX from 'xlsx'

const teamsStore = useTeamsStore()
const authStore  = useAuthStore()
const $q = useQuasar()

const isAdmin = computed(() => authStore.isAdmin)

// ── Filtros ─────────────────────────────────────────────
const search        = ref('')
const filterBase    = ref('')
const filterProcesso = ref('')
const filterStatus  = ref('')
const page          = ref(1)
const perPage       = 20
const sortCol       = ref('prefixo')
const sortAsc       = ref(true)

const hasFilters = computed(() =>
  search.value || filterBase.value || filterProcesso.value || filterStatus.value
)

function clearFilters () {
  search.value = filterBase.value = filterProcesso.value = filterStatus.value = ''
  page.value = 1
}

function sortBy (col) {
  if (sortCol.value === col) sortAsc.value = !sortAsc.value
  else { sortCol.value = col; sortAsc.value = true }
}

// Listas únicas para selects
const bases = computed(() => {
  const s = new Set(teamsStore.teams.map(t => t.base).filter(Boolean))
  return [...s].sort()
})
const processos = ['GERE', 'GOMAN', 'GSTC']

// ── Dados filtrados ──────────────────────────────────────
const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return teamsStore.teams
    .filter(t => {
      if (q && !t.prefixo?.toLowerCase().includes(q) &&
                !t.nome?.toLowerCase().includes(q) &&
                !t.responsavel?.toLowerCase().includes(q)) return false
      if (filterBase.value    && t.base     !== filterBase.value)    return false
      if (filterProcesso.value && t.processo !== filterProcesso.value) return false
      if (filterStatus.value  && t.status   !== filterStatus.value)  return false
      return true
    })
    .sort((a, b) => {
      const va = (a[sortCol.value] || '').toString()
      const vb = (b[sortCol.value] || '').toString()
      return sortAsc.value ? va.localeCompare(vb) : vb.localeCompare(va)
    })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage)))
const paginated  = computed(() => {
  const start = (page.value - 1) * perPage
  return filtered.value.slice(start, start + perPage)
})

// ── Dialog ───────────────────────────────────────────────
const showDialog = ref(false)
const saving     = ref(false)
const isEditing  = ref(false)
const editingId  = ref(null)

const emptyForm = () => ({ prefixo: '', nome: '', responsavel: '', supervisor: '', gerencia: '', coordenador: '', base: '', processo: '', status: 'ativo' })
const form = ref(emptyForm())

function openCreate () {
  if (!isAdmin.value) return
  isEditing.value = false
  editingId.value = null
  form.value = emptyForm()
  showDialog.value = true
}

function openEdit (team) {
  if (!isAdmin.value) return
  isEditing.value = true
  editingId.value = team.id
  form.value = {
    prefixo:     team.prefixo     || '',
    nome:        team.nome        || '',
    responsavel: team.responsavel || '',
    supervisor:  team.supervisor  || '',
    gerencia:    team.gerencia    || '',
    coordenador: team.coordenador || '',
    base:        team.base        || '',
    processo:    team.processo    || '',
    status:      team.status      || 'ativo'
  }
  showDialog.value = true
}

async function saveTeam () {
  if (!isAdmin.value) {
    $q.notify({ type: 'negative', message: 'Sem permissão para editar.' })
    return
  }
  if (!form.value.prefixo || !form.value.nome) {
    $q.notify({ type: 'warning', message: 'Prefixo e nome são obrigatórios.' })
    return
  }
  saving.value = true
  try {
    if (isEditing.value) {
      await teamsStore.updateTeam(editingId.value, { ...form.value })
      $q.notify({ type: 'positive', message: 'Equipe atualizada!' })
    } else {
      await teamsStore.createTeam({ ...form.value })
      $q.notify({ type: 'positive', message: 'Equipe criada!' })
    }
    showDialog.value = false
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message })
  } finally {
    saving.value = false
  }
}

function confirmDelete (team) {
  if (!isAdmin.value) {
    $q.notify({ type: 'negative', message: 'Sem permissão para excluir.' })
    return
  }
  $q.dialog({
    title: 'Excluir equipe',
    message: `Excluir <b>${team.prefixo}</b> — ${team.nome}?<br/>Esta ação não pode ser desfeita.`,
    html: true,
    cancel: { flat: true, label: 'Cancelar' },
    ok: { unelevated: true, color: 'negative', label: 'Excluir' }
  }).onOk(async () => {
    try {
      await teamsStore.deleteTeam(team.id)
      $q.notify({ type: 'positive', message: 'Equipe excluída.' })
    } catch (e) {
      $q.notify({ type: 'negative', message: e.message })
    }
  })
}

onMounted(() => { if (isAdmin.value) teamsStore.fetchTeams() })

// ── Export Excel ─────────────────────────────────────────
function exportExcel () {
  const cols = ['prefixo', 'nome', 'responsavel', 'supervisor', 'coordenador', 'gerencia', 'base', 'processo', 'status']
  const header = ['Prefixo', 'Nome', 'Responsável', 'Supervisor', 'Coordenador', 'Gerência', 'Base', 'Processo', 'Status']
  const data = [header, ...filtered.value.map(t => cols.map(c => t[c] || ''))]
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [14, 28, 28, 20, 16, 18, 14, 10, 10].map(w => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Equipes')
  XLSX.writeFile(wb, `equipes-${new Date().toISOString().split('T')[0]}.xlsx`)
  $q.notify({ type: 'positive', message: `${filtered.value.length} equipes exportadas!` })
}

// ── Import Excel ─────────────────────────────────────────
const fileInput  = ref(null)
const importing  = ref(false)
const showImport = ref(false)
const importRows = ref([])

const importStats = computed(() => {
  const novo      = importRows.value.filter(r => r._status === 'novo').length
  const atualizar = importRows.value.filter(r => r._status === 'atualizar').length
  const erro      = importRows.value.filter(r => r._status === 'erro').length
  return { novo, atualizar, erro, valid: novo + atualizar > 0 }
})

function triggerImport () {
  if (!isAdmin.value) return
  fileInput.value.value = ''
  fileInput.value.click()
}

function rowClass (row) {
  if (row._status === 'novo')      return 'import-row--new'
  if (row._status === 'atualizar') return 'import-row--upd'
  return 'import-row--err'
}

async function handleImport (evt) {
  const file = evt.target.files[0]
  if (!file) return
  importing.value = true
  try {
    const buf = await file.arrayBuffer()
    const wb  = XLSX.read(buf, { type: 'array' })
    const ws  = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    if (raw.length < 2) throw new Error('Planilha vazia ou sem dados.')

    // Detecta colunas pelo cabeçalho (row 0)
    const hdr = raw[0].map(h => String(h).trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, ''))
    const col = k => hdr.findIndex(h => h.includes(k))
    const iP = col('prefixo'), iN = col('nome'), iR = col('respons')
    const iS = col('superv'), iC = col('coord'), iG = col('gerenc')
    const iB = col('base'), iO = col('process'), iT = col('status')

    const existingPrefixos = new Set(teamsStore.teams.map(t => t.prefixo))

    importRows.value = raw.slice(1)
      .filter(r => r.some(c => c !== ''))
      .map(r => {
        const prefixo = String(r[iP] ?? '').trim().toUpperCase()
        return {
          prefixo,
          nome:        String(r[iN] ?? '').trim(),
          responsavel: String(r[iR] ?? '').trim(),
          supervisor:  iS >= 0 ? String(r[iS] ?? '').trim() : '',
          coordenador: iC >= 0 ? String(r[iC] ?? '').trim() : '',
          gerencia:    iG >= 0 ? String(r[iG] ?? '').trim() : '',
          base:        iB >= 0 ? String(r[iB] ?? '').trim() : '',
          processo:    iO >= 0 ? String(r[iO] ?? '').trim() : '',
          status:      iT >= 0 ? String(r[iT] ?? '').trim().toLowerCase() || 'ativo' : 'ativo',
          _status: !prefixo ? 'erro' : existingPrefixos.has(prefixo) ? 'atualizar' : 'novo'
        }
      })

    showImport.value = true
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao ler arquivo: ' + e.message })
  } finally {
    importing.value = false
  }
}

async function applyImport () {
  if (!isAdmin.value) return
  saving.value = true
  try {
    const valid = importRows.value.filter(r => r._status !== 'erro')
    let created = 0, updated = 0, errors = 0
    for (const row of valid) {
      const { _status, ...payload } = row
      try {
        if (_status === 'novo') {
          await teamsStore.createTeam(payload)
          created++
        } else {
          const team = teamsStore.teams.find(t => t.prefixo === payload.prefixo)
          if (team) { await teamsStore.updateTeam(team.id, payload); updated++ }
        }
      } catch { errors++ }
    }
    showImport.value = false
    await teamsStore.fetchTeams()
    $q.notify({
      type: 'positive',
      message: `Importação concluída: ${created} criados, ${updated} atualizados${errors ? `, ${errors} erros` : ''}.`,
      timeout: 5000
    })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro na importação: ' + e.message })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* ── Page ─────────────────────────────────────────────── */
.teams-page {
  padding: 32px 36px;
  background: var(--background);
  min-height: 100vh;
  color: var(--fg);
  font-family: 'Manrope', sans-serif;
}

/* ── Access denied ───────────────────────────────────── */
.access-denied {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  height: 60vh; gap: 8px;
}
.denied-title { font-family: 'Sora', sans-serif; font-size: 1.5rem; font-weight: 700; color: var(--destructive); }
.denied-sub   { color: var(--muted-fg); font-size: 0.9rem; }

/* ── Header ──────────────────────────────────────────── */
.teams-header {
  display: flex; align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px; gap: 16px; flex-wrap: wrap;
}
.teams-title {
  font-family: 'Sora', sans-serif;
  font-size: 1.6rem; font-weight: 700;
  color: var(--fg); letter-spacing: -0.01em;
}
.teams-sub   { font-size: 0.82rem; color: var(--muted-fg); margin-top: 3px; }
.header-actions { display: flex; gap: 10px; align-items: center; }

.action-btn {
  display: flex; align-items: center; gap: 6px;
  background: var(--primary); color: var(--primary-fg);
  border: none; border-radius: 8px;
  font-family: 'Manrope', sans-serif; font-size: 0.85rem; font-weight: 600;
  padding: 9px 18px; cursor: pointer;
  transition: box-shadow 0.2s, opacity 0.2s;
}
.action-btn:hover { box-shadow: var(--shadow-energy); opacity: 0.9; }
.action-btn--ghost {
  background: transparent;
  border: 1.5px solid var(--border);
  color: var(--muted-fg);
}
.action-btn--ghost:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: color-mix(in oklab, var(--primary) 8%, transparent);
}
.action-btn:disabled { opacity: 0.45; cursor: default; }

/* ── Filtros ─────────────────────────────────────────── */
.filters-bar {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 18px; flex-wrap: wrap;
}

.search-wrap {
  display: flex; align-items: center; gap: 8px;
  background: var(--card); border: 1px solid var(--border);
  border-radius: 8px; padding: 8px 14px; flex: 1; min-width: 220px;
  transition: border-color 0.18s;
}
.search-wrap:focus-within { border-color: color-mix(in oklab, var(--primary) 50%, var(--border)); }
.search-input {
  background: transparent; border: none; outline: none;
  color: var(--fg); font-family: 'Manrope', sans-serif; font-size: 0.875rem; width: 100%;
}
.search-input::placeholder { color: var(--muted-fg); opacity: 0.5; }

.filter-select {
  background: var(--card); border: 1px solid var(--border); border-radius: 8px;
  color: var(--muted-fg); font-family: 'Manrope', sans-serif; font-size: 0.82rem;
  padding: 8px 12px; cursor: pointer; outline: none; color-scheme: dark;
  transition: border-color 0.18s;
}
.filter-select:focus { border-color: color-mix(in oklab, var(--primary) 50%, var(--border)); }

.clear-btn {
  display: flex; align-items: center; gap: 4px;
  background: transparent; border: 1px solid var(--border);
  color: var(--muted-fg); border-radius: 8px; font-family: 'Manrope', sans-serif;
  font-size: 0.78rem; padding: 8px 12px; cursor: pointer; transition: all 0.15s;
}
.clear-btn:hover { color: var(--destructive); border-color: var(--destructive); }

/* ── Tabela ──────────────────────────────────────────── */
.table-wrap {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 12px; overflow: hidden;
}

.table-loading { display: flex; justify-content: center; padding: 60px; }

.teams-table { width: 100%; border-collapse: collapse; font-size: 0.845rem; }

.teams-table thead tr {
  background: var(--background); border-bottom: 1px solid var(--border);
}

.teams-table th {
  padding: 13px 16px; text-align: left;
  font-size: 0.67rem; letter-spacing: 0.09em;
  text-transform: uppercase; color: var(--muted-fg); font-weight: 700;
  white-space: nowrap;
}
.teams-table th.sortable { cursor: pointer; user-select: none; }
.teams-table th.sortable:hover { color: var(--fg); }

.team-row { border-bottom: 1px solid color-mix(in oklab, var(--border) 50%, transparent); transition: background 0.12s; }
.team-row:hover { background: color-mix(in oklab, var(--background) 60%, transparent); }
.team-row:last-child { border-bottom: none; }

.teams-table td { padding: 12px 16px; color: var(--fg); vertical-align: middle; }

.prefix-chip {
  background: color-mix(in oklab, var(--primary) 14%, transparent);
  color: var(--primary);
  border: 1px solid color-mix(in oklab, var(--primary) 28%, transparent);
  border-radius: 6px; padding: 3px 9px;
  font-size: 0.77rem; font-weight: 700; white-space: nowrap; font-family: monospace;
}

.cell-nome { font-weight: 600; max-width: 200px; }
.cell-resp { color: var(--muted-fg); font-size: 0.82rem; max-width: 180px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.base-tag {
  background: color-mix(in oklab, var(--border) 40%, transparent);
  color: var(--muted-fg);
  border-radius: 5px; padding: 2px 8px;
  font-size: 0.74rem; font-weight: 600;
}

.proc-tag {
  border-radius: 5px; padding: 3px 9px;
  font-size: 0.71rem; font-weight: 700; letter-spacing: 0.04em;
  background: color-mix(in oklab, var(--primary) 14%, transparent);
  color: var(--primary);
}
.proc-gstc { background: rgba(59,130,246,0.13); color: #93c5fd; }
.proc-gere { background: rgba(168,85,247,0.13); color: #d8b4fe; }

.status-dot {
  display: inline-block; width: 7px; height: 7px;
  border-radius: 50%; margin-right: 6px; vertical-align: middle;
}
.dot-on  { background: #4ade80; box-shadow: 0 0 6px #4ade8060; }
.dot-off { background: var(--muted-fg); opacity: 0.4; }

.cell-actions { text-align: right; white-space: nowrap; }
.icon-btn {
  background: transparent; border: none; cursor: pointer;
  padding: 6px; border-radius: 6px; transition: background 0.15s;
  display: inline-flex; align-items: center;
}
.edit-btn { color: var(--primary); }
.edit-btn:hover { background: color-mix(in oklab, var(--primary) 14%, transparent); }
.del-btn  { color: var(--destructive); }
.del-btn:hover { background: color-mix(in oklab, var(--destructive) 12%, transparent); }

.empty-row { text-align: center; padding: 48px; color: var(--muted-fg); }

/* ── Paginação ───────────────────────────────────────── */
.pagination {
  display: flex; align-items: center; justify-content: center;
  gap: 4px; padding: 14px; border-top: 1px solid var(--border);
}
.page-btn {
  background: transparent; border: 1px solid var(--border);
  color: var(--muted-fg); border-radius: 6px; padding: 5px 11px;
  font-size: 0.82rem; cursor: pointer; transition: all 0.15s;
  font-family: 'Manrope', sans-serif;
}
.page-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.page-btn.active { background: var(--primary); border-color: var(--primary); color: var(--primary-fg); font-weight: 700; }
.page-btn:disabled { opacity: 0.3; cursor: default; }

/* ── Dialogs ─────────────────────────────────────────── */
.edit-dialog {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 14px; width: 600px; max-width: 96vw;
  box-shadow: 0 24px 80px rgba(0,0,0,0.5);
}
.import-dialog {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 14px; width: 900px; max-width: 96vw;
  max-height: 90vh; display: flex; flex-direction: column;
  box-shadow: 0 24px 80px rgba(0,0,0,0.5);
}

.dialog-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
}
.dialog-title {
  font-family: 'Sora', sans-serif;
  font-size: 1rem; font-weight: 600; color: var(--fg);
}
.dialog-close {
  background: transparent; border: none; color: var(--muted-fg);
  cursor: pointer; border-radius: 6px; padding: 4px;
  display: flex; align-items: center; transition: color 0.15s;
}
.dialog-close:hover { color: var(--fg); }

.dialog-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }

.field-row { display: flex; gap: 14px; }
.field-col { flex: 1; display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.field-lbl {
  font-size: 0.68rem; color: var(--muted-fg);
  text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;
}
.field-inp {
  background: var(--background); border: 1px solid var(--border); border-radius: 8px;
  color: var(--fg); font-family: 'Manrope', sans-serif; font-size: 0.88rem;
  padding: 9px 12px; outline: none; width: 100%; color-scheme: dark;
  transition: border-color 0.18s;
}
.field-inp:focus { border-color: color-mix(in oklab, var(--primary) 60%, var(--border)); }
.field-inp:disabled { opacity: 0.4; cursor: not-allowed; }

.dialog-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 10px;
  padding: 16px 24px; border-top: 1px solid var(--border);
}
.btn-cancel {
  background: transparent; border: 1px solid var(--border); color: var(--muted-fg);
  border-radius: 8px; font-family: 'Manrope', sans-serif; font-size: 0.85rem;
  padding: 9px 20px; cursor: pointer; transition: all 0.15s;
}
.btn-cancel:hover { border-color: var(--fg); color: var(--fg); }

.btn-save {
  display: flex; align-items: center; gap: 7px;
  background: var(--primary); color: var(--primary-fg);
  border: none; border-radius: 8px;
  font-family: 'Manrope', sans-serif; font-size: 0.85rem; font-weight: 700;
  padding: 9px 22px; cursor: pointer;
  transition: box-shadow 0.18s, opacity 0.18s;
  min-width: 160px; justify-content: center;
}
.btn-save:hover:not(:disabled) { box-shadow: var(--shadow-energy); }
.btn-save:disabled { opacity: 0.45; cursor: default; }

/* ── Import extras ───────────────────────────────────── */
.import-legend {
  padding: 10px 24px; font-size: 0.78rem; color: var(--muted-fg);
  border-bottom: 1px solid var(--border);
}
.import-table-wrap { overflow: auto; flex: 1; max-height: 55vh; }

.import-summary { display: flex; gap: 12px; align-items: center; flex: 1; font-size: 0.82rem; }
.import-stat        { font-weight: 700; }
.import-stat--new   { color: #4ade80; }
.import-stat--upd   { color: var(--primary); }
.import-stat--err   { color: var(--destructive); }

.import-row--new td { background: rgba(74,222,128,0.05); }
.import-row--upd td { background: color-mix(in oklab, var(--primary) 5%, transparent); }
.import-row--err td { background: color-mix(in oklab, var(--destructive) 5%, transparent); opacity: 0.55; }
</style>
