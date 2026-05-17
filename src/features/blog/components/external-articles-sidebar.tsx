import { ExternalLink } from 'lucide-react'

export interface ExternalArticleEntry {
  _id: string
  title: string
  description: string
  url: string
  category: string
  order: number
}

export function ExternalArticlesSidebar({ articles }: { articles: ExternalArticleEntry[] }) {
  if (articles.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <ExternalLink className="w-3.5 h-3.5 text-orange-500" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Other Articles to Check Out
        </span>
      </div>

      {articles.map((article) => (
        <a
          key={article._id}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-card border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all group"
        >
          <p className="text-sm font-bold text-slate-900 leading-snug mb-1.5 line-clamp-2 group-hover:text-orange-600 transition-colors">
            {article.title}
          </p>
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-3">
            {article.description}
          </p>
          <span className="text-xs font-semibold text-orange-600 flex items-center gap-1">
            Learn more
            <ExternalLink className="w-3 h-3" />
          </span>
        </a>
      ))}
    </div>
  )
}
