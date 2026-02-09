import { Sidebar } from '@/components/layout/Sidebar'
import { Footer } from '@/components/layout/Footer'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0">
        <main className="flex-1 min-h-0">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  )
}