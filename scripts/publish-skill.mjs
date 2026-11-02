import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');

export async function packageSkill(commit) {
  if (!/^[a-f0-9]{40}$/.test(commit ?? '')) throw new Error('A full release commit SHA is required');
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) throw new Error('A stable package version is required');
  const dir = resolve(root, '.claude/skills/string-footer');
  const files = [];
  async function walk(path = '') {
    for (const entry of (await readdir(resolve(dir, path), { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
      const next = path ? `${path}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(next);
      else if (entry.isFile()) files.push({ path: next, bytes: await readFile(resolve(dir, next)) });
      else throw new Error(`Unsupported skill entry: ${next}`);
    }
  }
  await walk();
  if (!files.some(f => f.path === 'SKILL.md') || files.some(f => f.path === 'release.json')) throw new Error('Missing SKILL.md or reserved release.json present');
  files.push({ path: 'release.json', bytes: Buffer.from(JSON.stringify({
    repository: 'https://github.com/String-sg/string-footer', commit,
    footerVersion: pkg.version, skillVersion: pkg.version,
  }, null, 2) + '\n') });
  return { version: pkg.version, files };
}

export async function publishSkill({ version, files, token, fetchImpl = fetch, verifyOnly = false }) {
  const base = 'https://skills.string.sg';
  const versionUrl = `${base}/v1/skills/string/string-footer/versions/${version}`;
  const request = (url, options = {}) => fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(30000) });
  async function verify(response) {
    if (!response.ok) throw new Error(`Version lookup failed (${response.status})`);
    const meta = await response.json();
    if (meta.version !== version || meta.status !== 'published' || !Array.isArray(meta.files) || meta.files.length !== files.length) throw new Error('Published version/file set does not match release');
    for (const file of files) {
      const entry = meta.files.find(f => f.path === file.path);
      if (!entry || entry.sha256 !== digest(file.bytes) || entry.size !== file.bytes.length) throw new Error(`Published manifest mismatch: ${file.path}`);
      const suffix = file.path === 'SKILL.md' ? 'SKILL.md' : `files/${file.path.split('/').map(encodeURIComponent).join('/')}`;
      const raw = await request(`${versionUrl}/${suffix}`);
      if (!raw.ok || digest(Buffer.from(await raw.arrayBuffer())) !== digest(file.bytes)) throw new Error(`Published bytes mismatch: ${file.path}`);
    }
  }
  const existing = await request(versionUrl);
  if (existing.status !== 404) { await verify(existing); return 'Already published; exact files verified'; }
  if (verifyOnly) throw new Error('Release has not been published');
  if (!token) throw new Error('Configure STRING_SKILLS_PUBLISH_KEY in GitHub Actions secrets (string handle, publish scope)');
  const result = await request(`${base}/v1/publish`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle: 'string', name: 'string-footer', version,
      files: files.map(f => ({ path: f.path, content: f.bytes.toString('base64'), encoding: 'base64' })) }),
  });
  // Another run may have published this immutable version concurrently. Never overwrite it.
  if (!result.ok && ![409, 422].includes(result.status)) throw new Error(`Publication failed (${result.status}); response omitted to protect credentials`);
  await verify(await request(versionUrl));
  return 'Published; exact files verified';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const bundle = await packageSkill(process.env.RELEASE_COMMIT);
    if (process.env.RELEASE_TAG && process.env.RELEASE_TAG !== `v${bundle.version}`) throw new Error('Release tag must match package.json version');
    if (process.argv.includes('--dry-run')) console.log(JSON.stringify({ version: bundle.version, files: bundle.files.map(f => ({ path: f.path, sha256: digest(f.bytes), size: f.bytes.length })) }, null, 2));
    else console.log(await publishSkill({ ...bundle, token: process.env.STRING_SKILLS_PUBLISH_KEY, verifyOnly: process.argv.includes('--verify-only') }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
