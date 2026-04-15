interface ProductBadgeProps {
  name: string
  color: string
  size?: 'sm' | 'md'
}

export function ProductBadge({ name, color, size = 'md' }: ProductBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      <span
        className="rounded-full flex-shrink-0"
        style={{
          backgroundColor: color,
          width: size === 'sm' ? '6px' : '8px',
          height: size === 'sm' ? '6px' : '8px',
        }}
      />
      <span className="text-slate-600 font-medium">{name}</span>
    </span>
  )
}
