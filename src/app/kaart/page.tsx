'use client'

import dynamic from 'next/dynamic'

const LeafletMap = dynamic(() => import('@/components/analysis/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
      Kaart laden…
    </div>
  ),
})

export default function KaartPage() {
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="px-4 py-3 border-b bg-background">
        <h1 className="text-lg font-semibold">Percelenkaart Nederland</h1>
        <p className="text-sm text-muted-foreground">Klik op een locatie om die te verkennen</p>
      </div>
      <div className="flex-1">
        <LeafletMap />
      </div>
    </div>
  )
}
