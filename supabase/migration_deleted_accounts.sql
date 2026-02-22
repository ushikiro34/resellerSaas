-- ============================================
-- 회원탈퇴 로그 테이블
-- deleted_at으로부터 30일 후 자동 정리 대상
-- ============================================

create table if not exists public.deleted_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  plan text not null default 'free',
  had_active_subscription boolean not null default false,
  sales_records_count integer not null default 0,
  uploads_count integer not null default 0,
  reason text default '회원탈퇴',
  deleted_at timestamptz not null default now()
);

-- RLS: service_role만 접근 가능 (일반 유저 접근 불가)
alter table public.deleted_accounts enable row level security;

-- 30일 이상 지난 로그 자동 삭제 (pg_cron)
-- select cron.schedule(
--   'cleanup-deleted-accounts',
--   '0 3 * * *',
--   $$delete from public.deleted_accounts where deleted_at < now() - interval '30 days'$$
-- );
