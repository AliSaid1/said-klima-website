/**
 * Consistent API response helpers.
 *
 * Three helpers:
 *  - apiError()       — general-purpose error with explicit message + status
 *  - apiDbError()     — translates a raw Supabase/Postgres error automatically
 *  - apiServerError() — alias for apiDbError (legacy name kept for compatibility)
 */

import { NextResponse } from 'next/server';
import { translateDbError, isUserFacingDbError } from './db-errors';

/** Return a safe error response with an explicit message and HTTP status. */
export function apiError(
  message: string,
  status: number,
  internalDetail?: unknown,
): NextResponse {
  if (internalDetail && process.env.NODE_ENV !== 'production') {
    return NextResponse.json({ error: message, detail: String(internalDetail) }, { status });
  }
  if (internalDetail) {
    console.error(`[API ${status}] ${message}:`, internalDetail);
  }
  return NextResponse.json({ error: message }, { status });
}

/**
 * Translate a raw Supabase / Postgres error into a user-friendly response.
 *
 * - Known user errors (duplicate key, FK violation, null violation, etc.) →
 *   translated German message, appropriate 4xx status.
 * - Unknown / server errors →
 *   generic message in production, raw detail in development.
 */
export function apiDbError(err: unknown, fallbackStatus = 500): NextResponse {
  const error = err as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  };

  // Always log raw error server-side
  console.error('[DB Error]', { code: error?.code, message: error?.message, details: error?.details });

  const code = error?.code ?? '';

  // User-facing errors: translate and return with correct status
  if (isUserFacingDbError(code)) {
    const translated = translateDbError(error);
    const status =
      code === '23505'    ? 409 :   // Conflict — duplicate
      code === '23503'    ? 409 :   // Conflict — FK in use
      code === 'PGRST116' ? 404 :   // Not Found
      code === '42501'    ? 403 :   // Forbidden
      400;                          // Bad Request for others
    return NextResponse.json({ error: translated }, { status });
  }

  // Server / infra errors: mask in production
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
      : (error?.message || 'Unbekannter Datenbankfehler');

  return NextResponse.json({ error: message }, { status: fallbackStatus });
}

/** Legacy alias — keep existing call sites working without changes. */
export function apiServerError(raw: unknown): NextResponse {
  return apiDbError(raw, 500);
}

