/**
 * lib/import-jobs.js
 *
 * In-memory job store for bulk prompt import operations.
 * Uses globalThis to avoid Turbopack Windows top-level state assertion issues
 * while still persisting state for the Node process lifetime.
 * [Deployment Trigger Commit]
 */

import { randomUUID } from 'crypto';

/**
 * @typedef {Object} ImportFailure
 * @property {string} external_id
 * @property {string} image_filename
 * @property {string} error
 */

/**
 * @typedef {Object} ImportResult
 * @property {string} promptId
 * @property {string} slug
 * @property {string} url
 */

/**
 * @typedef {Object} ImportJob
 * @property {string} id
 * @property {'pending'|'running'|'complete'|'failed'} status
 * @property {number} total
 * @property {number} done
 * @property {ImportFailure[]} failures
 * @property {Object.<string, ImportResult>} results  external_id → result
 * @property {number} createdAt  unix ms
 * @property {string|null} error  top-level fatal error message
 */

// Use globalThis to survive HMR reloads and avoid Turbopack top-level mutable state
function getJobsMap() {
  if (!globalThis.__importJobsMap) {
    globalThis.__importJobsMap = new Map();
  }
  return globalThis.__importJobsMap;
}

// Auto-cleanup jobs older than 2 hours to prevent memory leaks
const JOB_TTL_MS = 2 * 60 * 60 * 1000;

function pruneOldJobs() {
  const jobs = getJobsMap();
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs.entries()) {
    if (job.createdAt < cutoff) {
      jobs.delete(id);
    }
  }
}

/**
 * Create a new import job.
 * @param {number} total  Number of items to process
 * @returns {string}  Job ID
 */
export function createJob(total) {
  pruneOldJobs();
  const jobs = getJobsMap();
  const id = randomUUID();
  /** @type {ImportJob} */
  const job = {
    id,
    status: 'pending',
    total,
    done: 0,
    failures: [],
    results: {},
    createdAt: Date.now(),
    error: null,
  };
  jobs.set(id, job);
  return id;
}

/**
 * Retrieve a job by ID.
 * @param {string} id
 * @returns {ImportJob|null}
 */
export function getJob(id) {
  return getJobsMap().get(id) ?? null;
}

/**
 * Update fields on an existing job.
 * @param {string} id
 * @param {Partial<ImportJob>} patch
 */
export function updateJob(id, patch) {
  const job = getJobsMap().get(id);
  if (!job) return;
  Object.assign(job, patch);
}

/**
 * Mark a single item as done and record its result.
 * @param {string} jobId
 * @param {string} externalId
 * @param {ImportResult} result
 */
export function recordSuccess(jobId, externalId, result) {
  const job = getJobsMap().get(jobId);
  if (!job) return;
  job.results[externalId] = result;
  job.done += 1;
}

/**
 * Mark a single item as failed.
 * @param {string} jobId
 * @param {string} externalId
 * @param {string} imageFilename
 * @param {string} error
 */
export function recordFailure(jobId, externalId, imageFilename, error) {
  const job = getJobsMap().get(jobId);
  if (!job) return;
  job.failures.push({ external_id: externalId, image_filename: imageFilename, error });
  job.done += 1;
}
