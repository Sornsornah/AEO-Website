import { Types } from 'mongoose'
import { Domain } from '@/models/Domain'
import { Product } from '@/models/Product'

// Minimal shape we read off an Update doc for subscription resolution.
export interface SubscribableUpdate {
  domainId?: unknown
  domainIds?: unknown[]
  productId?: unknown
  productIds?: unknown[]
  subscribers?: unknown[]
  unsubscribers?: unknown[]
}

const toIdStrings = (arr?: unknown[]): string[] =>
  (arr || []).filter(Boolean).map((v) => String(v))

/**
 * The "default" subscribers of a thread: everyone in the update's linked
 * Domain/Product members[] arrays.
 */
export async function collectMemberIds(update: SubscribableUpdate): Promise<string[]> {
  const domainIds: Types.ObjectId[] = []
  if (Array.isArray(update.domainIds) && update.domainIds.length > 0) {
    update.domainIds.forEach((d) => d && domainIds.push(new Types.ObjectId(String(d))))
  } else if (update.domainId) {
    domainIds.push(new Types.ObjectId(String(update.domainId)))
  }

  const productIdSet = new Set<string>()
  if (update.productId) productIdSet.add(String(update.productId))
  for (const pid of update.productIds || []) if (pid) productIdSet.add(String(pid))

  const memberIds = new Set<string>()

  if (domainIds.length > 0) {
    const domains = await Domain.find({ _id: { $in: domainIds } }).select('members').lean()
    for (const domain of domains) {
      for (const m of ((domain as { members?: unknown[] }).members || [])) memberIds.add(String(m))
    }
  }
  if (productIdSet.size > 0) {
    const products = await Product.find({ _id: { $in: Array.from(productIdSet) } }).select('members').lean()
    for (const product of products) {
      for (const m of ((product as { members?: unknown[] }).members || [])) memberIds.add(String(m))
    }
  }

  return Array.from(memberIds)
}

/**
 * Effective subscriber ids = (members ∪ explicit subscribers) − unsubscribers.
 * These are the users who receive general thread emails.
 */
export async function resolveSubscriberIds(update: SubscribableUpdate): Promise<string[]> {
  const members = await collectMemberIds(update)
  const unsub = new Set(toIdStrings(update.unsubscribers))
  const effective = new Set<string>()
  for (const id of members) if (!unsub.has(id)) effective.add(id)
  for (const id of toIdStrings(update.subscribers)) if (!unsub.has(id)) effective.add(id)
  return Array.from(effective)
}
