-- SIDI-E — Sistema de Inspeção e Documentação de Instalações Elétricas
-- Execute no SQL Editor do projeto Supabase

-- Extensions
create extension if not exists "pgcrypto";

-- ── Teams ───────────────────────────────────────────────────────
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  prefixo text not null unique,
  nome text not null,
  descricao text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  color text,
  created_at timestamptz not null default now()
);

-- ── Collaborators ───────────────────────────────────────────────
create table if not exists public.collaborators (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  nome text not null,
  funcao text default 'Eletricista',
  created_at timestamptz not null default now()
);

create index if not exists collaborators_team_id_idx on public.collaborators(team_id);

-- ── Activities ──────────────────────────────────────────────────
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  tipo text not null default 'servico' check (tipo in ('servico', 'manutencao', 'inspecao', 'emergencia')),
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);

-- ── Services (evidence records) ─────────────────────────────────
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete set null,
  activity_id uuid references public.activities(id) on delete set null,
  activity_name text,
  descricao text,
  colaboradores jsonb default '[]'::jsonb,
  data date,
  status text default 'concluido',
  sync_status text default 'synced',
  created_at timestamptz not null default now()
);

create index if not exists services_team_id_idx on public.services(team_id);
create index if not exists services_created_at_idx on public.services(created_at desc);

-- ── Evidence photos ─────────────────────────────────────────────
create table if not exists public.evidence_photos (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services(id) on delete cascade,
  tipo text not null check (tipo in ('epi', 'atividade')),
  file_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists evidence_photos_service_id_idx on public.evidence_photos(service_id);

-- ── Storage bucket ──────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', true)
on conflict (id) do nothing;

-- ── RLS ─────────────────────────────────────────────────────────
alter table public.teams enable row level security;
alter table public.collaborators enable row level security;
alter table public.activities enable row level security;
alter table public.services enable row level security;
alter table public.evidence_photos enable row level security;

-- Authenticated users (desktop admin): full access
create policy "auth_all_teams" on public.teams
  for all to authenticated using (true) with check (true);

create policy "auth_all_collaborators" on public.collaborators
  for all to authenticated using (true) with check (true);

create policy "auth_all_activities" on public.activities
  for all to authenticated using (true) with check (true);

create policy "auth_all_services" on public.services
  for all to authenticated using (true) with check (true);

create policy "auth_all_evidence_photos" on public.evidence_photos
  for all to authenticated using (true) with check (true);

-- Anon (mobile PWA): read teams/activities, insert services/photos
create policy "anon_read_teams" on public.teams
  for select to anon using (status = 'ativo');

create policy "anon_read_collaborators" on public.collaborators
  for select to anon using (true);

create policy "anon_read_activities" on public.activities
  for select to anon using (status = 'ativo');

create policy "anon_insert_services" on public.services
  for insert to anon with check (true);

create policy "anon_insert_photos" on public.evidence_photos
  for insert to anon with check (true);

-- Storage policies
create policy "auth_storage_all" on storage.objects
  for all to authenticated
  using (bucket_id = 'evidencias')
  with check (bucket_id = 'evidencias');

create policy "anon_storage_upload" on storage.objects
  for insert to anon
  with check (bucket_id = 'evidencias');

create policy "anon_storage_read" on storage.objects
  for select to anon
  using (bucket_id = 'evidencias');

-- Seed activities
insert into public.activities (nome, tipo) values
  ('Inspeção de Subestação', 'inspecao'),
  ('Manutenção de Transformador', 'manutencao'),
  ('Troca de Cabo Energizado', 'servico'),
  ('Inspeção de Rede de Distribuição', 'inspecao'),
  ('Podagem de Árvore sob Rede', 'manutencao'),
  ('Religamento de Circuito', 'servico'),
  ('Vistoria de Poste', 'inspecao'),
  ('Atendimento Emergência', 'emergencia'),
  ('Manutenção de Rede', 'manutencao'),
  ('Troca de Poste', 'servico')
on conflict do nothing;
