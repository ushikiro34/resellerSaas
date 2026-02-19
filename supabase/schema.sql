-- ============================================
-- Reseller Data SaaS - Database Schema v1.0
-- Supabase SQL Editor에 붙여넣기
-- ============================================


-- 1. users 테이블 (플랜 관리)
-- ============================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can view own profile"
on public.users for select
using (auth.uid() = id);

-- 신규 가입 시 users 레코드 자동 생성
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


-- 2. uploads 테이블 (업로드 이력)
-- ============================================
create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  original_file_name text,
  uploaded_at timestamptz default now()
);

alter table public.uploads enable row level security;

create policy "User uploads isolation"
on public.uploads for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- 3. sales_records 테이블 (핵심 데이터)
-- ============================================
create table public.sales_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  upload_id uuid references public.uploads(id),

  product_name text not null,
  sale_price numeric not null,
  quantity int not null,
  marketplace text,
  sold_at date not null,
  settlement_due_at date,

  cost numeric default 0,
  fee_1 numeric default 0,
  fee_2 numeric default 0,
  fee_3 numeric default 0,
  ad_cost numeric default 0,

  gross_sales numeric generated always as (sale_price * quantity) stored,
  total_fee numeric generated always as (
    coalesce(fee_1,0) + coalesce(fee_2,0) + coalesce(fee_3,0) + coalesce(ad_cost,0)
  ) stored,
  margin numeric generated always as (
    sale_price * quantity - (
      coalesce(cost,0) + coalesce(fee_1,0) + coalesce(fee_2,0) + coalesce(fee_3,0) + coalesce(ad_cost,0)
    ) * quantity
  ) stored,

  revenue_type text not null default 'product'
    check (revenue_type in ('product', 'subscription', 'ads')),
  region text not null default 'KR',

  input_type text check (input_type in ('excel', 'manual')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.sales_records enable row level security;

create policy "Sales records isolation"
on public.sales_records for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 인덱스
create index idx_sales_user_date on public.sales_records (user_id, sold_at);
create index idx_sales_user_settlement on public.sales_records (user_id, settlement_due_at);
create index idx_sales_user_marketplace on public.sales_records (user_id, marketplace);
create index idx_sales_user_revenue_type on public.sales_records (user_id, revenue_type);
create index idx_sales_user_region on public.sales_records (user_id, region);
create index idx_sales_user_date_type on public.sales_records (user_id, sold_at, revenue_type);
create index idx_sales_user_date_region on public.sales_records (user_id, sold_at, region);


-- 4. dashboard_settings 테이블
-- ============================================
create table public.dashboard_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  dashboard_range_days integer default 45,
  currency text default 'KRW',
  theme text default 'default',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.dashboard_settings enable row level security;

create policy "Dashboard settings isolation"
on public.dashboard_settings for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- 5. Free 플랜 제한 트리거
-- ============================================
-- Row 1000개 제한
create or replace function public.check_free_plan_row_limit()
returns trigger as $$
begin
  if (
    exists (select 1 from public.users where id = new.user_id and plan = 'free')
    and (select count(*) from public.sales_records where user_id = new.user_id) >= 1000
  ) then
    raise exception 'Free plan row limit exceeded';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger free_plan_row_limit
before insert on public.sales_records
for each row execute function public.check_free_plan_row_limit();

-- 업로드 10회 제한
create or replace function public.check_upload_limit()
returns trigger as $$
begin
  if (
    exists (select 1 from public.users where id = new.user_id and plan = 'free')
    and (select count(*) from public.uploads where user_id = new.user_id) >= 10
  ) then
    raise exception 'Free plan upload limit exceeded';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger free_plan_upload_limit
before insert on public.uploads
for each row execute function public.check_upload_limit();


-- 6. 구독 & 결제 테이블 (TossPayments)
-- ============================================

-- 구독 테이블
create table public.subscriptions (
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

create unique index idx_subs_active_user
  on public.subscriptions (user_id) where status = 'active';
create index idx_subs_next_billing
  on public.subscriptions (next_billing_date) where status = 'active';

-- 결제 이력 테이블
create table public.payments (
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

create index idx_payments_user on public.payments (user_id, created_at desc);
create index idx_payments_subscription on public.payments (subscription_id, created_at desc);


-- 7. Revenue 집계 테이블
-- ============================================

-- 일별 집계
create table public.revenue_daily (
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  revenue_type text not null,
  region text not null,
  total_amount numeric(14,2) default 0,
  primary key (user_id, date, revenue_type, region)
);

alter table public.revenue_daily enable row level security;
create policy "Revenue daily isolation"
on public.revenue_daily for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 월별 집계
create table public.revenue_monthly (
  user_id uuid not null references public.users(id) on delete cascade,
  year int not null,
  month int not null,
  revenue_type text not null,
  region text not null,
  total_amount numeric(14,2) default 0,
  primary key (user_id, year, month, revenue_type, region)
);

alter table public.revenue_monthly enable row level security;
create policy "Revenue monthly isolation"
on public.revenue_monthly for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 연별 집계
create table public.revenue_yearly (
  user_id uuid not null references public.users(id) on delete cascade,
  year int not null,
  revenue_type text not null,
  region text not null,
  total_amount numeric(14,2) default 0,
  primary key (user_id, year, revenue_type, region)
);

alter table public.revenue_yearly enable row level security;
create policy "Revenue yearly isolation"
on public.revenue_yearly for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 목표 테이블
create table public.revenue_targets (
  user_id uuid not null references public.users(id) on delete cascade,
  year int not null,
  month int not null,
  revenue_type text not null,
  region text not null,
  target_amount numeric(14,2) default 0,
  primary key (user_id, year, month, revenue_type, region)
);

alter table public.revenue_targets enable row level security;
create policy "Revenue targets isolation"
on public.revenue_targets for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- 7. Revenue 자동 집계 Trigger
-- ============================================

-- 일별/월별/연별 집계를 한 번에 처리하는 통합 트리거 함수
create or replace function public.update_revenue_aggregates()
returns trigger as $$
declare
  v_user_id uuid;
  v_date date;
  v_year int;
  v_month int;
  v_revenue_type text;
  v_region text;
  v_amount numeric;
begin
  -- DELETE인 경우 OLD 기준으로 차감
  if (TG_OP = 'DELETE') then
    v_user_id := OLD.user_id;
    v_date := OLD.sold_at;
    v_year := extract(year from OLD.sold_at);
    v_month := extract(month from OLD.sold_at);
    v_revenue_type := OLD.revenue_type;
    v_region := OLD.region;
    v_amount := -(OLD.sale_price * OLD.quantity);

    -- daily
    update public.revenue_daily
    set total_amount = total_amount + v_amount
    where user_id = v_user_id and date = v_date
      and revenue_type = v_revenue_type and region = v_region;

    -- monthly
    update public.revenue_monthly
    set total_amount = total_amount + v_amount
    where user_id = v_user_id and year = v_year and month = v_month
      and revenue_type = v_revenue_type and region = v_region;

    -- yearly
    update public.revenue_yearly
    set total_amount = total_amount + v_amount
    where user_id = v_user_id and year = v_year
      and revenue_type = v_revenue_type and region = v_region;

    return OLD;
  end if;

  -- UPDATE인 경우 OLD 차감 + NEW 가산
  if (TG_OP = 'UPDATE') then
    -- OLD 차감
    v_user_id := OLD.user_id;
    v_date := OLD.sold_at;
    v_year := extract(year from OLD.sold_at);
    v_month := extract(month from OLD.sold_at);
    v_revenue_type := OLD.revenue_type;
    v_region := OLD.region;
    v_amount := -(OLD.sale_price * OLD.quantity);

    update public.revenue_daily
    set total_amount = total_amount + v_amount
    where user_id = v_user_id and date = v_date
      and revenue_type = v_revenue_type and region = v_region;

    update public.revenue_monthly
    set total_amount = total_amount + v_amount
    where user_id = v_user_id and year = v_year and month = v_month
      and revenue_type = v_revenue_type and region = v_region;

    update public.revenue_yearly
    set total_amount = total_amount + v_amount
    where user_id = v_user_id and year = v_year
      and revenue_type = v_revenue_type and region = v_region;
  end if;

  -- INSERT 또는 UPDATE의 NEW 가산
  v_user_id := NEW.user_id;
  v_date := NEW.sold_at;
  v_year := extract(year from NEW.sold_at);
  v_month := extract(month from NEW.sold_at);
  v_revenue_type := NEW.revenue_type;
  v_region := NEW.region;
  v_amount := NEW.sale_price * NEW.quantity;

  -- daily upsert
  insert into public.revenue_daily(user_id, date, revenue_type, region, total_amount)
  values (v_user_id, v_date, v_revenue_type, v_region, v_amount)
  on conflict (user_id, date, revenue_type, region)
  do update set total_amount = revenue_daily.total_amount + v_amount;

  -- monthly upsert
  insert into public.revenue_monthly(user_id, year, month, revenue_type, region, total_amount)
  values (v_user_id, v_year, v_month, v_revenue_type, v_region, v_amount)
  on conflict (user_id, year, month, revenue_type, region)
  do update set total_amount = revenue_monthly.total_amount + v_amount;

  -- yearly upsert
  insert into public.revenue_yearly(user_id, year, revenue_type, region, total_amount)
  values (v_user_id, v_year, v_revenue_type, v_region, v_amount)
  on conflict (user_id, year, revenue_type, region)
  do update set total_amount = revenue_yearly.total_amount + v_amount;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger trg_revenue_aggregates
after insert or update or delete on public.sales_records
for each row execute function public.update_revenue_aggregates();

-- 연별 재계산 함수 (배치 보정용)
create or replace function public.recalculate_yearly_summary(p_user_id uuid)
returns void as $$
begin
  delete from public.revenue_yearly where user_id = p_user_id;

  insert into public.revenue_yearly (user_id, year, revenue_type, region, total_amount)
  select user_id, year, revenue_type, region, sum(total_amount)
  from public.revenue_monthly
  where user_id = p_user_id
  group by user_id, year, revenue_type, region;
end;
$$ language plpgsql security definer;


-- 8. Revenue 분석 Views
-- ============================================

-- YoY 비교
create view public.revenue_yoy
with (security_invoker = true)
as
select
  curr.user_id,
  curr.year,
  curr.revenue_type,
  curr.region,
  curr.total_amount as current_year,
  coalesce(prev.total_amount, 0) as previous_year,
  (curr.total_amount - coalesce(prev.total_amount, 0)) as yoy_diff,
  round(
    case
      when coalesce(prev.total_amount, 0) = 0 then 0
      else ((curr.total_amount - prev.total_amount) / prev.total_amount * 100)
    end::numeric, 2
  ) as yoy_percent
from public.revenue_yearly curr
left join public.revenue_yearly prev
  on curr.user_id = prev.user_id
  and curr.year = prev.year + 1
  and curr.revenue_type = prev.revenue_type
  and curr.region = prev.region;

-- 목표 대비 달성률
create view public.revenue_vs_target
with (security_invoker = true)
as
select
  m.user_id,
  m.year,
  m.month,
  m.revenue_type,
  m.region,
  m.total_amount,
  coalesce(t.target_amount, 0) as target_amount,
  (m.total_amount - coalesce(t.target_amount, 0)) as diff,
  round(
    case
      when coalesce(t.target_amount, 0) = 0 then 0
      else ((m.total_amount / t.target_amount) * 100)
    end::numeric, 2
  ) as achievement_rate
from public.revenue_monthly m
left join public.revenue_targets t
  on m.user_id = t.user_id
  and m.year = t.year
  and m.month = t.month
  and m.revenue_type = t.revenue_type
  and m.region = t.region;

-- 워터폴 분석
create view public.revenue_waterfall
with (security_invoker = true)
as
select
  curr.user_id,
  curr.year,
  curr.revenue_type,
  curr.region,
  coalesce(prev.total_amount, 0) as base_amount,
  curr.total_amount as current_amount,
  (curr.total_amount - coalesce(prev.total_amount, 0)) as growth_amount
from public.revenue_yearly curr
left join public.revenue_yearly prev
  on curr.user_id = prev.user_id
  and curr.year = prev.year + 1
  and curr.revenue_type = prev.revenue_type
  and curr.region = prev.region;


-- 9. Dashboard Views (기존)
-- ============================================
-- KPI 카드
create view vw_dashboard_kpi
with (security_invoker = true)
as
select
  user_id,
  sum(gross_sales) as total_sales,
  sum(total_fee) as total_fee,
  sum(margin) as total_margin,
  sum(quantity) as total_quantity,
  case
    when sum(gross_sales) > 0
    then round((sum(margin) / sum(gross_sales) * 100)::numeric, 1)
    else 0
  end as avg_margin_rate
from public.sales_records
group by user_id;

-- 매출 & 마진 일별 추이
create view vw_dashboard_trend_daily
with (security_invoker = true)
as
select
  user_id,
  sold_at,
  sum(gross_sales) as sales,
  sum(margin) as margin
from public.sales_records
group by user_id, sold_at;

-- 판매처별 매출
create view vw_dashboard_sales_by_channel
with (security_invoker = true)
as
select
  user_id,
  marketplace,
  sum(gross_sales) as sales
from public.sales_records
group by user_id, marketplace;

-- 비용 구조
create view vw_dashboard_cost_breakdown
with (security_invoker = true)
as
select
  user_id,
  sum(coalesce(ad_cost, 0) * quantity) as ad_cost,
  sum(coalesce(fee_1, 0) * quantity) as fee1,
  sum(coalesce(fee_2, 0) * quantity) as fee2,
  sum(coalesce(fee_3, 0) * quantity) as fee3
from public.sales_records
group by user_id;

-- 마진 분포
create view vw_dashboard_margin_distribution
with (security_invoker = true)
as
select
  user_id,
  case
    when margin_rate < 0 then 'LOSS'
    when margin_rate < 5 then 'LOW'
    when margin_rate < 10 then 'MID'
    when margin_rate < 20 then 'HIGH'
    else 'TOP'
  end as margin_bucket,
  count(*) as item_count,
  round(avg(margin_rate)::numeric, 1) as avg_margin_rate
from (
  select
    user_id,
    case
      when sale_price > 0
      then (margin / gross_sales) * 100
      else 0
    end as margin_rate
  from public.sales_records
) t
group by user_id, margin_bucket;