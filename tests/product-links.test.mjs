import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('chatbot cards open stable storefront details instead of missing generated file URLs', async () => {
  const source=await readFile(new URL('../chatbot.js',import.meta.url),'utf8');
  assert.match(source,/return '\/\?product='\+encodeURIComponent\(String\(p.id\)\)/);
});
test('storefront understands product deep links and opens product detail after catalog load',async()=>{
  const source=await readFile(new URL('../store.js',import.meta.url),'utf8');
  assert.match(source,/new URLSearchParams\(location.search\)\.get\('product'\)/);
  assert.match(source,/if\(found\)\{viewProduct\(requested\);\}/);
});
test('root 404 recovers existing product deep links safely',async()=>{
  const source=await readFile(new URL('../404.html',import.meta.url),'utf8');
  assert.match(source,/location\.replace\('\/\?product='\+encodeURIComponent\(id\)\)/);
  assert.match(source,/\^\[A-Za-z0-9_-\]\{1,120\}\$/);
});
