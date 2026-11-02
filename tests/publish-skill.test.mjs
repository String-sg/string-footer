import test from 'node:test';
import assert from 'node:assert/strict';
import { digest, packageSkill, publishSkill } from '../scripts/publish-skill.mjs';
const files = [{ path: 'SKILL.md', bytes: Buffer.from('skill') }, { path: 'release.json', bytes: Buffer.from('{}') }];
const version = '1.0.2';
const metadata = () => ({ version, status: 'published', files: files.map(f => ({ path: f.path, sha256: digest(f.bytes), size: f.bytes.length })) });
function server({ exists = true, mutate, rawMismatch = false, lookupStatus, postStatus = 201 } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, ...options });
    if (options.method === 'POST') { exists = true; return new Response('{}', { status: postStatus }); }
    if (url.endsWith(`/versions/${version}`)) {
      if (lookupStatus) return new Response('', { status: lookupStatus });
      if (!exists) return new Response('', { status: 404 });
      const meta = metadata(); mutate?.(meta);
      return Response.json(meta);
    }
    const f = files.find(f => url.endsWith(`/${f.path}`));
    return new Response(rawMismatch ? 'changed' : f.bytes);
  };
  return { calls, fetchImpl };
}
test('new publication verifies manifest and downloaded bytes; credentials only go to POST', async () => {
  const s = server({ exists: false });
  assert.match(await publishSkill({ version, files, token: 'test-key', ...s }), /^Published/);
  const post = s.calls.find(c => c.method === 'POST');
  assert.equal(post.headers.Authorization, 'Bearer test-key');
  assert.equal(JSON.parse(post.body).files[0].encoding, 'base64');
  assert.ok(s.calls.filter(c => c.method !== 'POST').every(c => !c.headers?.Authorization));
});
test('identical retries need no secret and never republish', async () => {
  const s = server();
  assert.match(await publishSkill({ version, files, ...s }), /^Already/);
  assert.ok(s.calls.every(c => c.method !== 'POST'));
});
for (const [label, options] of [
  ['changed digest', { mutate: m => m.files[0].sha256 = 'bad' }],
  ['extra file', { mutate: m => m.files.push({ path: 'extra' }) }],
  ['yanked release', { mutate: m => m.status = 'yanked' }],
  ['changed raw bytes', { rawMismatch: true }],
  ['registry outage', { lookupStatus: 503 }],
]) test(`rejects ${label} without overwriting`, async () => {
  const s = server(options);
  await assert.rejects(publishSkill({ version, files, token: 'test-key', ...s }));
  assert.ok(s.calls.every(c => c.method !== 'POST'));
});
test('missing key and verify-only cannot create a release', async () => {
  for (const verifyOnly of [false, true]) {
    const s = server({ exists: false });
    await assert.rejects(publishSkill({ version, files, verifyOnly, ...s }));
    assert.ok(s.calls.every(c => c.method !== 'POST'));
  }
});
test('concurrent identical publish is verified after conflict', async () => {
  const s = server({ exists: false, postStatus: 422 });
  assert.match(await publishSkill({ version, files, token: 'test-key', ...s }), /^Published/);
});
test('package contains exact source skill and deterministic release provenance', async () => {
  const a = await packageSkill('a'.repeat(40));
  const b = await packageSkill('a'.repeat(40));
  assert.deepEqual(a, b);
  const provenance = JSON.parse(a.files.find(f => f.path === 'release.json').bytes);
  assert.equal(provenance.footerVersion, a.version);
  assert.equal(provenance.commit, 'a'.repeat(40));
  await assert.rejects(packageSkill('main'));
});
