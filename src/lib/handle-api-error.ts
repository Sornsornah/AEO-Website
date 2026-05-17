import { z } from 'zod'
import { logger } from '@/lib/logger'

export class AppError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

export function handleApiError(error: unknown): Response {
  if (error instanceof z.ZodError) {
    return Response.json({ errors: error.flatten().fieldErrors }, { status: 400 })
  }
  if (error instanceof AppError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  logger.error(error)
  return Response.json({ error: 'Internal server error' }, { status: 500 })
}
