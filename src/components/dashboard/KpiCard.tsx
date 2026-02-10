interface KpiCardProps {
  title: string
  value: string
  sub?: string
  icon?: string
  iconColor?: string
}

export function KpiCard({ title, value, sub, icon, iconColor = 'text-primary' }: KpiCardProps) {
  return (
    <div className="bg-card p-6 rounded-2xl shadow-sm border transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {icon && (
          <span className={`material-symbols-outlined text-xl ${iconColor}`}>{icon}</span>
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-2xl font-bold">{value}</span>
        {sub && <span className="text-xs text-muted-foreground mt-1">{sub}</span>}
      </div>
    </div>
  )
}