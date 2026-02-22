'use client'

import { useState, useCallback, useEffect } from 'react'

export interface ChartColors {
  primary: string
  secondary: string
  tertiary: string
}

export interface ChartPreset {
  name: string
  label: string
  colors: ChartColors
}

export const CHART_PRESETS: ChartPreset[] = [
  { name: 'purple', label: '보라', colors: { primary: '#7c3aed', secondary: '#06b6d4', tertiary: '#c4b5fd' } },
  { name: 'blue', label: '파랑', colors: { primary: '#2563eb', secondary: '#10b981', tertiary: '#93c5fd' } },
  { name: 'green', label: '초록', colors: { primary: '#059669', secondary: '#f59e0b', tertiary: '#6ee7b7' } },
  { name: 'orange', label: '오렌지', colors: { primary: '#ea580c', secondary: '#0891b2', tertiary: '#fdba74' } },
  { name: 'slate', label: '슬레이트', colors: { primary: '#475569', secondary: '#0d9488', tertiary: '#94a3b8' } },
]

const DEFAULT_COLORS = CHART_PRESETS[0].colors

function getStorageKey(page: string) {
  return `chart-colors-${page}`
}

function loadColors(page: string): ChartColors {
  if (typeof window === 'undefined') return DEFAULT_COLORS
  try {
    const raw = localStorage.getItem(getStorageKey(page))
    if (raw) return JSON.parse(raw)
  } catch {}
  return DEFAULT_COLORS
}

export function getPieColors(primary: string): string[] {
  // Generate 4-color gradient from primary by adjusting opacity-like lightness
  return [primary, adjustColor(primary, 0.6), adjustColor(primary, 0.4), adjustColor(primary, 0.25)]
}

function adjustColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const nr = Math.round(r + (255 - r) * (1 - factor))
  const ng = Math.round(g + (255 - g) * (1 - factor))
  const nb = Math.round(b + (255 - b) * (1 - factor))
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
}

export function useChartColors(page: 'dashboard' | 'analytics') {
  const [colors, setColorsState] = useState<ChartColors>(DEFAULT_COLORS)

  useEffect(() => {
    setColorsState(loadColors(page))
  }, [page])

  const setColors = useCallback((newColors: ChartColors) => {
    setColorsState(newColors)
    localStorage.setItem(getStorageKey(page), JSON.stringify(newColors))
  }, [page])

  const setPreset = useCallback((presetName: string) => {
    const preset = CHART_PRESETS.find(p => p.name === presetName)
    if (preset) setColors(preset.colors)
  }, [setColors])

  return { colors, setColors, setPreset }
}
