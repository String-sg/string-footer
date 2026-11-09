#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, join, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { renderFooter } from './render.mjs';
export const products = {
  landing: { name:'string-site', framework:'astro', variant:'full' },
  id: { name:'string-id', framework:'react', variant:'full', credits:[{label:'Built by',name:'String Team'}] },
  skills: { name:'string-skills', framework:'react', variant:'full' },
  bingo: { name:'string-bingo', framework:'html', variant:'compact', pages:['index.html','play.html','new.html'], credits:[{label:'Inspired by',name:'Seng Kwang (Physics educator @ TJC)',url:'https://id.string.sg/u/sengkwang'}] },
  reports: { name:'my-project', framework:'react', variant:'full', componentDir:'components/string-footer' },
  diagrams: { name:'diagrams', framework:'react', variant:'compact', componentDir:'components/string-footer', support:'supported by', supportNewTab:true, credits:[{label:'Created by',name:'Julienne',creation:'diagrams',url:'https://id.string.sg/u/jtan'}] },
};
const { version } = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
const args = process.argv.slice(2);
let config, target, product;
if (args[0] === '--config') {
  config = JSON.parse(await readFile(resolve(args[1]), 'utf8'));
  target = args[2]; product = 'custom';
  if (config.product === 'id') throw new Error('Use the id preset for the String ID conduct link');
} else {
  product = args[0]; config = products[product]; target = args[1];
}
if (!config || !target || !['react','astro','html'].includes(config.framework)) throw new Error('Usage: string-footer <product> <checkout> [--check], or string-footer --config <file.json> <checkout> [--check]');
const check = args.includes('--check');
const root = resolve(target);
function inside(path) {
  if (typeof path !== 'string' || isAbsolute(path)) throw new Error('Output paths must be relative');
  const destination = resolve(root,path), rel = relative(root,destination);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Path escapes checkout: ${path}`);
  return destination;
}
if (config.name) {
  const pkg = JSON.parse(await readFile(join(root,'package.json'),'utf8'));
  if (pkg.name !== config.name) throw new Error(`Expected ${config.name}, got ${pkg.name}`);
}
const source = dirname(fileURLToPath(import.meta.url));
const html = renderFooter({...config,product});
const creatorScript = config.credits?.some(credit => credit.creation) ? await readFile(join(source,'creator-credit.js'),'utf8') : '';
const css = await readFile(join(source,'footer.css'),'utf8');
const logo = await readFile(join(source,'string-logo.svg'),'utf8');
const licence = await readFile(join(source,'bootstrap-icons-LICENSE.txt'),'utf8');
const hash = createHash('sha256').update(html).update(css).update(logo).update(creatorScript).digest('hex');
const publicDir = config.publicDir ?? 'public';
const files = new Map([
  [`${publicDir}/string-footer/string-logo.svg`,logo],
  [`${publicDir}/string-footer/bootstrap-icons-LICENSE.txt`,licence],
  ['string-footer.json',JSON.stringify({version,source:'https://github.com/String-sg/string-footer',sha256:hash,product,variant:config.variant ?? 'full',credits:config.credits ?? []},null,2)+'\n'],
]);
if (creatorScript) files.set(`${publicDir}/string-footer/creator-credit.js`,creatorScript);
const enhancement = creatorScript ? '<script type="module">const path = "/string-footer/creator-credit.js"; import(/* @vite-ignore */ path).then(module => module.mountCreatorCredits());</script>' : '';
if (config.framework === 'html') {
  const stylePath = config.stylePath ?? 'styles/string-footer.css';
  files.set(stylePath,css);
  const pages = config.pages;
  if (!Array.isArray(pages) || !pages.length) throw new Error('HTML config requires pages');
  for (const page of pages) {
    let content = await readFile(inside(page),'utf8');
    const start='<!-- string-footer:start -->',end='<!-- string-footer:end -->',block=`${start}\n${html}${enhancement}${end}`;
    if (content.includes(start)) {
      const from=content.indexOf(start),to=content.indexOf(end,from);
      if(to<0) throw new Error(`Missing footer end marker in ${page}`);
      content=content.slice(0,from)+block+content.slice(to+end.length);
    } else {
      if(!content.includes('</body>')) throw new Error(`Missing body in ${page}`);
      content=content.replace('</body>',`${block}\n</body>`);
    }
    const href=`/${stylePath}`;
    if(!content.includes(`href="${href}"`)) {
      if(!content.includes('</head>')) throw new Error(`Missing head in ${page}`);
      content=content.replace('</head>',`<link rel="stylesheet" href="${href}">\n</head>`);
    }
    files.set(page,content);
  }
} else {
  const dir=config.componentDir ?? 'src/components/string-footer';
  files.set(`${dir}/footer.css`,css);
  if(config.framework==='react') {
    files.set(`${dir}/StringFooter.tsx`,`${creatorScript ? "'use client';\n" : ""}// Generated by String-sg/string-footer.\nimport './footer.css';\n${creatorScript ? "import { useEffect, useRef } from 'react';\n" : ''}export default function StringFooter() {\n${creatorScript ? "  const ref = useRef<HTMLElement>(null);\n  useEffect(() => {\n    let disposed = false;\n    let cleanup: (() => void) | undefined;\n    Promise.resolve('/string-footer/creator-credit.js').then(path => import(/* webpackIgnore: true */ /* @vite-ignore */ path)).then(module => { if (!disposed && ref.current) cleanup = module.mountCreatorCredits(ref.current); }).catch(() => {});\n    return () => { disposed = true; cleanup?.(); };\n  }, []);\n" : ''}  return (\n${(creatorScript ? html.replace('<footer ', '<footer ref={ref} ') : html).replaceAll('class=','className=').split('\n').filter(Boolean).map(line=>'    '+line).join('\n')}\n  );\n}\n`);
  } else {
    files.set(`${dir}/StringFooter.astro`,`---\n// Generated by String-sg/string-footer.\nimport './footer.css';\n---\n${html}${enhancement}`);
  }
}
// Validate all destinations and all check results before writing anything.
for(const [path,content] of files) {
  const destination=inside(path);
  if(check && await readFile(destination,'utf8').catch(()=>null)!==content) throw new Error(`Footer drift: ${path}`);
}
if(!check) for(const [path,content] of files) {
  const destination=inside(path);await mkdir(dirname(destination),{recursive:true});await writeFile(destination,content);
}
console.log(`${product}: ${config.variant ?? 'full'} footer ${check?'matches':'synced'} (${hash.slice(0,12)})`);
