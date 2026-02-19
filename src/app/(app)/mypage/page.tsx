'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { usePlanInfo } from '@/lib/hooks/usePlanInfo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { User, Zap, Settings, AlertTriangle } from 'lucide-react'

interface UserInfo {
  id: string
  email: string
  created_at: string
  provider: string
}

export default function MyPage() {
  const router = useRouter()
  const { plan, rowCount, uploadCount, ROW_LIMIT, UPLOAD_LIMIT, loading: planLoading } = usePlanInfo()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // 구독 상태
  const [subStatus, setSubStatus] = useState<string | null>(null) // 'active' | 'cancelled' | null
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [periodEndDate, setPeriodEndDate] = useState('')

  // 비밀번호 변경 모달
  const [pwModalOpen, setPwModalOpen] = useState(false)
  const [oauthModalOpen, setOauthModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login')
        return
      }
      setUser({
        id: data.user.id,
        email: data.user.email ?? '',
        created_at: data.user.created_at,
        provider: data.user.app_metadata?.provider ?? 'email',
      })
      setLoading(false)

      // 구독 상태 조회
      fetch('/api/toss/subscription', { method: 'POST' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setSubStatus(data.status)
            if (data.nextBillingDate) {
              setPeriodEndDate(new Date(data.nextBillingDate).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }))
            }
          }
        })
        .catch(() => {})
    })
  }, [router])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMessage(null)

    if (newPassword.length < 6) {
      setPwMessage({ type: 'error', text: '비밀번호는 최소 6자 이상이어야 합니다.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: '비밀번호가 일치하지 않습니다.' })
      return
    }

    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPwMessage({ type: 'error', text: error.message })
    } else {
      setPwMessage({ type: 'success', text: '비밀번호가 변경되었습니다.' })
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPwModalOpen(false), 1500)
    }
    setPwLoading(false)
  }

  const handlePasswordClick = () => {
    if (isOAuth) {
      setOauthModalOpen(true)
    } else {
      setPwMessage(null)
      setNewPassword('')
      setConfirmPassword('')
      setPwModalOpen(true)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleCancelSubscription = async () => {
    setCancelLoading(true)
    try {
      const res = await fetch('/api/toss/cancel', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setSubStatus('cancelled')
        if (data.activeUntil) {
          setPeriodEndDate(new Date(data.activeUntil).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }))
        }
        setCancelModalOpen(false)
      }
    } catch {
      // 에러 처리
    }
    setCancelLoading(false)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">불러오는 중...</p>
      </div>
    )
  }

  if (!user) return null

  const isOAuth = user.provider !== 'email'
  const providerLabel = isOAuth
    ? user.provider.charAt(0).toUpperCase() + user.provider.slice(1) + ' 계정으로 로그인됨'
    : '이메일'
  const joinDate = new Date(user.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const rowPct = Math.min((rowCount / ROW_LIMIT) * 100, 100)
  const uploadPct = Math.min((uploadCount / UPLOAD_LIMIT) * 100, 100)
  const isRowNearLimit = plan === 'free' && rowCount >= ROW_LIMIT * 0.9
  const isUploadAtLimit = plan === 'free' && uploadCount >= UPLOAD_LIMIT

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold tracking-tight">마이페이지</h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* 계정 정보 */}
          <section className="bg-card rounded-2xl p-8 shadow-sm border">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                계정 정보
              </h3>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">이메일</label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-medium">{user.email}</span>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded border border-primary/20 uppercase">
                    Primary
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">로그인 방식</label>
                <div className="flex items-center gap-2 mt-1">
                  {isOAuth && user.provider === 'google' && (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  <span className="font-medium">{providerLabel}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">가입일</label>
                <p className="font-medium mt-1">{joinDate}</p>
              </div>
            </div>
          </section>

          {/* 플랜 정보 */}
          <section className="bg-card rounded-2xl p-8 shadow-sm border">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                플랜 정보
              </h3>
              <span className={cn(
                'px-3 py-1 text-xs font-bold rounded-full',
                plan === 'pro'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/10 text-primary'
              )}>
                {plan === 'pro' ? 'PRO' : 'FREE'}
              </span>
            </div>
            {!planLoading && (
              <div className="space-y-8">
                {/* 데이터 사용량 */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">데이터 사용량</label>
                    <span className="text-sm font-bold">
                      {rowCount.toLocaleString()} <span className="text-muted-foreground font-normal">/ {ROW_LIMIT.toLocaleString()}행</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        isRowNearLimit ? 'bg-destructive' : 'bg-primary'
                      )}
                      style={{ width: `${Math.max(rowPct, 1)}%` }}
                    />
                  </div>
                </div>

                {/* 업로드 횟수 */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">업로드 횟수</label>
                    <span className="text-sm font-bold">
                      {uploadCount} <span className="text-muted-foreground font-normal">/ {plan === 'pro' ? '무제한' : `${UPLOAD_LIMIT}회`}</span>
                    </span>
                  </div>
                  {plan !== 'pro' && (
                    <>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            isUploadAtLimit ? 'bg-destructive' : 'bg-primary'
                          )}
                          style={{ width: `${Math.max(uploadPct, 1)}%` }}
                        />
                      </div>
                      {isUploadAtLimit && (
                        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-normal">
                            무료 플랜의 업로드 한도에 도달했습니다. 더 많은 업로드를 위해 Pro 플랜으로 업그레이드하세요.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* 구독 관리 버튼 */}
                <div className="pt-4 border-t">
                  {plan === 'pro' && subStatus === 'active' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-bold text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
                      onClick={() => setCancelModalOpen(true)}
                    >
                      구독 해지
                    </Button>
                  ) : plan === 'pro' && subStatus === 'cancelled' ? (
                    <p className="text-sm text-muted-foreground">
                      구독이 해지되었습니다. <span className="font-medium text-foreground">{periodEndDate}</span>까지 Pro 기능을 사용할 수 있습니다.
                    </p>
                  ) : (
                    <Button size="sm" asChild>
                      <a href="/pricing">Pro 업그레이드</a>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* 계정 관리 */}
        <section className="bg-card rounded-2xl p-8 shadow-sm border">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-muted-foreground" />
            계정 관리
          </h3>
          <div className="flex flex-wrap gap-4">
            <Button
              variant="outline"
              className="px-6"
              onClick={handlePasswordClick}
            >
              비밀번호 변경
            </Button>
            <Button
              variant="outline"
              className="px-6 ml-auto border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={handleSignOut}
            >
              로그아웃
            </Button>
          </div>
        </section>
      </div>

      {/* 비밀번호 변경 모달 (이메일 유저) */}
      <Dialog open={pwModalOpen} onOpenChange={setPwModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>비밀번호 변경</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1">
              <Label>새 비밀번호</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="6자 이상"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>비밀번호 확인</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {pwMessage && (
              <p className={cn(
                'text-sm',
                pwMessage.type === 'error' ? 'text-destructive' : 'text-emerald-600'
              )}>
                {pwMessage.text}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setPwModalOpen(false)}>취소</Button>
              <Button type="submit" disabled={pwLoading}>
                {pwLoading ? '변경 중...' : '변경'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 구독 해지 확인 모달 */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>구독 해지</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div className="text-sm leading-relaxed">
                <p className="font-semibold text-destructive mb-1">정말 구독을 해지하시겠습니까?</p>
                <p className="text-muted-foreground">
                  해지 시 {periodEndDate ? <span className="font-semibold text-foreground">{periodEndDate}</span> : '현재 결제 주기 종료'} 이후 무료 플랜으로 전환됩니다.
                </p>
                <p className="text-muted-foreground mt-1">
                  판매데이터에 등록된 데이터 1,000건 이외에는 데이터의 손실이 발생할 수 있으며, 업로드 횟수 또한 제한됩니다.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelModalOpen(false)}>취소</Button>
              <Button
                variant="destructive"
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
              >
                {cancelLoading ? '처리 중...' : '구독 해지하기'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Google 계정 비밀번호 안내 모달 */}
      <Dialog open={oauthModalOpen} onOpenChange={setOauthModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>비밀번호 변경 안내</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <svg className="w-8 h-8 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <p className="text-sm leading-relaxed">
                Google 계정은 Google에서 비밀번호를 변경하세요.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOauthModalOpen(false)}>닫기</Button>
              <Button asChild>
                <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">
                  Google 계정으로 이동
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
