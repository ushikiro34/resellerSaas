'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
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
}: {
  initialChannel?: string
  initialDate?: string
  onSelectionChange?: (rows: SalesRecord[]) => void
} = {}) {
  const { plan, rowCount, ROW_LIMIT } = usePlanInfo()
  const [data, setData] = useState<SalesRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState(initialChannel || initialDate || '')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
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
      header: '순  번',
      cell: ({ row }) => <span className="text-muted-foreground text-center block">{row.index + 1}</span>,
    }),
    columnHelper.accessor('product_name', {
      header: '상  품  명',
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
      header: '판  매  처',
      cell: (info) => <span className="block text-left">{info.getValue() ?? '-'}</span>,
    }),
    columnHelper.accessor('sold_at', {
      header: '판  매  일',
      cell: (info) => <span className="block text-center">{info.getValue()}</span>,
    }),
    columnHelper.accessor('sale_price', {
      header: '판  매  가',
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
      header: '수  량',
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
      header: '원  가',
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
      header: '수  수  료  1',
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
      header: '수  수  료  2',
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
      header: '수  수  료  3',
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
      header: '광  고  비',
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
      header: '매  출',
      cell: (info) => <span className="block text-right">{fmt(info.getValue())}</span>,
    }),
    columnHelper.accessor('margin', {
      header: '마  진',
      cell: (info) => (
        <span className={`block text-right ${info.getValue() < 0 ? 'text-destructive' : ''}`}>
          {fmt(info.getValue())}
        </span>
      ),
    }),
  ]

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
  })

  useEffect(() => {
    onSelectionChange?.(table.getSelectedRowModel().rows.map((r) => r.original))
  }, [rowSelection])

  // 합계 계산
  const filteredRows = table.getFilteredRowModel().rows
  const totalQty = filteredRows.reduce((s, r) => s + r.original.quantity, 0)
  const totalUnitCost = filteredRows.reduce((s, r) => s + r.original.unit_cost, 0)
  const totalFee1 = filteredRows.reduce((s, r) => s + r.original.fee_1, 0)
  const totalFee2 = filteredRows.reduce((s, r) => s + r.original.fee_2, 0)
  const totalFee3 = filteredRows.reduce((s, r) => s + r.original.fee_3, 0)
  const totalAdCost = filteredRows.reduce((s, r) => s + r.original.ad_cost, 0)
  const totalSales = filteredRows.reduce((s, r) => s + r.original.gross_sales, 0)
  const totalMargin = filteredRows.reduce((s, r) => s + r.original.margin, 0)

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">불러오는 중...</div>
  }

  const isNearLimit = plan === 'free' && rowCount >= ROW_LIMIT * 0.9
  const isAtLimit = plan === 'free' && rowCount >= ROW_LIMIT

  return (
    <div className="space-y-4">
      {isAtLimit && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          데이터 한도(1,000행)에 도달했습니다. 새 데이터를 추가하려면 Pro로 업그레이드하세요.
        </div>
      )}
      {isNearLimit && !isAtLimit && (
        <div className="rounded-md border border-orange-300 bg-orange-50 px-4 py-2 text-sm text-orange-700">
          데이터가 {rowCount}행입니다. 무료 플랜 한도({ROW_LIMIT.toLocaleString()}행)에 근접했습니다.
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          총 {filteredRows.length}개
          {Object.keys(rowSelection).length > 0 && ` · ${Object.keys(rowSelection).length}개 선택됨`}
          {' '}(최대 1,000개)
        </p>
        <div className="flex items-center gap-2">
          <Input
            placeholder="상품명, 판매처 검색..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-64"
          />
          <Button variant="outline" size="sm" onClick={() => setGlobalFilter(globalFilter)}>
            검색
          </Button>
        </div>
        <div />
      </div>

      <div className="rounded-md border overflow-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-10" />
            <col className="w-10" />
            <col className="w-44" />
            <col className="w-20" />
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
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-center font-medium cursor-pointer hover:bg-muted border-r border-slate-200/60 last:border-r-0"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-muted-foreground">
                  데이터가 없습니다. 엑셀을 업로드해주세요.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={[
                    'border-b',
                    row.original._edited
                      ? 'bg-orange-50'
                      : idx % 2 === 0
                        ? 'bg-white'
                        : 'bg-muted/20',
                    'hover:bg-orange-50/40',
                  ].join(' ')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 border-r border-slate-100/80 last:border-r-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/50 font-medium">
              <td colSpan={6} className="px-3 py-2 text-right text-muted-foreground">합계</td>
              <td className="px-3 py-2 text-right">{fmt(totalQty)}</td>
              <td className="px-3 py-2 text-right">{fmt(totalUnitCost)}</td>
              <td className="px-3 py-2 text-right">{fmt(totalFee1)}</td>
              <td className="px-3 py-2 text-right">{fmt(totalFee2)}</td>
              <td className="px-3 py-2 text-right">{fmt(totalFee3)}</td>
              <td className="px-3 py-2 text-right">{fmt(totalAdCost)}</td>
              <td className="px-3 py-2 text-right">{fmt(totalSales)}</td>
              <td className="px-3 py-2 text-right">{fmt(totalMargin)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={Object.keys(rowSelection).length === 0 || deleting}
        >
          {deleting ? '삭제 중...' : `삭제${Object.keys(rowSelection).length > 0 ? ` (${Object.keys(rowSelection).length}건)` : ''}`}
        </Button>
        <Button onClick={handleSave} disabled={pendingChanges.size === 0 || saving}>
          {saving ? '저장 중...' : `저장${pendingChanges.size > 0 ? ` (${pendingChanges.size}건)` : ''}`}
        </Button>
      </div>
    </div>
  )
}