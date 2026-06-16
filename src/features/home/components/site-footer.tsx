export function SiteFooter() {
  return (
    <footer className="border-t border-[#E8E0D6] bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#1C1512] tracking-tight">
          AEO: AI Enablement Office
        </span>
        <span className="text-xs text-stone-400">
          Internal showcase, learning log, and C-suite reporting.
        </span>
      </div>
    </footer>
  )
}
