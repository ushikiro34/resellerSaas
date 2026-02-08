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


-- 6. Dashboard Views
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