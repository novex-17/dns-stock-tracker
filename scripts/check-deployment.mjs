import assert from 'node:assert/strict';

const base = process.argv[2];
if (!base) throw Error('Usage: node scripts/check-deployment.mjs https://your-deployment.vercel.app');
for (const path of ['/', '/app.js', '/styles.css', '/aging.js', '/api/audit']) {
  const response = await fetch(new URL(path, base), {signal:AbortSignal.timeout(240000)});
  assert.equal(response.status, 200, `${path} must respond successfully`);
  if (path === '/') assert.match(await response.text(), /Inventory overview/);
  if (path === '/api/audit') {
    const data = await response.json();
    assert.ok(Array.isArray(data.reviewProducts), 'Complete inventory must be available for month filters');
    assert.ok(data.summary && data.auditDate, 'Audit metadata must be available');
  }
  console.log(`PASS ${path}`);
}
