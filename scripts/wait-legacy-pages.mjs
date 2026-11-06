import { pathToFileURL } from 'node:url';

// deploy-pages supports branch-based Pages sites. Let their automatic build
// finish first so its raw checkout cannot overwrite the generated SEO artifact.
export function inspectLegacyRuns(payload, { sha, currentRunId }) {
  if (!payload || !Array.isArray(payload.workflow_runs)) {
    throw new Error('GitHub returned an invalid Actions workflow-run list.');
  }
  const runs = payload.workflow_runs.filter(run => {
    const path = String(run.path || run.workflow?.path || '');
    const builtIn = path.includes('pages-build-deployment') ||
      (run.event === 'dynamic' && run.name === 'pages build and deployment');
    return builtIn && run.head_sha === sha && String(run.id) !== String(currentRunId);
  }).map(run => ({ id: run.id, status: run.status, conclusion: run.conclusion }));
  return { runs, active: runs.filter(run => run.status !== 'completed') };
}

export async function waitForLegacyPages({
  token, repository, sha, currentRunId, eventName = 'push',
  apiUrl = 'https://api.github.com', fetchImpl = globalThis.fetch,
  delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
  now = Date.now, log = console.log,
  timeoutMs = 240000, pollMs = 5000, startupGraceMs = 10000, requestTimeoutMs = 15000
}) {
  if (eventName !== 'push') {
    log(`No branch-push Pages build to wait for (${eventName}).`);
    return { skipped: true, runs: [] };
  }
  if (!token || !/^[\w.-]+\/[\w.-]+$/.test(repository || '') ||
      !/^[a-f0-9]{40}$/i.test(sha || '') || !/^\d+$/.test(String(currentRunId || ''))) {
    throw new Error('The legacy Pages guard requires GH_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA and GITHUB_RUN_ID.');
  }
  if (!(timeoutMs > 0 && pollMs > 0 && startupGraceMs >= 0 && requestTimeoutMs > 0)) {
    throw new Error('The legacy Pages guard received invalid timeout settings.');
  }
  const started = now();
  let previous = '';
  while (true) {
    if (now() - started >= timeoutMs) {
      throw new Error('The automatic branch-based Pages build did not finish before the guard timeout. No SEO deployment was started.');
    }
    const workflowRuns = [];
    for (let page = 1; page <= 10; page++) {
      const url = new URL(`${apiUrl.replace(/\/$/, '')}/repos/${repository}/actions/runs`);
      url.searchParams.set('head_sha', sha);
      url.searchParams.set('per_page', '100');
      url.searchParams.set('page', String(page));
      const remaining = timeoutMs - (now() - started);
      if (remaining <= 0) throw new Error('Timed out while inspecting the automatic Pages build.');
      let response;
      try {
        response = await fetchImpl(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
          },
          signal: AbortSignal.timeout(Math.max(1, Math.min(requestTimeoutMs, remaining)))
        });
      } catch {
        throw new Error('The GitHub Actions run-list request failed or timed out. No SEO deployment was started.');
      }
      if (!response.ok) {
        throw new Error(`Cannot inspect automatic Pages builds (HTTP ${response.status}). The deployment job needs actions: read permission. No SEO deployment was started.`);
      }
      const payload = await response.json();
      if (!Array.isArray(payload.workflow_runs)) throw new Error('GitHub returned an invalid Actions workflow-run list.');
      workflowRuns.push(...payload.workflow_runs);
      if (payload.workflow_runs.length < 100) break;
      if (page === 10) throw new Error('Too many matching Actions runs to verify legacy Pages ordering safely.');
    }
    const result = inspectLegacyRuns({ workflow_runs: workflowRuns }, { sha, currentRunId });
    const signature = result.active.map(run => `${run.id}:${run.status || 'unknown'}`).join(',');
    if (!result.active.length && (result.runs.length || now() - started >= startupGraceMs)) {
      log(result.runs.length ? 'The automatic branch-based Pages builds have finished; deploying the generated SEO site next.' : 'No automatic Pages build found for this commit; continuing with the generated SEO deployment.');
      return result;
    }
    if (signature !== previous || !previous) {
      log(signature ? `Waiting for automatic Pages build(s): ${signature}.` : 'Checking for a newly queued automatic Pages build.');
      previous = signature || 'discovering';
    }
    await delay(Math.min(pollMs, Math.max(1, timeoutMs - (now() - started))));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  waitForLegacyPages({
    token: process.env.GH_TOKEN,
    repository: process.env.GITHUB_REPOSITORY,
    sha: process.env.GITHUB_SHA,
    currentRunId: process.env.GITHUB_RUN_ID,
    eventName: process.env.GITHUB_EVENT_NAME || 'push',
    apiUrl: process.env.GITHUB_API_URL || 'https://api.github.com'
  }).catch(error => {
    console.error(`::error::${error.message}`);
    process.exitCode = 1;
  });
}
