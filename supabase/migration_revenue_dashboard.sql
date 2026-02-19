-- ============================================
-- Revenue Dashboard Migration
-- 기존 DB에 적용할 마이그레이션 SQL
-- Supabase SQL Editor에서 실행
-- ============================================

-- ============================================
-- Phase 1: sales_records 마스터 테이블 확장
-- ============================================

-- 1-1. 컬럼 추가
ALTER TABLE public.sales_records
  ADD COLUMN IF NOT EXISTS revenue_type text NOT NULL DEFAULT 'product'
  CHECK (revenue_type IN ('product', 'subscription', 'ads'));

ALTER TABLE public.sales_records
  ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT 'KR';

-- 1-2. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_sales_user_revenue_type
  ON public.sales_records (user_id, revenue_type);
CREATE INDEX IF NOT EXISTS idx_sales_user_region
  ON public.sales_records (user_id, region);
CREATE INDEX IF NOT EXISTS idx_sales_user_date_type
  ON public.sales_records (user_id, sold_at, revenue_type);
CREATE INDEX IF NOT EXISTS idx_sales_user_date_region
  ON public.sales_records (user_id, sold_at, region);


-- ============================================
-- Phase 2: 집계 테이블 생성
-- ============================================

-- 일별 집계
CREATE TABLE IF NOT EXISTS public.revenue_daily (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  revenue_type text NOT NULL,
  region text NOT NULL,
  total_amount numeric(14,2) DEFAULT 0,
  PRIMARY KEY (user_id, date, revenue_type, region)
);

ALTER TABLE public.revenue_daily ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'revenue_daily' AND policyname = 'Revenue daily isolation'
  ) THEN
    CREATE POLICY "Revenue daily isolation"
    ON public.revenue_daily FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 월별 집계
CREATE TABLE IF NOT EXISTS public.revenue_monthly (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  year int NOT NULL,
  month int NOT NULL,
  revenue_type text NOT NULL,
  region text NOT NULL,
  total_amount numeric(14,2) DEFAULT 0,
  PRIMARY KEY (user_id, year, month, revenue_type, region)
);

ALTER TABLE public.revenue_monthly ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'revenue_monthly' AND policyname = 'Revenue monthly isolation'
  ) THEN
    CREATE POLICY "Revenue monthly isolation"
    ON public.revenue_monthly FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 연별 집계
CREATE TABLE IF NOT EXISTS public.revenue_yearly (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  year int NOT NULL,
  revenue_type text NOT NULL,
  region text NOT NULL,
  total_amount numeric(14,2) DEFAULT 0,
  PRIMARY KEY (user_id, year, revenue_type, region)
);

ALTER TABLE public.revenue_yearly ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'revenue_yearly' AND policyname = 'Revenue yearly isolation'
  ) THEN
    CREATE POLICY "Revenue yearly isolation"
    ON public.revenue_yearly FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 목표 테이블
CREATE TABLE IF NOT EXISTS public.revenue_targets (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  year int NOT NULL,
  month int NOT NULL,
  revenue_type text NOT NULL,
  region text NOT NULL,
  target_amount numeric(14,2) DEFAULT 0,
  PRIMARY KEY (user_id, year, month, revenue_type, region)
);

ALTER TABLE public.revenue_targets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'revenue_targets' AND policyname = 'Revenue targets isolation'
  ) THEN
    CREATE POLICY "Revenue targets isolation"
    ON public.revenue_targets FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


-- ============================================
-- Phase 3: 자동 집계 Trigger
-- ============================================

CREATE OR REPLACE FUNCTION public.update_revenue_aggregates()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
  v_date date;
  v_year int;
  v_month int;
  v_revenue_type text;
  v_region text;
  v_amount numeric;
BEGIN
  -- DELETE: OLD 기준으로 차감
  IF (TG_OP = 'DELETE') THEN
    v_user_id := OLD.user_id;
    v_date := OLD.sold_at;
    v_year := extract(year FROM OLD.sold_at);
    v_month := extract(month FROM OLD.sold_at);
    v_revenue_type := OLD.revenue_type;
    v_region := OLD.region;
    v_amount := -(OLD.sale_price * OLD.quantity);

    UPDATE public.revenue_daily
    SET total_amount = total_amount + v_amount
    WHERE user_id = v_user_id AND date = v_date
      AND revenue_type = v_revenue_type AND region = v_region;

    UPDATE public.revenue_monthly
    SET total_amount = total_amount + v_amount
    WHERE user_id = v_user_id AND year = v_year AND month = v_month
      AND revenue_type = v_revenue_type AND region = v_region;

    UPDATE public.revenue_yearly
    SET total_amount = total_amount + v_amount
    WHERE user_id = v_user_id AND year = v_year
      AND revenue_type = v_revenue_type AND region = v_region;

    RETURN OLD;
  END IF;

  -- UPDATE: OLD 차감 + NEW 가산
  IF (TG_OP = 'UPDATE') THEN
    v_user_id := OLD.user_id;
    v_date := OLD.sold_at;
    v_year := extract(year FROM OLD.sold_at);
    v_month := extract(month FROM OLD.sold_at);
    v_revenue_type := OLD.revenue_type;
    v_region := OLD.region;
    v_amount := -(OLD.sale_price * OLD.quantity);

    UPDATE public.revenue_daily
    SET total_amount = total_amount + v_amount
    WHERE user_id = v_user_id AND date = v_date
      AND revenue_type = v_revenue_type AND region = v_region;

    UPDATE public.revenue_monthly
    SET total_amount = total_amount + v_amount
    WHERE user_id = v_user_id AND year = v_year AND month = v_month
      AND revenue_type = v_revenue_type AND region = v_region;

    UPDATE public.revenue_yearly
    SET total_amount = total_amount + v_amount
    WHERE user_id = v_user_id AND year = v_year
      AND revenue_type = v_revenue_type AND region = v_region;
  END IF;

  -- INSERT 또는 UPDATE의 NEW 가산
  v_user_id := NEW.user_id;
  v_date := NEW.sold_at;
  v_year := extract(year FROM NEW.sold_at);
  v_month := extract(month FROM NEW.sold_at);
  v_revenue_type := NEW.revenue_type;
  v_region := NEW.region;
  v_amount := NEW.sale_price * NEW.quantity;

  -- daily upsert
  INSERT INTO public.revenue_daily(user_id, date, revenue_type, region, total_amount)
  VALUES (v_user_id, v_date, v_revenue_type, v_region, v_amount)
  ON CONFLICT (user_id, date, revenue_type, region)
  DO UPDATE SET total_amount = revenue_daily.total_amount + v_amount;

  -- monthly upsert
  INSERT INTO public.revenue_monthly(user_id, year, month, revenue_type, region, total_amount)
  VALUES (v_user_id, v_year, v_month, v_revenue_type, v_region, v_amount)
  ON CONFLICT (user_id, year, month, revenue_type, region)
  DO UPDATE SET total_amount = revenue_monthly.total_amount + v_amount;

  -- yearly upsert
  INSERT INTO public.revenue_yearly(user_id, year, revenue_type, region, total_amount)
  VALUES (v_user_id, v_year, v_revenue_type, v_region, v_amount)
  ON CONFLICT (user_id, year, revenue_type, region)
  DO UPDATE SET total_amount = revenue_yearly.total_amount + v_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거가 있으면 삭제 후 재생성
DROP TRIGGER IF EXISTS trg_revenue_aggregates ON public.sales_records;
CREATE TRIGGER trg_revenue_aggregates
AFTER INSERT OR UPDATE OR DELETE ON public.sales_records
FOR EACH ROW EXECUTE FUNCTION public.update_revenue_aggregates();

-- 연별 재계산 함수 (배치 보정용)
CREATE OR REPLACE FUNCTION public.recalculate_yearly_summary(p_user_id uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM public.revenue_yearly WHERE user_id = p_user_id;

  INSERT INTO public.revenue_yearly (user_id, year, revenue_type, region, total_amount)
  SELECT user_id, year, revenue_type, region, sum(total_amount)
  FROM public.revenue_monthly
  WHERE user_id = p_user_id
  GROUP BY user_id, year, revenue_type, region;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- Phase 4: 분석 Views
-- ============================================

-- YoY 비교
CREATE OR REPLACE VIEW public.revenue_yoy
WITH (security_invoker = true)
AS
SELECT
  curr.user_id,
  curr.year,
  curr.revenue_type,
  curr.region,
  curr.total_amount AS current_year,
  coalesce(prev.total_amount, 0) AS previous_year,
  (curr.total_amount - coalesce(prev.total_amount, 0)) AS yoy_diff,
  round(
    CASE
      WHEN coalesce(prev.total_amount, 0) = 0 THEN 0
      ELSE ((curr.total_amount - prev.total_amount) / prev.total_amount * 100)
    END::numeric, 2
  ) AS yoy_percent
FROM public.revenue_yearly curr
LEFT JOIN public.revenue_yearly prev
  ON curr.user_id = prev.user_id
  AND curr.year = prev.year + 1
  AND curr.revenue_type = prev.revenue_type
  AND curr.region = prev.region;

-- 목표 대비 달성률
CREATE OR REPLACE VIEW public.revenue_vs_target
WITH (security_invoker = true)
AS
SELECT
  m.user_id,
  m.year,
  m.month,
  m.revenue_type,
  m.region,
  m.total_amount,
  coalesce(t.target_amount, 0) AS target_amount,
  (m.total_amount - coalesce(t.target_amount, 0)) AS diff,
  round(
    CASE
      WHEN coalesce(t.target_amount, 0) = 0 THEN 0
      ELSE ((m.total_amount / t.target_amount) * 100)
    END::numeric, 2
  ) AS achievement_rate
FROM public.revenue_monthly m
LEFT JOIN public.revenue_targets t
  ON m.user_id = t.user_id
  AND m.year = t.year
  AND m.month = t.month
  AND m.revenue_type = t.revenue_type
  AND m.region = t.region;

-- 워터폴 분석
CREATE OR REPLACE VIEW public.revenue_waterfall
WITH (security_invoker = true)
AS
SELECT
  curr.user_id,
  curr.year,
  curr.revenue_type,
  curr.region,
  coalesce(prev.total_amount, 0) AS base_amount,
  curr.total_amount AS current_amount,
  (curr.total_amount - coalesce(prev.total_amount, 0)) AS growth_amount
FROM public.revenue_yearly curr
LEFT JOIN public.revenue_yearly prev
  ON curr.user_id = prev.user_id
  AND curr.year = prev.year + 1
  AND curr.revenue_type = prev.revenue_type
  AND curr.region = prev.region;


-- ============================================
-- Phase 5: 기존 데이터 초기 집계
-- ============================================
-- 기존 sales_records 데이터를 집계 테이블에 반영
-- (revenue_type, region은 DEFAULT 값으로 자동 세팅됨)

-- 일별 초기 집계
INSERT INTO public.revenue_daily (user_id, date, revenue_type, region, total_amount)
SELECT
  user_id,
  sold_at,
  revenue_type,
  region,
  sum(sale_price * quantity)
FROM public.sales_records
GROUP BY user_id, sold_at, revenue_type, region
ON CONFLICT (user_id, date, revenue_type, region)
DO UPDATE SET total_amount = EXCLUDED.total_amount;

-- 월별 초기 집계
INSERT INTO public.revenue_monthly (user_id, year, month, revenue_type, region, total_amount)
SELECT
  user_id,
  extract(year FROM sold_at)::int,
  extract(month FROM sold_at)::int,
  revenue_type,
  region,
  sum(sale_price * quantity)
FROM public.sales_records
GROUP BY user_id, extract(year FROM sold_at), extract(month FROM sold_at), revenue_type, region
ON CONFLICT (user_id, year, month, revenue_type, region)
DO UPDATE SET total_amount = EXCLUDED.total_amount;

-- 연별 초기 집계
INSERT INTO public.revenue_yearly (user_id, year, revenue_type, region, total_amount)
SELECT
  user_id,
  extract(year FROM sold_at)::int,
  revenue_type,
  region,
  sum(sale_price * quantity)
FROM public.sales_records
GROUP BY user_id, extract(year FROM sold_at), revenue_type, region
ON CONFLICT (user_id, year, revenue_type, region)
DO UPDATE SET total_amount = EXCLUDED.total_amount;
