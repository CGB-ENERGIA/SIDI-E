<template>
  <q-page class="users-page">

    <!-- Acesso restrito -->
    <div v-if="!isAdmin" class="access-denied">
      <q-icon name="lock" size="64px" class="q-mb-md" style="color:#ef4444;opacity:.6" />
      <div class="denied-title">Acesso restrito</div>
      <div class="denied-sub">Apenas administradores podem gerenciar usuários.</div>
    </div>

    <template v-else>
      <!-- ── Header ─────────────────────────────────────────── -->
      <div class="page-header">
        <div>
          <div class="page-title">Usuários & Acessos</div>
          <div class="page-sub">{{ filtered.length }} usuário{{ filtered.length !== 1 ? 's' : '' }} encontrado{{ filtered.length !== 1 ? 's' : '' }}</div>
        </div>
        <button class="action-btn" @click="openCreate">
          <q-icon name="person_add" size="16px" /> Novo usuário
        </button>
      </div>

      <!-- ── Filtro ──────────────────────────────────────────── -->
      <div class="filters-bar">
        <div class="search-wrap">
          <q-icon name="search" size="18px" style="color:#4b5680" />
          <input v-model="search" class="search-input" placeholder="Buscar por e-mail ou nome…" />
        </div>
      </div>

      <!-- ── Tabela ──────────────────────────────────────────── -->
      <div class="table-wrap">
        <div v-if="loading" class="table-loading">
          <q-spinner-dots size="40px" color="primary" />
        </div>

        <table v-else class="data-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Papel</th>
              <th>Criado em</th>
              <th>Último acesso</th>
              <th>Confirmado</th>
              <th style="width:120px">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in filtered" :key="u.id">
              <td>
                <div class="user-cell">
                  <div class="user-avatar">{{ initials(u.email) }}</div>
                  <div>
                    <div class="user-email">{{ u.email }}</div>
                    <div class="user-meta">{{ u.user_metadata?.nome || '—' }}</div>
                  </div>
                </div>
              </td>
              <td>
                <select
                  class="role-select"
                  :class="'role-' + getRole(u)"
                  :value="getRole(u)"
                  :disabled="savingRole === u.id"
                  @change="changeRole(u, $event.target.value)"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td class="date-cell">{{ fmt(u.created_at) }}</td>
              <td class="date-cell">{{ u.last_sign_in_at ? fmt(u.last_sign_in_at) : 'Nunca' }}</td>
              <td>
                <span class="badge" :class="u.email_confirmed_at ? 'badge-ok' : 'badge-warn'">
                  {{ u.email_confirmed_at ? 'Sim' : 'Pendente' }}
                </span>
              </td>
              <td>
                <div class="row-actions">
                  <button class="icon-btn" title="Redefinir senha" @click="openReset(u)">
                    <q-icon name="lock_reset" size="16px" />
                  </button>
                  <button class="icon-btn danger" title="Desativar usuário" @click="openDelete(u)">
                    <q-icon name="person_off" size="16px" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="5" style="text-align:center;padding:40px;color:#6b7280">
                Nenhum usuário encontrado.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ── Dialog: Criar usuário ──────────────────────────── -->
    <q-dialog v-model="showCreate" persistent>
      <q-card style="min-width:400px;border-radius:12px">
        <q-card-section class="q-pb-sm">
          <div class="text-h6">Novo usuário</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.email" label="E-mail *" outlined dense
            hint="Ex: nome.sobrenome@cgbengenharia.com.br" />
          <q-input v-model="form.nome" label="Nome completo" outlined dense />
          <q-input v-model="form.matricula" label="Matrícula" outlined dense />
          <q-input v-model="form.password" label="Senha *" outlined dense
            :type="showPwd ? 'text' : 'password'"
            hint="Mínimo 8 caracteres">
            <template #append>
              <q-icon :name="showPwd ? 'visibility_off' : 'visibility'"
                class="cursor-pointer" @click="showPwd = !showPwd" />
            </template>
          </q-input>
          <div class="row items-center justify-between q-mt-xs">
            <span class="text-caption text-grey-6">Gerar senha segura</span>
            <q-btn flat dense no-caps size="sm" color="primary"
              label="Gerar" icon="casino" @click="generatePassword" />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md q-pt-sm">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="primary" label="Criar usuário"
            :loading="saving" :disable="!form.email || !form.password"
            @click="createUser" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── Dialog: Redefinir senha ──────────────────────────── -->
    <q-dialog v-model="showReset" persistent>
      <q-card style="min-width:380px;border-radius:12px">
        <q-card-section class="q-pb-sm">
          <div class="text-h6">Redefinir senha</div>
          <div class="text-caption text-grey-6">{{ selectedUser?.email }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="resetPwd" label="Nova senha *" outlined dense
            :type="showResetPwd ? 'text' : 'password'">
            <template #append>
              <q-icon :name="showResetPwd ? 'visibility_off' : 'visibility'"
                class="cursor-pointer" @click="showResetPwd = !showResetPwd" />
            </template>
          </q-input>
          <div class="row items-center justify-between q-mt-xs">
            <span class="text-caption text-grey-6">Gerar senha segura</span>
            <q-btn flat dense no-caps size="sm" color="primary"
              label="Gerar" icon="casino" @click="resetPwd = genPwd()" />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md q-pt-sm">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="primary" label="Salvar senha"
            :loading="saving" :disable="!resetPwd || resetPwd.length < 8"
            @click="resetPassword" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── Dialog: Desativar ───────────────────────────────── -->
    <q-dialog v-model="showDelete" persistent>
      <q-card style="min-width:360px;border-radius:12px">
        <q-card-section>
          <div class="text-h6">Desativar usuário</div>
          <div class="text-body2 q-mt-sm">
            Tem certeza que deseja desativar
            <strong>{{ selectedUser?.email }}</strong>?
            O usuário perderá acesso imediatamente.
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md q-pt-sm">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="negative" label="Desativar"
            :loading="saving" @click="deleteUser" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth'
import { supabase, supabaseAdmin } from 'src/services/supabase'

const adminClient = supabaseAdmin || supabase

const $q = useQuasar()
const authStore = useAuthStore()
const isAdmin = computed(() => authStore.isAdmin)

const users = ref([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')

const showCreate = ref(false)
const showReset = ref(false)
const showDelete = ref(false)
const showPwd = ref(false)
const showResetPwd = ref(false)
const selectedUser = ref(null)
const resetPwd = ref('')

const form = ref({ email: '', nome: '', matricula: '', password: '' })
const savingRole = ref(null)

function getRole (u) {
  return u.app_metadata?.portal_role || 'viewer'
}

async function changeRole (u, newRole) {
  savingRole.value = u.id
  try {
    const { error } = await adminClient.auth.admin.updateUserById(u.id, {
      app_metadata: { ...u.app_metadata, portal_role: newRole }
    })
    if (error) throw error
    u.app_metadata = { ...u.app_metadata, portal_role: newRole }
    $q.notify({ type: 'positive', message: `Papel de ${u.email} alterado para ${newRole}.` })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao alterar papel: ' + e.message })
  } finally {
    savingRole.value = null
  }
}

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return users.value
  return users.value.filter(u =>
    u.email?.toLowerCase().includes(q) ||
    u.user_metadata?.nome?.toLowerCase().includes(q)
  )
})

function initials (email = '') {
  const parts = email.split('@')[0].split('.')
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('')
}

function fmt (iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

function genPwd () {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789@#!'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function generatePassword () {
  form.value.password = genPwd()
  showPwd.value = true
}

async function loadUsers () {
  loading.value = true
  try {
    const { data, error } = await adminClient.auth.admin.listUsers()
    if (error) throw error
    users.value = (data?.users || []).sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    )
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar usuários: ' + e.message })
  } finally {
    loading.value = false
  }
}

function openCreate () {
  form.value = { email: '', nome: '', matricula: '', password: '' }
  showPwd.value = false
  showCreate.value = true
}

function openReset (u) {
  selectedUser.value = u
  resetPwd.value = ''
  showResetPwd.value = false
  showReset.value = true
}

function openDelete (u) {
  selectedUser.value = u
  showDelete.value = true
}

async function createUser () {
  saving.value = true
  try {
    const { error } = await adminClient.auth.admin.createUser({
      email: form.value.email.trim(),
      password: form.value.password,
      email_confirm: true,
      user_metadata: {
        nome: form.value.nome.trim(),
        matricula: form.value.matricula.trim()
      }
    })
    if (error) throw error
    $q.notify({ type: 'positive', message: `Usuário ${form.value.email} criado!` })
    showCreate.value = false
    await loadUsers()
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro: ' + e.message })
  } finally {
    saving.value = false
  }
}

async function resetPassword () {
  saving.value = true
  try {
    const { error } = await adminClient.auth.admin.updateUserById(
      selectedUser.value.id,
      { password: resetPwd.value }
    )
    if (error) throw error
    $q.notify({ type: 'positive', message: 'Senha atualizada com sucesso!' })
    showReset.value = false
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro: ' + e.message })
  } finally {
    saving.value = false
  }
}

async function deleteUser () {
  saving.value = true
  try {
    const { error } = await adminClient.auth.admin.deleteUser(selectedUser.value.id)
    if (error) throw error
    $q.notify({ type: 'positive', message: 'Usuário desativado.' })
    showDelete.value = false
    await loadUsers()
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro: ' + e.message })
  } finally {
    saving.value = false
  }
}

onMounted(loadUsers)
</script>

<style scoped>
.users-page { padding: 24px; max-width: 1100px; margin: 0 auto; }

.access-denied {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 60vh; text-align: center;
}
.denied-title { font-size: 1.4rem; font-weight: 700; margin-bottom: 8px; }
.denied-sub { color: #6b7280; }

.page-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 24px;
}
.page-title { font-size: 1.5rem; font-weight: 700; }
.page-sub { color: #6b7280; font-size: 0.875rem; margin-top: 2px; }

.action-btn {
  display: flex; align-items: center; gap: 6px;
  background: #1E88E5; color: #fff;
  border: none; border-radius: 8px;
  padding: 8px 16px; font-size: 0.875rem; font-weight: 600;
  cursor: pointer; transition: background .15s;
}
.action-btn:hover { background: #1565C0; }

.filters-bar {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 20px;
}
.search-wrap {
  display: flex; align-items: center; gap: 8px;
  background: var(--q-dark, #1E2B3C);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px; padding: 8px 12px; flex: 1; max-width: 380px;
}
.search-input {
  background: transparent; border: none; outline: none;
  color: inherit; font-size: 0.875rem; width: 100%;
}

.table-wrap {
  background: var(--q-dark, #1E2B3C);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px; overflow: hidden;
}
.table-loading { display: flex; justify-content: center; padding: 60px; }

.data-table { width: 100%; border-collapse: collapse; }
.data-table th {
  text-align: left; padding: 12px 16px;
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px;
  color: #78909C;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.data-table td {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  font-size: 0.875rem;
}
.data-table tbody tr:last-child td { border-bottom: none; }
.data-table tbody tr:hover { background: rgba(255,255,255,0.03); }

.user-cell { display: flex; align-items: center; gap: 12px; }
.user-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: #1565C0; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; flex-shrink: 0;
}
.user-email { font-weight: 600; }
.user-meta { font-size: 0.78rem; color: #78909C; margin-top: 1px; }

.date-cell { color: #78909C; font-size: 0.82rem; }

.badge {
  display: inline-block; padding: 2px 10px;
  border-radius: 999px; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .4px;
}
.badge-ok { background: rgba(67,160,71,.18); color: #4CAF50; }
.badge-warn { background: rgba(255,193,7,.18); color: #FFC107; }

.row-actions { display: flex; gap: 6px; }
.icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.12);
  background: transparent; color: inherit; cursor: pointer;
  transition: background .12s;
}
.icon-btn:hover { background: rgba(255,255,255,0.08); }
.icon-btn.danger { color: #FF5252; border-color: rgba(255,82,82,.3); }
.icon-btn.danger:hover { background: rgba(255,82,82,.12); }

.role-select {
  appearance: none;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  padding: 4px 28px 4px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  outline: none;
  transition: border-color .15s, background .15s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
}
.role-select:disabled { opacity: .5; cursor: not-allowed; }

.role-viewer  { background: rgba(100,116,139,.18); color: #94a3b8; }
.role-editor  { background: rgba(59,130,246,.15);  color: #60a5fa; }
.role-admin   { background: rgba(234,179, 8,.15);  color: #fbbf24; }

.role-viewer option, .role-editor option, .role-admin option {
  background: #1e2b3c; color: #e2e8f0;
}
</style>
