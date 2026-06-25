// Canonical display order for update sections (domains). Domains not listed
// here fall to the end, alphabetically. Shared between the public updates page
// and the editor filter bar so the Section dropdown order stays in sync.
export const DOMAIN_ORDER = [
  'General',
  'Products',
  'Central Solutions',
  'Frontier',
  'Performance',
  'AI Governance',
  'Strategy, Partnerships & Cap Dev',
  'People & Culture',
]

export function compareDomainsByOrder(a: { name: string }, b: { name: string }) {
  const ai = DOMAIN_ORDER.indexOf(a.name)
  const bi = DOMAIN_ORDER.indexOf(b.name)
  if (ai === -1 && bi === -1) return a.name.localeCompare(b.name)
  if (ai === -1) return 1
  if (bi === -1) return -1
  return ai - bi
}
