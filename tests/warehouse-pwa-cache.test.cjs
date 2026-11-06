'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const assetsSource=sw.match(/const ASSETS = \[([\s\S]*?)\];/);
assert.ok(assetsSource,'Service Worker ASSETS list exists');
const assets=[...assetsSource[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);

test('all service worker cache assets exist in the committed repo',()=>{
  for(const entry of assets){
    const relative=entry.replace(/^\.\//,'').split('?')[0]||'index.html';
    assert.ok(fs.existsSync(path.join(root,relative)),'missing SW cache asset '+entry);
  }
});

test('PWA index and offline cache load the exact same versioned app.js',()=>{
  const html=index.match(/<script\s+src="(app\.js\?v=[^"]+)"/);
  assert.ok(html,'index has versioned app.js script');
  assert.ok(assets.includes('./'+html[1]),'SW list has matching app.js query');
  const cache=sw.match(/const CACHE = '([^']+)'/);
  assert.ok(cache,'SW cache name exists');
  assert.match(cache[1],/1\.6\.0-safety-rc1/);
  assert.match(html[1],/1\.6\.0-safety-rc1/);
});

test('service worker does not substitute HTML for missing JavaScript offline',()=>{
  assert.ok(sw.includes("isNavigation ? caches.match('./index.html') : Response.error()"),
    'Only navigation may fall back to index HTML');
});

test('all local versioned scripts in index are present in cache under the same URL',()=>{
  const scripts=[...index.matchAll(/<script\s+src="([^"]+)"\s*>/g)]
    .map(x=>x[1]).filter(x=>!/^https?:/i.test(x));
  for(const file of scripts){
    assert.ok(fs.existsSync(path.join(root,file.split('?')[0])),'missing script '+file);
    assert.ok(assets.includes('./'+file),'SW has stale or missing script '+file);
  }
});


test('candidate build marker and service worker registration use the same release version',()=>{
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  assert.match(app,/WW_FRONTEND_BUILD='2026-11-06\.1\.6\.0-safety-rc1'/);
  assert.match(app,/serviceWorker\.register\('\.\/sw\.js\?v=1\.6\.0-safety-rc1'/);
  assert.ok(sw.includes("wills-warehouse-shell-v1.6.0-safety-rc1"));
});
