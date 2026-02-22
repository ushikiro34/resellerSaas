'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  CHART_PRESETS,
  type ChartColors,
} from '@/lib/hooks/useChartColors'

interface ChartColorDialogProps {
  page: 'dashboard' | 'analytics'
  open: boolean
  onOpenChange: (open: boolean) => void
  colors: ChartColors
  onApply: (colors: ChartColors) => void
}

const COLOR_LABELS_DASHBOARD = [
  { key: 'primary' as const, label: '매출' },
  { key: 'secondary' as const, label: '마진' },
]

const COLOR_LABELS_ANALYTICS = [
  { key: 'primary' as const, label: '매출 / 당년' },
  { key: 'secondary' as const, label: '마진' },
  { key: 'tertiary' as const, label: '전년' },
]

export function ChartColorDialog({ page, open, onOpenChange, colors, onApply }: ChartColorDialogProps) {
  const [draft, setDraft] = useState<ChartColors>(colors)
  const [activePreset, setActivePreset] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setDraft(colors)
      const match = CHART_PRESETS.find(
        p => p.colors.primary === colors.primary && p.colors.secondary === colors.secondary
      )
      setActivePreset(match?.name ?? null)
    }
  }, [open, colors])

  const labels = page === 'dashboard' ? COLOR_LABELS_DASHBOARD : COLOR_LABELS_ANALYTICS

  function handlePreset(presetName: string) {
    const preset = CHART_PRESETS.find(p => p.name === presetName)
    if (preset) {
      setDraft(preset.colors)
      setActivePreset(presetName)
    }
  }

  function handleColorChange(key: keyof ChartColors, value: string) {
    setDraft(prev => ({ ...prev, [key]: value }))
    setActivePreset(null)
  }

  function handleApply() {
    onApply(draft)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[530px]">
        <DialogHeader>
          <DialogTitle>차트 색상 설정</DialogTitle>
          <DialogDescription>
            {page === 'dashboard' ? '대시보드' : '매출분석'} 차트의 색상을 변경합니다.
          </DialogDescription>
        </DialogHeader>

        <hr className="border-border" />

        {/* 프리셋 팔레트 */}
        <div className="space-y-2">
          <p className="text-sm font-medium">프리셋</p>
          <div className="flex gap-3">
            {CHART_PRESETS.map(preset => (
              <button
                key={preset.name}
                onClick={() => handlePreset(preset.name)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all ${activePreset === preset.name
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:bg-muted'
                  }`}
              >
                <div className="flex gap-1">
                  <span className="w-5 h-5 rounded-full border border-black/10" style={{ backgroundColor: preset.colors.primary }} />
                  <span className="w-5 h-5 rounded-full border border-black/10" style={{ backgroundColor: preset.colors.secondary }} />
                  <span className="w-5 h-5 rounded-full border border-black/10" style={{ backgroundColor: preset.colors.tertiary }} />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        <hr className="border-border" />

        {/* 개별 색상 선택 */}
        <div className="space-y-2">
          <p className="text-sm font-medium">개별 색상</p>
          <div className="space-y-2 bg-muted/40 rounded-lg p-3">
            {labels.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <label
                  className="relative w-9 h-9 rounded-lg border border-input overflow-hidden cursor-pointer shrink-0"
                  style={{ backgroundColor: draft[key] }}
                >
                  <input
                    type="color"
                    value={draft[key]}
                    onChange={e => handleColorChange(key, e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted-foreground ml-auto font-mono">{draft[key]}</span>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-border" />

        {/* 미리보기 */}
        <div className="space-y-2">
          <p className="text-sm font-medium">미리보기</p>
          <div className="flex items-end gap-2 h-16 p-3 bg-muted/50 rounded-lg">
            <div className="flex-1 rounded-t" style={{ backgroundColor: draft.primary, height: '100%' }} />
            <div className="flex-1 rounded-t" style={{ backgroundColor: draft.secondary, height: '70%' }} />
            {page === 'analytics' && (
              <div className="flex-1 rounded-t" style={{ backgroundColor: draft.tertiary, height: '50%' }} />
            )}
            <div className="flex-1 rounded-t" style={{ backgroundColor: draft.primary, height: '85%' }} />
            <div className="flex-1 rounded-t" style={{ backgroundColor: draft.secondary, height: '60%' }} />
          </div>
        </div>

        <hr className="border-border" />

        {/* 버튼 */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleApply}>
            적용
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
