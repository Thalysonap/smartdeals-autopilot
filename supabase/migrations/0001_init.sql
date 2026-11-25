-- SmartDeals: schema inicial com isolamento por usuário (RLS)
create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  password_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.auth_sessions (
  token_hash text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.password_resets (
  token_hash text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('dark','light')),
  language text not null default 'pt-BR',
  scan_interval_minutes integer not null default 240,
  max_stores_per_scan integer not null default 8,
  notifications_enabled boolean not null default true,
  affiliate_disclosure boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.monitored_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  brand text,
  model text,
  version text,
  capacity text,
  category text,
  attributes jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','paused')),
  interval_minutes integer not null default 240,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_run_at timestamptz,
  next_run_at timestamptz
);
create index if not exists idx_monitored_user_status on public.monitored_products(user_id, status);
create index if not exists idx_monitored_next_run on public.monitored_products(next_run_at);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  brand text,
  model text,
  gtin text,
  sku text,
  category text,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_products_identity on public.products(coalesce(gtin,''), coalesce(sku,''), lower(canonical_name));
create index if not exists idx_products_model on public.products(lower(coalesce(model,'')));

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  capacity text,
  color text,
  condition text not null default 'unknown',
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.stores (
  id text primary key,
  name text not null,
  domain text not null unique,
  homepage text not null,
  reliability_base integer not null default 60,
  created_at timestamptz not null default now()
);

create table if not exists public.store_integrations (
  store_id text primary key references public.stores(id) on delete cascade,
  method text not null,
  enabled boolean not null default true,
  validated boolean not null default false,
  capabilities jsonb not null default '[]'::jsonb,
  limitation text,
  updated_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  monitored_product_id uuid references public.monitored_products(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  store_id text not null references public.stores(id),
  seller_name text,
  seller_rating numeric,
  title text not null,
  url text not null,
  image_url text,
  price numeric(12,2) not null,
  currency text not null default 'BRL',
  shipping_price numeric(12,2),
  total_price numeric(12,2),
  availability text not null default 'unknown',
  condition text not null default 'unknown',
  brand text,
  model text,
  gtin text,
  sku text,
  attributes jsonb not null default '{}'::jsonb,
  source text not null,
  collected_at timestamptz not null,
  validated_at timestamptz,
  expires_at timestamptz,
  match_class text,
  match_reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_offers_dedupe on public.offers(store_id, url, coalesce(seller_name,''));
create index if not exists idx_offers_monitored on public.offers(monitored_product_id, updated_at desc);
create index if not exists idx_offers_store on public.offers(store_id);

create table if not exists public.offer_price_history (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  price numeric(12,2) not null,
  shipping_price numeric(12,2),
  availability text not null,
  collected_at timestamptz not null,
  source text not null
);
create index if not exists idx_price_history_offer on public.offer_price_history(offer_id, collected_at);

create table if not exists public.discovery_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  monitored_product_id uuid references public.monitored_products(id) on delete set null,
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  stores_consulted integer not null default 0,
  stores_failed integer not null default 0,
  offers_found integer not null default 0,
  error text
);
create index if not exists idx_runs_user on public.discovery_runs(user_id, started_at desc);

create table if not exists public.discovery_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.discovery_runs(id) on delete cascade,
  store_id text not null,
  status text not null,
  offers_found integer not null default 0,
  message text,
  duration_ms integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  monitored_product_id uuid not null unique references public.monitored_products(id) on delete cascade,
  offer_id uuid not null references public.offers(id),
  price numeric(12,2) not null,
  shipping_price numeric(12,2),
  total_price numeric(12,2),
  store_id text not null,
  reason text not null,
  score numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_history (
  id uuid primary key default gen_random_uuid(),
  cart_item_id uuid,
  user_id uuid not null references public.users(id) on delete cascade,
  monitored_product_id uuid not null,
  offer_id uuid not null,
  action text not null,
  previous_offer_id uuid,
  price numeric(12,2) not null,
  total_price numeric(12,2),
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_cart_history_user on public.cart_history(user_id, created_at desc);

create table if not exists public.reliability_assessments (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  score numeric,
  status text not null,
  criteria jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  run_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists idx_jobs_claim on public.background_jobs(status, run_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  offer_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);

create table if not exists public.integration_logs (
  id uuid primary key default gen_random_uuid(),
  store_id text not null,
  method text not null,
  operation text not null,
  status text not null,
  http_status integer,
  duration_ms integer not null default 0,
  items_found integer not null default 0,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_integration_logs_store on public.integration_logs(store_id, created_at desc);

-- Cria perfil público quando um usuário é criado no Supabase Auth
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name) values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', null))
  on conflict (id) do nothing;
  insert into public.user_preferences (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.auth_sessions enable row level security;
alter table public.password_resets enable row level security;
alter table public.user_preferences enable row level security;
alter table public.monitored_products enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.offers enable row level security;
alter table public.offer_price_history enable row level security;
alter table public.discovery_runs enable row level security;
alter table public.discovery_results enable row level security;
alter table public.cart_items enable row level security;
alter table public.cart_history enable row level security;
alter table public.reliability_assessments enable row level security;
alter table public.notifications enable row level security;

create policy "users_self_select" on public.users for select using (auth.uid() = id);
create policy "users_self_update" on public.users for update using (auth.uid() = id);
create policy "sessions_self" on public.auth_sessions for all using (user_id = auth.uid());
create policy "password_resets_self" on public.password_resets for all using (user_id = auth.uid());
create policy "preferences_self" on public.user_preferences for all using (user_id = auth.uid());
create policy "monitored_self" on public.monitored_products for all using (user_id = auth.uid());
create policy "products_read" on public.products for select using (true);
create policy "variants_read" on public.product_variants for select using (true);
create policy "offers_self" on public.offers for all using (
  monitored_product_id is null or monitored_product_id in (select id from public.monitored_products where user_id = auth.uid())
);
create policy "price_history_self" on public.offer_price_history for all using (
  offer_id in (select id from public.offers where monitored_product_id is null or monitored_product_id in (select id from public.monitored_products where user_id = auth.uid()))
);
create policy "runs_self" on public.discovery_runs for all using (user_id = auth.uid());
create policy "results_self" on public.discovery_results for all using (
  run_id in (select id from public.discovery_runs where user_id = auth.uid())
);
create policy "cart_self" on public.cart_items for all using (user_id = auth.uid());
create policy "cart_history_self" on public.cart_history for all using (user_id = auth.uid());
create policy "assessments_self" on public.reliability_assessments for all using (
  offer_id in (select id from public.offers where monitored_product_id is null or monitored_product_id in (select id from public.monitored_products where user_id = auth.uid()))
);
create policy "notifications_self" on public.notifications for all using (user_id = auth.uid());
create policy "stores_read" on public.stores for select using (true);
create policy "integrations_read" on public.store_integrations for select using (true);
create policy "logs_read" on public.integration_logs for select using (true);
