import { formatDate } from '@/lib/utils'
import { ProductBadge } from './ProductBadge'

interface Product {
  _id: string
  name: string
  color: string
}

interface UpdateDetailProps {
  update: {
    title: string
    summary: string
    content: string
    date: string | Date
    highlights: string[]
    productId: Product
  }
}

export function UpdateDetail({ update }: UpdateDetailProps) {
  const product = update.productId

  return (
    <article className="max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          {product && <ProductBadge name={product.name} color={product.color} />}
          <span className="text-slate-300">·</span>
          <time className="text-sm text-slate-400">{formatDate(update.date)}</time>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">{update.title}</h1>
        <p className="text-base text-slate-500 leading-7">{update.summary}</p>
      </div>

      {update.highlights && update.highlights.length > 0 && (
        <div className="mb-8 p-5 bg-slate-50 rounded-xl border border-slate-100">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Key Highlights
          </h2>
          <ul className="space-y-2">
            {update.highlights.map((highlight, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: product?.color || '#6366f1' }}
                />
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="prose">
        <MarkdownContent content={update.content} />
      </div>
    </article>
  )
}

// Simple markdown renderer using dangerouslySetInnerHTML would be risky.
// We render structured markdown sections using regex parsing for safety.
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('### ')) {
      elements.push(<h3 key={key++}>{parseInline(line.slice(4))}</h3>)
      i++
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={key++}>{parseInline(line.slice(3))}</h2>)
      i++
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={key++}>{parseInline(line.slice(2))}</h1>)
      i++
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={key++}>
          {items.map((item, j) => (
            <li key={j}>{parseInline(item)}</li>
          ))}
        </ul>
      )
    } else if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      elements.push(
        <ol key={key++}>
          {items.map((item, j) => (
            <li key={j}>{parseInline(item)}</li>
          ))}
        </ol>
      )
    } else if (line.startsWith('> ')) {
      elements.push(<blockquote key={key++}>{parseInline(line.slice(2))}</blockquote>)
      i++
    } else if (line.startsWith('---') || line.startsWith('***') || line.startsWith('___')) {
      elements.push(<hr key={key++} />)
      i++
    } else if (line.startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      elements.push(
        <pre key={key++}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
    } else if (/^\!\[.*?\]\([^)]*\)$/.test(line.trim())) {
      const match = line.trim().match(/^\!\[(.*?)\]\(([^)]*)\)$/)
      if (match) {
        elements.push(
          // eslint-disable-next-line @next/next/no-img-element
          <img key={key++} src={match[2]} alt={match[1]} className="max-w-full rounded-lg my-4" />
        )
      }
      i++
    } else if (line.trim() === '') {
      i++
    } else {
      elements.push(<p key={key++}>{parseInline(line)}</p>)
      i++
    }
  }

  return <div>{elements}</div>
}

function parseInline(text: string): React.ReactNode {
  // Handle **bold**, *italic*, `code`, ![img](url), and plain text
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\!\[[^\]]*\]\([^)]*\))/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i}>{part.slice(1, -1)}</code>
    }
    const imgMatch = part.match(/^\!\[([^\]]*)\]\(([^)]*)\)$/)
    if (imgMatch) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img key={i} src={imgMatch[2]} alt={imgMatch[1]} className="max-w-full rounded-lg" />
    }
    return part
  })
}
