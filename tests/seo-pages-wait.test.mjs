import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectLegacyRuns, waitForLegacyPages } from '../scripts/wait-legacy-pages.mjs';

const sha = 'a'.repeat(40);
const builtIn = (status = 'in_progress', extra = {}) => ({ id: 123, head_sha: sha, event: 'dynamic', name: 'pages build and deployment', path: 'dynamic/pages/pages-build-deployment', status, ...extra });
const options = { token: 'test-placeholder', repository: 'owner/repo', sha, currentRunId: '456', log: () => {} };
function harness(sequence) {
  let clock = 0, requests = [];
  return {
    requests,
    config: {
      ...options,
      now: () => clock,
      delay: async milliseconds => { clock += milliseconds; },
      fetchImpl: async (url, settings) => {
        requests.push({ url, settings });
        const next = sequence[Math.min(requests.length - 1, sequence.length - 1)];
        return { ok: true, status: 200, json: async () => ({ workflow_runs: next }) };
      }
    }
  };
}

test('identifies only legacy runs for this commit, excluding its own run', () => {
  const result = inspectLegacyRuns({ workflow_runs: [builtIn(), builtIn('in_progress', { id: 456 }), builtIn('in_progress', { id: 789, head_sha: 'b'.repeat(40) }), { id: 9, head_sha: sha, name: 'Publish SEO storefront', event: 'push', status: 'in_progress' }] }, options);
  assert.deepEqual(result.active.map(run => run.id), [123]);
});

test('recognizes the built-in dynamic workflow name if its path is absent', () => {
  assert.equal(inspectLegacyRuns({ workflow_runs: [builtIn('queued', { path: undefined })] }, options).active.length, 1);
});

test('waits through queued and running states until all matching runs finish', async () => {
  const h = harness([[builtIn('queued')], [builtIn()], [builtIn('completed', { conclusion: 'success' })]]);
  const result = await waitForLegacyPages(h.config);
  assert.equal(h.requests.length, 3);
  assert.equal(result.active.length, 0);
  assert.equal(h.requests[0].url.searchParams.get('head_sha'), sha);
  assert.equal(h.requests[0].settings.headers.Authorization, 'Bearer test-placeholder');
});

test('failed or cancelled completed legacy builds no longer block the SEO deploy', async () => {
  const h = harness([[builtIn('completed', { conclusion: 'failure' }), builtIn('completed', { id: 124, conclusion: 'cancelled' })]]);
  assert.equal((await waitForLegacyPages(h.config)).active.length, 0);
  assert.equal(h.requests.length, 1);
});

test('checks the startup grace period before concluding no legacy build exists', async () => {
  const h = harness([[]]);
  await waitForLegacyPages(h.config);
  assert.equal(h.requests.length, 3);
  const later = harness([[], [builtIn()], [builtIn('completed')]]);
  await waitForLegacyPages(later.config);
  assert.equal(later.requests.length, 3);
});

test('scheduled and manual refreshes skip the push guard without making requests', async () => {
  for (const eventName of ['schedule', 'workflow_dispatch']) {
    const h = harness([]);
    assert.equal((await waitForLegacyPages({ ...h.config, eventName, token: undefined })).skipped, true);
    assert.equal(h.requests.length, 0);
  }
});

test('fails closed on denied API access and malformed API responses', async () => {
  await assert.rejects(waitForLegacyPages({ ...options, fetchImpl: async () => ({ ok: false, status: 403 }) }), /HTTP 403.*actions: read/);
  await assert.rejects(waitForLegacyPages({ ...options, fetchImpl: async () => ({ ok: true, json: async () => ({ wrong: [] }) }) }), /invalid Actions/);
});

test('fails closed on network failures and bounded overall timeout', async () => {
  await assert.rejects(waitForLegacyPages({ ...options, fetchImpl: async () => { throw Error('private network detail'); } }), /request failed or timed out/);
  const h = harness([[builtIn()]]);
  await assert.rejects(waitForLegacyPages({ ...h.config, timeoutMs: 10000 }), /guard timeout/);
  assert.equal(h.requests.length, 2);
});
