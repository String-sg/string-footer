import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const dir=new URL('../components/string-footer/',import.meta.url);
const lock=JSON.parse(await readFile(new URL('brand-assets.lock.json',dir),'utf8'));
const digest=text=>createHash('sha256').update(text).digest('hex');
if(process.argv.includes('--check')) {
  const local=await readFile(new URL('string-logo.svg',dir),'utf8');
  if(digest(local)!==lock.outputSha256) throw new Error('Bundled logo differs from the pinned brand asset');
  console.log('Bundled logo matches the approved, pinned brand asset.');
} else {
  if(!/^[a-f0-9]{40}$/.test(lock.ref)) throw new Error('Brand assets require an immutable commit SHA');
  const url=`https://raw.githubusercontent.com/${lock.repository}/${lock.ref}/${lock.path.split('/').map(encodeURIComponent).join('/')}`;
  const response=await fetch(url);if(!response.ok) throw new Error(`Brand asset fetch failed: ${response.status}`);
  const original=await response.text();if(digest(original)!==lock.sha256) throw new Error('Upstream logo digest mismatch');
  const output=original.replace('viewBox="0 0 371 135"','viewBox="25 12 322 111"');
  if(digest(output)!==lock.outputSha256) throw new Error('Transformed logo digest mismatch');
  await writeFile(new URL('string-logo.svg',dir),output);
  console.log(`Pulled approved String logo at ${lock.ref}`);
}
