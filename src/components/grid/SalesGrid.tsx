'use client'

import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table'
import { supabase } from '@/lib/supabase/client'
import { usePlanInfo } from '@/lib/hooks/usePlanInfo'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface SalesRecord {
  id: string
  product_name: string
  marketplace: string | null
  sold_at: string
  settlement_due_at: string | null
  sale_price: number
  quantity: number
  unit_cost: number
  fee_1: number
  fee_2: number
  fee_3: number
  ad_cost: number
  gross_sales: number
  margin: number
  _edited?: boolean
}

const columnHelper = createColumnHelper<SalesRecord>()

function fmt(val: number) {
  return val?.toLocaleString('ko-KR') ?? '0'
}

function EditableCell({
  value: initialValue,
  rowId,
  column,
  onUpdate,
  align = 'right',
}: {
  value: number | string
  rowId: string
  column: string
  onUpdate: (id: string, col: string, val: number | string) => void
  align?: 'left' | 'right'
}) {
  const [value, setValue] = useState(initialValue)
  const [editing, setEditing] = useState(false)
  const alignClass = align === 'left' ? 'text-left' : 'text-right'

  const handleBlur = () => {
    setEditing(false)
    if (value !== initialValue) {
      onUpdate(rowId, column, value)
    }
  }

  if (editing) {
    return (
      <input
        className={`w-full border rounded px-1 py-0.5 text-sm ${alignClass}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        autoFocus
      />
    )
  }

  return (
    <span
      className={`cursor-pointer hover:bg-muted rounded px-1 block ${alignClass}`}
      onClick={() => setEditing(true)}
    >
      {typeof value === 'number' ? fmt(value) : value}
    </span>
  )
}

export function SalesGrid({
  initialChannel = '',
  initialDate = '',
  onSelectionChange,
  actionButtons,
}: {
  initialChannel?: string
  initialDate?: string
  onSelectionChange?: (rows: SalesRecord[]) => void
  actionButtons?: ReactNode
} = {}) {
  const { plan, rowCount, ROW_LIMIT } = usePlanInfo()
  const [data, setData] = useState<SalesRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [filterProductName, setFilterProductName] = useState('')
  const [filterMarketplace, setFilterMarketplace] = useState(initialChannel || '')
  const [filterDateFrom, setFilterDateFrom] = useState(initialDate || '')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterPriceMin, setFilterPriceMin] = useState('')
  const [filterPriceMax, setFilterPriceMax] = useState('')
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<SalesRecord>>>(new Map())
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: records } = await supabase
      .from('sales_records')
      .select('*')
      .order('sold_at', { ascending: false })
      .limit(1000)

    setData(records ?? [])
    setLoading(false)
  }

  const recalc = (row: SalesRecord) => {
    const gross_sales = row.sale_price * row.quantity
    const margin =
      row.sale_price * row.quantity -
      (row.unit_cost + row.fee_1 + row.fee_2 + row.fee_3 + row.ad_cost) * row.quantity
    return { ...row, gross_sales, margin }
  }

  // 셀 변경 시 pendingChanges에 누적 (DB 저장 안 함)
  const handleUpdate = useCallback((id: string, col: string, val: number | string) => {
    const isNumericCol = ['sale_price', 'quantity', 'unit_cost', 'fee_1', 'fee_2', 'fee_3', 'ad_cost'].includes(col)
    const finalVal = isNumericCol ? Number(val) : val

    setPendingChanges((prev) => {
      const next = new Map(prev)
      const existing = next.get(id) ?? {}
      next.set(id, { ...existing, [col]: finalVal })
      return next
    })

    setData((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row
        const updated = { ...row, [col]: finalVal, _edited: true }
        return recalc(updated)
      })
    )
  }, [])

  // 선택된 행 삭제
  const handleDelete = async () => {
    const selectedIds = Object.keys(rowSelection).map((idx) => table.getRowModel().rows[Number(idx)]?.original.id).filter(Boolean)
    if (selectedIds.length === 0) return
    if (!confirm(`${selectedIds.length}개 행을 삭제하시겠습니까?`)) return

    setDeleting(true)
    await supabase.from('sales_records').delete().in('id', selectedIds)
    setData((prev) => prev.filter((row) => !selectedIds.includes(row.id)))
    setRowSelection({})
    setPendingChanges((prev) => {
      const next = new Map(prev)
      selectedIds.forEach((id) => next.delete(id))
      return next
    })
    setDeleting(false)
  }

  // 변경 내역 일괄 저장
  const handleSave = async () => {
    if (pendingChanges.size === 0) return
    setSaving(true)

    const promises = Array.from(pendingChanges.entries()).map(([id, changes]) =>
      supabase
        .from('sales_records')
        .update({ ...changes, updated_at: new Date().toISOString() })
        .eq('id', id)
    )

    await Promise.all(promises)

    setPendingChanges(new Map())
    setData((prev) => prev.map((row) => ({ ...row, _edited: false })))
    setSaving(false)
  }

  const columns = [
    // 체크박스
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <div className="flex justify-center">
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="cursor-pointer"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="cursor-pointer"
          />
        </div>
      ),
    }),
    // 행 번호
    columnHelper.display({
      id: 'rownum',
      header: '\u{C21C}  \u{BC88}',
      cell: ({ row }) => <span className="text-muted-foreground text-center block">{row.index + 1}</span>,
    }),
    columnHelper.accessor('product_name', {
      header: '\u{C0C1}  \u{D488}  \u{BA85}',
      cell: (info) => (
        <EditableCell
          value={info.getValue()}
          rowId={info.row.original.id}
          column="product_name"
          onUpdate={handleUpdate}
          align="left"
        />
      ),
    }),
    columnHelper.accessor('marketplace', {
      header: '\u{D310}  \u{B9E4}  \u{CC98}',
      cell: (info) => <span className="block text-left">{info.getValue() ?? '-'}</span>,
    }),
    columnHelper.accessor('sold_at', {
      header: '\u{D310}  \u{B9E4}  \u{C77C}',
      cell: (info) => <span className="block text-center">{info.getValue()}</span>,
    }),
    columnHelper.accessor('sale_price', {
      header: '\u{D310}  \u{B9E4}  \u{AC00}',
      cell: (info) => (
        <EditableCell
          value={info.getValue()}
          rowId={info.row.original.id}
          column="sale_price"
          onUpdate={handleUpdate}
        />
      ),
    }),
    columnHelper.accessor('quantity', {
      header: '\u{C218}  \u{B7C9}',
      cell: (info) => (
        <EditableCell
          value={info.getValue()}
          rowId={info.row.original.id}
          column="quantity"
          onUpdate={handleUpdate}
        />
      ),
    }),
    columnHelper.accessor('unit_cost', {
      header: '\u{C6D0}  \u{AC00}',
      cell: (info) => (
        <EditableCell
          value={info.getValue()}
          rowId={info.row.original.id}
          column="unit_cost"
          onUpdate={handleUpdate}
        />
      ),
    }),
    columnHelper.accessor('fee_1', {
      header: '\u{C218}  \u{C218}  \u{B8CC}  1',
      cell: (info) => (
        <EditableCell
          value={info.getValue()}
          rowId={info.row.original.id}
          column="fee_1"
          onUpdate={handleUpdate}
        />
      ),
    }),
    columnHelper.accessor('fee_2', {
      header: '\u{C218}  \u{C218}  \u{B8CC}  2',
      cell: (info) => (
        <EditableCell
          value={info.getValue()}
          rowId={info.row.original.id}
          column="fee_2"
          onUpdate={handleUpdate}
        />
      ),
    }),
    columnHelper.accessor('fee_3', {
      header: '\u{C218}  \u{C218}  \u{B8CC}  3',
      cell: (info) => (
        <EditableCell
          value={info.getValue()}
          rowId={info.row.original.id}
          column="fee_3"
          onUpdate={handleUpdate}
        />
      ),
    }),
    columnHelper.accessor('ad_cost', {
      header: '\u{AD11}  \u{ACE0}  \u{BE44}',
      cell: (info) => (
        <EditableCell
          value={info.getValue()}
          rowId={info.row.original.id}
          column="ad_cost"
          onUpdate={handleUpdate}
        />
      ),
    }),
    columnHelper.accessor('gross_sales', {
      header: '\u{B9E4}  \u{CD9C}',
      cell: (info) => <span className="block text-right">{fmt(info.getValue())}</span>,
    }),
    columnHelper.accessor('margin', {
      header: '\u{B9C8}  \u{C9C4}',
      cell: (info) => (
        <span className={`block text-right ${info.getValue() < 0 ? 'text-destructive' : ''}`}>
          {fmt(info.getValue())}
        </span>
      ),
    }),
  ]

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (filterProductName && !row.product_name.toLowerCase().includes(filterProductName.toLowerCase())) return false
      if (filterMarketplace && !(row.marketplace ?? '').toLowerCase().includes(filterMarketplace.toLowerCase())) return false
      if (filterDateFrom && row.sold_at < filterDateFrom) return false
      if (filterDateTo && row.sold_at > filterDateTo) return false
      if (filterPriceMin && row.sale_price < Number(filterPriceMin)) return false
      if (filterPriceMax && row.sale_price > Number(filterPriceMax)) return false
      return true
    })
  }, [data, filterProductName, filterMarketplace, filterDateFrom, filterDateTo, filterPriceMin, filterPriceMax])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
  })

  useEffect(() => {
    onSelectionChange?.(table.getSelectedRowModel().rows.map((r) => r.original))
  }, [rowSelection])

  // 합계 계산
  const filteredRows = table.getRowModel().rows
  const totalQty = filteredRows.reduce((s, r) => s + r.original.quantity, 0)
  const totalUnitCost = filteredRows.reduce((s, r) => s + r.original.unit_cost, 0)
  const totalFee1 = filteredRows.reduce((s, r) => s + r.original.fee_1, 0)
  const totalFee2 = filteredRows.reduce((s, r) => s + r.original.fee_2, 0)
  const totalFee3 = filteredRows.reduce((s, r) => s + r.original.fee_3, 0)
  const totalAdCost = filteredRows.reduce((s, r) => s + r.original.ad_cost, 0)
  const totalSales = filteredRows.reduce((s, r) => s + r.original.gross_sales, 0)
  const totalMargin = filteredRows.reduce((s, r) => s + r.original.margin, 0)

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">{'\u{BD88}\u{B7EC}\u{C624}\u{B294} \u{C911}...'}</div>
  }

  const isNearLimit = plan === 'free' && rowCount >= ROW_LIMIT * 0.9
  const isAtLimit = plan === 'free' && rowCount >= ROW_LIMIT

  const selectedCount = Object.keys(rowSelection).length

  const handleReset = () => {
    setFilterProductName('')
    setFilterMarketplace('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterPriceMin('')
    setFilterPriceMax('')
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 상단 고정 영역 */}
      <div className="shrink-0 space-y-4 pb-3">
        {isAtLimit && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-3 text-sm text-destructive font-medium">
            {'\u{B370}\u{C774}\u{D130} \u{D55C}\u{B3C4}(1,000\u{D589})\u{C5D0} \u{B3C4}\u{B2EC}\u{D588}\u{C2B5}\u{B2C8}\u{B2E4}. \u{C0C8} \u{B370}\u{C774}\u{D130}\u{B97C} \u{CD94}\u{AC00}\u{D558}\u{B824}\u{BA74} Pro\u{B85C} \u{C5C5}\u{ADF8}\u{B808}\u{C774}\u{B4DC}\u{D558}\u{C138}\u{C694}.'}
          </div>
        )}
        {isNearLimit && !isAtLimit && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm text-orange-700 font-medium">
            {'\u{B370}\u{C774}\u{D130}\u{AC00} '}{rowCount}{'\u{D589}\u{C785}\u{B2C8}\u{B2E4}. \u{BB34}\u{B8CC} \u{D50C}\u{B79C} \u{D55C}\u{B3C4}('}{ROW_LIMIT.toLocaleString()}{'\u{D589})\u{C5D0} \u{ADF8}\u{C811}\u{D588}\u{C2B5}\u{B2C8}\u{B2E4}.'}
          </div>
        )}

        {/* 검색 영역 */}
        <div className="bg-card border border-border rounded-xl px-5 py-4 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2 w-[186px]">
                <label className="text-sm font-bold shrink-0 text-primary">{'\u{C0C1}\u{D488}\u{BA85}'}</label>
                <Input className="h-8 text-xs" placeholder={'\u{C0C1}\u{D488}\u{BA85}'} value={filterProductName} onChange={(e) => setFilterProductName(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 w-[168px]">
                <label className="text-sm font-bold shrink-0 text-primary">{'\u{D310}\u{B9E4}\u{CC98}'}</label>
                <Input className="h-8 text-xs" placeholder={'\u{D310}\u{B9E4}\u{CC98}'} value={filterMarketplace} onChange={(e) => setFilterMarketplace(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 w-[350px]">
                <label className="text-sm font-bold shrink-0 text-primary">{'\u{D310}\u{B9E4}\u{C77C}'}</label>
                <div className="flex items-center gap-1">
                  <Input className="h-8 text-xs" type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
                  <span className="text-xs text-muted-foreground shrink-0">~</span>
                  <Input className="h-8 text-xs" type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2 w-[250px]">
                <label className="text-sm font-bold shrink-0 text-primary">{'\u{D310}\u{B9E4}\u{AC00}'}</label>
                <div className="flex items-center gap-1">
                  <Input className="h-8 text-xs" type="number" placeholder={'\u{CD5C}\u{C18C}'} value={filterPriceMin} onChange={(e) => setFilterPriceMin(e.target.value)} />
                  <span className="text-xs text-muted-foreground shrink-0">~</span>
                  <Input className="h-8 text-xs" type="number" placeholder={'\u{CD5C}\u{B300}'} value={filterPriceMax} onChange={(e) => setFilterPriceMax(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" className="font-bold flex items-center gap-1 h-8 text-xs px-3" onClick={handleReset}>
                <span className="material-symbols-outlined text-base">refresh</span>
                {'\u{CD08}\u{AE30}\u{D654}'}
              </Button>
              <Button size="sm" className="bg-primary text-primary-foreground font-bold flex items-center gap-1 shadow-lg shadow-primary/20 px-3 h-8 text-xs">
                <span className="material-symbols-outlined text-base">search</span>
                {'\u{C870}\u{D68C}'}
              </Button>
            </div>
          </div>
        </div>

        {/* 그리드 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {'\u{C804}\u{CCB4} '}<b className="text-foreground font-bold">{filteredRows.length}</b>{'\u{AC1C}'}
              {selectedCount > 0 && (
                <>{' \u{00B7} '}<b className="text-foreground font-bold">{selectedCount}</b>{'\u{AC1C} \u{C120}\u{D0DD}\u{B428}'}</>
              )}
              <span className="text-xs ml-1">{`(\u{CD5C}\u{B300} 1,000\u{AC1C})`}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {actionButtons}
          </div>
        </div>
      </div>

      {/* 데이터 테이블 - 상하좌우 스크롤 */}
      <div className="flex-1 min-h-0 bg-card border border-border rounded-xl overflow-auto shadow-sm">
        <table className="w-full text-sm table-fixed min-w-[1000px]">
          <colgroup>
            <col className="w-[38px]" />
            <col className="w-[45px]" />
            <col className="w-[166px]" />
            <col className="w-[90px]" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-16" />
            <col className="w-24" />
            <col className="w-20" />
            <col className="w-20" />
            <col className="w-20" />
            <col className="w-20" />
            <col className="w-24" />
            <col className="w-24" />
          </colgroup>
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-lavender border-b border-border">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="grid-divider px-4 py-3.5 text-center text-sm font-extrabold text-foreground tracking-wide cursor-pointer hover:bg-lavender transition-colors"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' ? ' \u{2191}' : header.column.getIsSorted() === 'desc' ? ' \u{2193}' : ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center text-muted-foreground">
                  <span className="material-symbols-outlined text-4xl mb-2 block opacity-30">table_rows</span>
                  {'\u{B370}\u{C774}\u{D130}\u{AC00} \u{C5C6}\u{C2B5}\u{B2C8}\u{B2E4}. \u{C5D1}\u{C140}\u{C744} \u{C5C5}\u{B85C}\u{B4DC}\u{D574}\u{C8FC}\u{C138}\u{C694}.'}
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr
                  key={row.id}
                  className={[
                    'transition-colors',
                    row.original._edited
                      ? 'bg-amber-50/80'
                      : 'bg-card',
                    'hover:bg-lavender/30',
                  ].join(' ')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="grid-divider px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="sticky bottom-0 z-10">
            <tr className="bg-lavender border-t-2 border-border">
              <td colSpan={5} className="px-4 py-4" />
              <td className="grid-divider px-4 py-4 text-right text-xs uppercase tracking-widest text-muted-foreground font-bold">{'\u{D569}\u{ACC4}'}</td>
              <td className="grid-divider px-4 py-4 text-right text-sm font-bold">{fmt(totalQty)}</td>
              <td className="grid-divider px-4 py-4 text-right text-sm font-bold">{fmt(totalUnitCost)}</td>
              <td className="grid-divider px-4 py-4 text-right text-sm font-bold">{fmt(totalFee1)}</td>
              <td className="grid-divider px-4 py-4 text-right text-sm font-bold">{fmt(totalFee2)}</td>
              <td className="grid-divider px-4 py-4 text-right text-sm font-bold">{fmt(totalFee3)}</td>
              <td className="grid-divider px-4 py-4 text-right text-sm font-bold">{fmt(totalAdCost)}</td>
              <td className="grid-divider px-4 py-4 text-right text-sm font-bold text-primary">{fmt(totalSales)}</td>
              <td className="px-4 py-4 text-right text-sm font-bold text-primary">{fmt(totalMargin)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 하단 액션 바 - 공용 풋터 위 고정 */}
      <div className="shrink-0 border-t border-border bg-card px-5 py-3 flex justify-end gap-3 mt-0 rounded-b-xl">
        <Button
          variant="outline"
          className="border-rose-200 text-rose-400 hover:bg-rose-50 hover:text-rose-500 font-bold flex items-center gap-2 shadow-sm"
          onClick={handleDelete}
          disabled={selectedCount === 0 || deleting}
        >
          <span className="material-symbols-outlined text-lg">delete</span>
          {deleting ? '\u{C0AD}\u{C81C} \u{C911}...' : `\u{C0AD}\u{C81C}${selectedCount > 0 ? ` (${selectedCount}\u{AC74})` : ''}`}
        </Button>
        <Button
          className="bg-primary text-primary-foreground font-bold flex items-center gap-2 shadow-lg shadow-primary/20 px-8"
          onClick={handleSave}
          disabled={pendingChanges.size === 0 || saving}
        >
          <span className="material-symbols-outlined text-lg">save</span>
          {saving ? '\u{C800}\u{C7A5} \u{C911}...' : `\u{C800}\u{C7A5}${pendingChanges.size > 0 ? ` (${pendingChanges.size}\u{AC74})` : ''}`}
        </Button>
      </div>
    </div>
  )
}