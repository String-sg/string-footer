import test from 'node:test';
import assert from 'node:assert/strict';
import { renderFooter } from '../components/string-footer/render.mjs';
test('full navigation and product-specific conduct policy',()=>{
  const full=renderFooter();assert.ok(full.indexOf('>Products<')<full.indexOf('>Metrics<'));assert.ok(full.indexOf('>Metrics<')<full.indexOf('>Skills '));
  assert.doesNotMatch(full,/Code of Conduct|String Bingo|>Singapore<|Source on GitHub/);
  assert.match(renderFooter({product:'id'}),/href="\/conduct">Code of Conduct/);
  assert.match(full,/href="https:\/\/github.com\/String-sg\/" aria-label="GitHub"/);
});
test('compact preserves contributor roles before String credit',()=>{
  const html=renderFooter({variant:'compact',credits:[{label:'Created by',name:'Julienne'}],support:'supported by'});
  assert.match(html,/Created by <strong>Julienne<\/strong>, supported by <a href="https:\/\/string.sg">string.sg<\/a>/);
  assert.doesNotMatch(html,/Explore String|Code of Conduct/);
  assert.throws(()=>renderFooter({variant:'compact'}),/contributor credits/);
});
test('credits escape text and reject active URLs',()=>{
  const html=renderFooter({variant:'compact',credits:[{label:'Original by',name:'<script>alert(1)</script> & Ada {globalThis.process.exit()}'}]});
  assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/&#123;globalThis.process.exit\(\)&#125;/);
  for(const url of ['javascript:alert(1)','data:text/html,hi','http://insecure.test','https://user:pass@example.com']) assert.throws(()=>renderFooter({variant:'compact',credits:[{name:'Ada',url}]}));
});
test('a full footer can retain additional visible credits',()=>{
  assert.match(renderFooter({credits:[{label:'Problem identified by',name:'An educator'}]}),/Problem identified by <strong>An educator<\/strong>/);
});
import { mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync,spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cli=fileURLToPath(new URL('../components/string-footer/sync.mjs',import.meta.url));
test('external adopters generate, check drift, and cannot escape their checkout',()=>{
  const root=mkdtempSync(join(tmpdir(),'string-footer-'));
  try {
    const config=join(root,'footer.config.json');
    writeFileSync(config,JSON.stringify({framework:'react',variant:'compact',credits:[{name:'Ada',url:'https://github.com/example'}]}));
    execFileSync(process.execPath,[cli,'--config',config,root]);
    execFileSync(process.execPath,[cli,'--config',config,root,'--check']);
    const component=join(root,'src/components/string-footer/StringFooter.tsx');
    assert.match(readFileSync(component,'utf8'),/Created by <a href="https:\/\/github.com\/example"><strong>Ada<\/strong><\/a>/);
    writeFileSync(component,'drift');
    assert.notEqual(spawnSync(process.execPath,[cli,'--config',config,root,'--check']).status,0);
    writeFileSync(config,JSON.stringify({framework:'react',variant:'full',componentDir:'../escaped'}));
    assert.notEqual(spawnSync(process.execPath,[cli,'--config',config,root]).status,0);
  } finally {rmSync(root,{recursive:true,force:true});}
});
test('static adopters update only marked footer blocks and preserve app controls',()=>{
  const root=mkdtempSync(join(tmpdir(),'string-footer-html-'));
  try {
    const config=join(root,'footer.config.json');
    writeFileSync(config,JSON.stringify({framework:'html',variant:'compact',pages:['index.html'],credits:[{label:'Inspired by',name:'An educator'}]}));
    writeFileSync(join(root,'index.html'),'<html><head></head><body><button id="reset">Reset</button></body></html>');
    execFileSync(process.execPath,[cli,'--config',config,root]);
    execFileSync(process.execPath,[cli,'--config',config,root,'--check']);
    const html=readFileSync(join(root,'index.html'),'utf8');assert.match(html,/<button id="reset">Reset<\/button>/);
    assert.equal((html.match(/<footer /g)||[]).length,1);
    writeFileSync(join(root,'index.html'),html.replace('<!-- string-footer:end -->',''));
    assert.notEqual(spawnSync(process.execPath,[cli,'--config',config,root]).status,0);
  } finally {rmSync(root,{recursive:true,force:true});}
});
test('String ID preset stays compact and retains its local conduct link',()=>{
  const root=mkdtempSync(join(tmpdir(),'string-footer-id-'));
  try {
    writeFileSync(join(root,'package.json'),JSON.stringify({name:'string-id'}));
    execFileSync(process.execPath,[cli,'id',root]);
    const manifest=JSON.parse(readFileSync(join(root,'string-footer.json'),'utf8'));
    assert.equal(manifest.variant,'compact');
    const component=readFileSync(join(root,'src/components/string-footer/StringFooter.tsx'),'utf8');
    assert.match(component,/Built by <strong>String Team<\/strong>/);
    assert.match(component,/href="\/conduct">Code of Conduct/);
    assert.doesNotMatch(component,/Explore String|Get involved|Seng Kwang|Julienne/);
  } finally {rmSync(root,{recursive:true,force:true});}
});
