-- Solicitações de cadastro de equipes (enviadas pelo app mobile)
create table if not exists public.team_requests (
  id uuid primary key default gen_random_uuid(),
  prefixo text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

alter table public.team_requests enable row level security;

-- Qualquer um (mobile anon) pode solicitar
create policy "anon pode solicitar cadastro"
  on public.team_requests for insert to anon
  with check (true);

-- Admin autenticado pode ver e atualizar
create policy "auth le solicitacoes"
  on public.team_requests for select to authenticated
  using (true);

create policy "auth atualiza solicitacoes"
  on public.team_requests for update to authenticated
  using (true);
