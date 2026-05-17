-- CMS document storage (single default document; extend with slug for multi-tenant later)
create table if not exists public.cms_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique default 'default',
  document_title text not null default 'College Recognition Program',
  pages jsonb not null default '[]'::jsonb,
  settings jsonb not null,
  front_cover text,
  back_cover text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cms_documents_slug_idx on public.cms_documents (slug);

alter table public.cms_documents enable row level security;

drop policy if exists "cms_documents_public_select" on public.cms_documents;
create policy "cms_documents_public_select"
  on public.cms_documents
  for select
  to anon, authenticated
  using (true);

drop policy if exists "cms_documents_public_insert" on public.cms_documents;
create policy "cms_documents_public_insert"
  on public.cms_documents
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "cms_documents_public_update" on public.cms_documents;
create policy "cms_documents_public_update"
  on public.cms_documents
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "cms_documents_public_delete" on public.cms_documents;
create policy "cms_documents_public_delete"
  on public.cms_documents
  for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on public.cms_documents to anon, authenticated;
