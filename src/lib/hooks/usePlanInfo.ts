'use client'

import { useEffect, useState } from 'react'
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
  const [info, setInfo] = useState<PlanInfo>({
    plan: 'free',
    rowCount: 0,
    uploadCount: 0,
    loading: true,
  })

  useEffect(() => {
    async function fetch() {
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
    }
    fetch()
  }, [])

  return { ...info, ROW_LIMIT, UPLOAD_LIMIT }
}