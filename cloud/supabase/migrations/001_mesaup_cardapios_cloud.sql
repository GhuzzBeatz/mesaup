create extension if not exists pgcrypto with schema extensions;

create table if not exists public.mesaup_estabelecimentos (
  id uuid primary key default extensions.gen_random_uuid(),
  codigo text not null unique,
  nome text not null default 'MesaUp',
  telefone text not null default '',
  endereco text not null default '',
  documento text not null default '',
  responsavel text not null default '',
  token_hash text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  ultimo_publish_em timestamptz
);

create table if not exists public.mesaup_publicacoes_cardapio (
  id uuid primary key default extensions.gen_random_uuid(),
  estabelecimento_id uuid not null references public.mesaup_estabelecimentos(id) on delete cascade,
  codigo text not null,
  storage_path text not null,
  html_bytes integer not null default 0,
  criado_em timestamptz not null default now()
);

create index if not exists idx_mesaup_publicacoes_codigo
  on public.mesaup_publicacoes_cardapio (codigo, criado_em desc);

alter table public.mesaup_estabelecimentos enable row level security;
alter table public.mesaup_publicacoes_cardapio enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cardapios', 'cardapios', true, 1048576, array['text/html'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
