export function Footer() {
  return (
    <footer className="shrink-0 border-t border-border bg-lavender/40 px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
      <span>&copy; {new Date().getFullYear()} 리셀러 데이터. All rights reserved.</span>
      <span>Powered by Reseller SaaS</span>
    </footer>
  )
}