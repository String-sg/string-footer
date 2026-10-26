import { mkdir,writeFile,copyFile } from 'node:fs/promises';
import { renderFooter } from '../components/string-footer/render.mjs';
await mkdir('dist',{recursive:true});
for(const variant of ['full','compact']) {
  const credits=variant==='compact'?[{label:'Created by',name:'Example contributor'}]:[];
  await writeFile(`dist/${variant}.html`,renderFooter({variant,credits}));
}
await copyFile('components/string-footer/footer.css','dist/footer.css');
console.log('Built full and compact HTML previews without network access.');
