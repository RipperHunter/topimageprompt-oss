/**
 * GET /api/admin/prompts/import-jobs/[id]
 *
 * Returns the current state of a bulk import job.
 * Poll this endpoint every 1 second from the admin UI.
 *
 * Response shape:
 * {
 *   jobId: string,
 *   status: 'pending' | 'running' | 'complete' | 'failed',
 *   total: number,
 *   done: number,
 *   progressPercent: number,
 *   failures: Array<{ external_id, image_filename, error }>,
 *   results: { [externalId]: { promptId, slug, url } },
 *   error: string | null   (top-level fatal error, if any)
 * }
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/api-security';
import { getJob } from '../../../../../../lib/import-jobs';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { error: authError } = await requireAdmin(request);
  if (authError) return authError;

  const { id } = await params;
  const job = getJob(id);

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const progressPercent = job.total > 0
    ? Math.round((job.done / job.total) * 100)
    : 0;

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    total: job.total,
    done: job.done,
    progressPercent,
    failures: job.failures,
    results: job.results,
    error: job.error,
  }, {
    headers: { 'Cache-Control': 'no-store, no-cache' },
  });
}
