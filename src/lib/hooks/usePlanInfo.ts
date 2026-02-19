'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export interface PlanInfo {
  plan: 'free' | 'pro'
  rowCount: number
  uploadCount: number
  loading: boolean
}

const ROW_LIMIT = 1000
const UPLOAD_LIMIT = 10

export function usePlanInfo() {
  const pathname = usePathname()
  const [info, setInfo] = useState<PlanInfo>({
    plan: 'free',
    rowCount: 0,
    uploadCount: 0,
    loading: true,
  })

  const fetchPlanInfo = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: userData }, { count: rowCount }, { count: uploadCount }] = await Promise.all([
      supabase.from('users').select('plan').eq('id', user.id).single(),
      supabase.from('sales_records').select('*', { count: 'exact', head: true }),
      supabase.from('uploads').select('*', { count: 'exact', head: true }),
    ])

    setInfo({
      plan: (userData?.plan ?? 'free') as 'free' | 'pro',
      rowCount: rowCount ?? 0,
      uploadCount: uploadCount ?? 0,
      loading: false,
    })
  }, [])

  // 페이지 이동 시 재조회
  useEffect(() => {
    fetchPlanInfo()
  }, [pathname, fetchPlanInfo])

  // 탭 포커스 시 재조회 (외부 결제 창에서 복귀 시)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchPlanInfo()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchPlanInfo])

  return { ...info, ROW_LIMIT, UPLOAD_LIMIT }
}