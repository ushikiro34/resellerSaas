'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { usePlanInfo } from '@/lib/hooks/usePlanInfo'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Table2, LogOut, TrendingUp, Sparkles } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/analytics', label: '매출 분석', icon: TrendingUp },
  { href: '/grid', label: '판매 데이터', icon: Table2 },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { plan, rowCount, uploadCount, ROW_LIMIT, UPLOAD_LIMIT, loading } = usePlanInfo()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const rowPct = Math.min((rowCount / ROW_LIMIT) * 100, 100)
  const isNearLimit = plan === 'free' && rowCount >= ROW_LIMIT * 0.9

  return (
    <aside className="relative flex h-screen w-56 flex-col bg-[#13112b] border-r border-white/5 overflow-hidden">
      {/* 하단 글로우 효과 */}
      <div className="absolute -bottom-16 -left-8 w-40 h-40 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

      {/* 로고 */}
      <div className="flex h-14 items-center gap-2 px-4 border-b border-white/10">
        <div className="w-2 h-2 rounded-full bg-indigo-400" />
        <span className="font-bold text-lg text-white">리셀러 데이터</span>
      </div>

      {/* 유저 프로필 */}
      {userEmail && (
        <Link
          href="/mypage"
          className={cn(
            'flex items-center gap-3 mx-2 mt-3 p-3 rounded-xl border transition-all',
            pathname === '/mypage'
              ? 'bg-white/10 border-indigo-400/30'
              : 'bg-white/5 border-white/5 hover:bg-white/8 hover:border-white/10'
          )}
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg shadow-indigo-500/20">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-200 truncate">{userEmail}</p>
            <p className={cn(
              'text-[10px] font-semibold uppercase tracking-wider',
              plan === 'pro' ? 'text-indigo-400' : 'text-slate-500'
            )}>
              {plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
            </p>
          </div>
        </Link>
      )}

      {/* 네비게이션 */}
      <nav className="flex-1 space-y-1 p-2 mt-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-indigo-400" />
              )}
              <Icon className={cn('h-4 w-4', isActive ? 'text-indigo-400' : '')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* 플랜 정보 */}
      {!loading && (
        <div className="relative z-10 px-3 py-3 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">플랜</span>
            <span className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full',
              plan === 'pro'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20'
                : 'bg-white/10 text-slate-400'
            )}>
              {plan === 'pro' ? 'PRO' : 'FREE'}
            </span>
          </div>
          {plan === 'free' && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>데이터</span>
                  <span className={isNearLimit ? 'text-red-400 font-medium' : 'text-slate-400'}>
                    {rowCount.toLocaleString()} / {ROW_LIMIT.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', isNearLimit ? 'bg-red-400' : 'bg-indigo-400')}
                    style={{ width: `${rowPct}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>업로드</span>
                <span className="text-slate-400">{uploadCount} / {UPLOAD_LIMIT}회</span>
              </div>
              <Link
                href="/pricing"
                className="flex items-center justify-center gap-1.5 w-full mt-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-indigo-900/30"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Pro 업그레이드
              </Link>
            </>
          )}
        </div>
      )}

      {/* 로그아웃 */}
      <div className="relative z-10 p-2 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </aside>
  )
}
