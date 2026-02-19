export type RevenueType = 'product' | 'subscription' | 'ads'

export interface SalesRecord {
  id: string
  user_id: string
  product_name: string
  marketplace: string | null
  sold_at: string
  settlement_due_at: string | null
  sale_price: number
  unit_cost: number
  ad_cost: number
  fee_1: number
  fee_2: number
  fee_3: number
  quantity: number
  gross_sales: number
  total_fee: number
  margin: number
  revenue_type: RevenueType
  region: string
  created_at: string
  updated_at: string
}

export interface UserSettings {
  user_id: string
  dashboard_range_days: number
  currency: string
  theme: string
  created_at: string
}

export interface DashboardKPI {
  total_sales: number
  total_fee: number
  total_margin: number
  total_quantity: number
  avg_margin_rate: number
}