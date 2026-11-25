-- Moto Tudo — PostgreSQL schema v28
-- Estrutura preparada para autenticação, isolamento por loja e auditoria.
-- Não contém credenciais nem políticas específicas de um provedor.

create extension if not exists pgcrypto;

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists store_memberships (
  store_id uuid not null references stores(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('admin','manager','seller','viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (store_id,user_id)
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  legacy_id bigint,
  name text not null check (char_length(name) between 1 and 160),
  contact text not null default '',
  city text not null default '',
  categories text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, legacy_id)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  legacy_id bigint,
  supplier_id uuid references suppliers(id) on delete set null,
  name text not null check (char_length(name) between 1 and 200),
  code text not null check (char_length(code) between 1 and 80),
  brand text not null default '',
  application text not null default '',
  location text not null default '',
  category text not null default '',
  stock numeric(14,3) not null default 0 check (stock >= 0),
  min_stock numeric(14,3) not null default 0 check (min_stock >= 0),
  cost numeric(14,2) not null default 0 check (cost >= 0),
  price numeric(14,2) not null default 0 check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, code),
  unique (store_id, legacy_id)
);

create table if not exists credit_customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  legacy_id bigint,
  name text not null check (char_length(name) between 1 and 160),
  phone text not null default '',
  note text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, legacy_id)
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  legacy_id bigint,
  code text not null check (char_length(code) between 1 and 80),
  order_type text not null check (order_type in ('sale','entry')),
  status text not null check (status in ('pending','completed','cancelled')),
  name text not null default '',
  bike text not null default '',
  plate text not null default '',
  note text not null default '',
  payment_method text check (payment_method is null or payment_method in ('pix','dinheiro','debito','credito','fiado','outro')),
  credit_customer_id uuid references credit_customers(id) on delete restrict,
  labor numeric(14,2) not null default 0 check (labor >= 0),
  created_by uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (store_id, code),
  unique (store_id, legacy_id),
  check (payment_method <> 'fiado' or credit_customer_id is not null)
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete restrict,
  product_name_snapshot text not null,
  qty numeric(14,3) not null check (qty > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  unit_cost_snapshot numeric(14,2) not null default 0 check (unit_cost_snapshot >= 0),
  location_snapshot text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  product_id uuid not null references products(id) on delete restrict,
  movement_type text not null check (movement_type in ('in','out','adjust')),
  qty numeric(14,3) not null check (qty > 0),
  unit_amount numeric(14,2) not null default 0 check (unit_amount >= 0),
  location text not null default '',
  note text not null default '',
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists credit_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  customer_id uuid not null references credit_customers(id) on delete restrict,
  order_id uuid not null references orders(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  payment_method text not null default 'pix' check (payment_method in ('pix','dinheiro','debito','credito','outro')),
  note text not null default '',
  received_by uuid,
  paid_at timestamptz not null default now()
);

create table if not exists store_settings (
  store_id uuid primary key references stores(id) on delete cascade,
  currency text not null default 'BRL',
  low_stock_alerts boolean not null default true,
  sale_alerts boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  actor_user_id uuid,
  action text not null check (char_length(action) between 1 and 100),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_store_active on products(store_id,active);
create index if not exists idx_products_store_name on products(store_id,name);
create index if not exists idx_orders_store_created on orders(store_id,created_at desc);
create index if not exists idx_orders_store_status on orders(store_id,status);
create index if not exists idx_orders_credit_customer on orders(store_id,credit_customer_id) where payment_method='fiado';
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_movements_store_created on inventory_movements(store_id,created_at desc);
create index if not exists idx_movements_product on inventory_movements(product_id,created_at desc);
create index if not exists idx_credit_payments_order on credit_payments(order_id,paid_at desc);
create index if not exists idx_credit_payments_customer on credit_payments(customer_id,paid_at desc);
create index if not exists idx_audit_store_created on audit_log(store_id,created_at desc);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists trg_stores_updated_at on stores;
create trigger trg_stores_updated_at before update on stores
for each row execute function set_updated_at();

drop trigger if exists trg_suppliers_updated_at on suppliers;
create trigger trg_suppliers_updated_at before update on suppliers
for each row execute function set_updated_at();

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at before update on products
for each row execute function set_updated_at();

drop trigger if exists trg_credit_customers_updated_at on credit_customers;
create trigger trg_credit_customers_updated_at before update on credit_customers
for each row execute function set_updated_at();

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at before update on orders
for each row execute function set_updated_at();

-- Segurança no banco deve ser aplicada ao conectar o provedor:
-- 1) negar acesso anônimo às tabelas;
-- 2) filtrar todas as linhas por store_id + membership do usuário;
-- 3) permitir escrita conforme role;
-- 4) finalizar venda/baixar estoque/pagar fiado somente por função/transação atômica;
-- 5) nunca confiar em totais ou estoque enviados pelo navegador.
