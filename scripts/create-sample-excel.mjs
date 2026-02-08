import * as XLSX from 'xlsx'

const rows = [
  { product_name: '나이키 에어맥스 270', marketplace: '무신사', sold_at: '2025-01-05', sale_price: 120000, quantity: 2, unit_cost: 80000, fee_1: 6000, fee_2: 0, fee_3: 0, ad_cost: 2000 },
  { product_name: '아디다스 울트라부스트', marketplace: '크림', sold_at: '2025-01-07', sale_price: 180000, quantity: 1, unit_cost: 130000, fee_1: 9000, fee_2: 0, fee_3: 0, ad_cost: 3000 },
  { product_name: '뉴발란스 574', marketplace: '무신사', sold_at: '2025-01-10', sale_price: 95000, quantity: 3, unit_cost: 60000, fee_1: 4750, fee_2: 0, fee_3: 0, ad_cost: 1500 },
  { product_name: '조던 1 레트로', marketplace: '크림', sold_at: '2025-01-12', sale_price: 350000, quantity: 1, unit_cost: 280000, fee_1: 17500, fee_2: 0, fee_3: 0, ad_cost: 5000 },
  { product_name: '컨버스 척테일러', marketplace: '29cm', sold_at: '2025-01-15', sale_price: 75000, quantity: 4, unit_cost: 45000, fee_1: 3750, fee_2: 0, fee_3: 0, ad_cost: 1000 },
  { product_name: '나이키 덩크 로우', marketplace: '크림', sold_at: '2025-01-18', sale_price: 160000, quantity: 2, unit_cost: 110000, fee_1: 8000, fee_2: 0, fee_3: 0, ad_cost: 2500 },
  { product_name: '살로몬 XT-6', marketplace: '29cm', sold_at: '2025-01-20', sale_price: 220000, quantity: 1, unit_cost: 165000, fee_1: 11000, fee_2: 0, fee_3: 0, ad_cost: 3500 },
  { product_name: '반스 올드스쿨', marketplace: '무신사', sold_at: '2025-01-22', sale_price: 89000, quantity: 2, unit_cost: 55000, fee_1: 4450, fee_2: 0, fee_3: 0, ad_cost: 1200 },
  { product_name: '아식스 젤카야노', marketplace: '무신사', sold_at: '2025-01-25', sale_price: 145000, quantity: 1, unit_cost: 95000, fee_1: 7250, fee_2: 0, fee_3: 0, ad_cost: 2000 },
  { product_name: '조던 4 레트로', marketplace: '크림', sold_at: '2025-01-28', sale_price: 420000, quantity: 1, unit_cost: 330000, fee_1: 21000, fee_2: 0, fee_3: 0, ad_cost: 7000 },
]

const ws = XLSX.utils.json_to_sheet(rows)
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, '판매데이터')
XLSX.writeFile(wb, 'sample-sales.xlsx')

console.log('sample-sales.xlsx 생성 완료')