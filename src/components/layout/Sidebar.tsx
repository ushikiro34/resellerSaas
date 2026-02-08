'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { usePlanInfo } from '@/lib/hooks/usePlanInfo'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Table2, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/grid', label: '판매 데이터', icon: Table2 },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { plan, rowCount, uploadCount, ROW_LIMIT, UPLOAD_LIMIT, loading } = usePlanInfo()
  const [upgrading, setUpgrading] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const rowPct = Math.min((rowCount / ROW_LIMIT) * 100, 100)
  const isNearLimit = plan === 'free' && rowCount >= ROW_LIMIT * 0.9

  const handleUpgrade = async () => {
    setUpgrading(true)
    const { data: { user, session } } = await supabase.auth.getUser().then(async (u) => ({
      data: { user: u.data.user, session: (await supabase.auth.getSession()).data.session }
    }))
    if (!user) { setUpgrading(false); return }

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, email: user.email }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
    setUpgrading(false)
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-background">
      <div className="flex h-14 items-center px-4 border-b">
        <span className="font-bold text-lg">리셀러 데이터</span>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              pathname === href
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {!loading && (
        <div className="px-3 py-3 border-t space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">플랜</span>
            <span className={cn(
              'text-xs font-medium px-1.5 py-0.5 rounded',
              plan === 'pro'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}>
              {plan === 'pro' ? 'PRO' : 'FREE'}
            </span>
          </div>
          {plan === 'free' && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>데이터</span>
                  <span className={isNearLimit ? 'text-destructive font-medium' : ''}>
                    {rowCount.toLocaleString()} / {ROW_LIMIT.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', isNearLimit ? 'bg-destructive' : 'bg-primary')}
                    style={{ width: `${rowPct}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>업로드</span>
                <span>{uploadCount} / {UPLOAD_LIMIT}회</span>
              </div>
              <Button
                size="sm"
                className="w-full mt-1"
                onClick={handleUpgrade}
                disabled={upgrading}
              >
                {upgrading ? '처리 중...' : '⚡ Pro 업그레이드'}
              </Button>
            </>
          )}
        </div>
      )}

      <div className="p-2 border-t">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </aside>
  )
}