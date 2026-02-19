-- ============================================
-- TossPayments 빌링 시스템 마이그레이션
-- Supabase SQL Editor에 붙여넣기
-- ============================================

-- 구독 테이블
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  billing_key text not null,
  customer_key text not null,
  plan_type text not null check (plan_type in ('monthly', 'yearly')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired', 'past_due')),
  amount integer not null,
  next_billing_date timestamptz not null,
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscriptions"
on public.subscriptions for select
using (auth.uid() = user_id);

create unique index if not exists idx_subs_active_user
  on public.subscriptions (user_id) where status = 'active';
create index if not exists idx_subs_next_billing
  on public.subscriptions (next_billing_date) where status = 'active';

-- 결제 이력 테이블
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  payment_key text,
  order_id text not null unique,
  amount integer not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled')),
  paid_at timestamptz,
  failure_reason text,
  receipt_url text,
  raw_response jsonb,
  created_at timestamptz default now()
);

alter table public.payments enable row level security;

create policy "Users can view own payments"
on public.payments for select
using (auth.uid() = user_id);

create index if not exists idx_payments_user on public.payments (user_id, created_at desc);
create index if not exists idx_payments_subscription on public.payments (subscription_id, created_at desc);
