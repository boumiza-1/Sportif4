import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('renderProducts defines published per product and does not crash before carousel init',()=>{
 const s=src('store.js');const a=s.indexOf('function renderProducts()'),b=s.indexOf('const validPrice',a);
 const block=s.slice(a,b);
 assert.match(block,/const published=publishedProducts\.has\(p\.id\)/);
 assert.match(block,/const picTag=published\?/);
 assert.match(s,/renderShowcase\(\);renderCoverProducts\(\)/);
});
test('each product card has cart and direct checkout actions in dynamic AND static pages',()=>{
 const s=src('store.js'),b=src('scripts/build-seo.mjs');
 for(const [name,txt] of [['live',s],['static',b]]){
  assert.match(txt,/data-add-cart=/,name+' add button');
  assert.match(txt,/data-buy=/,name+' direct order button');
  assert.match(txt,/product-card-actions/,name+' actions wrapper');
 }
 assert.match(s,/directCheckout\(b\.dataset\.buy\)/);
 assert.match(s,/viewProduct\(b\.dataset\.addCart\)/);
 assert.match(s,/function openOrderForm\(/);
 assert.match(s,/tunisianMobile\(fd\.get\('phone'\)\)/);
});
test('selection carousel rotates and changes image, name, price, description, link',()=>{
 const s=src('store.js');
 for(const key of ['stageImage.src=next','stageName.textContent=p.name','stageDescription.textContent=p.description','stagePrice.textContent=money(p.price)','stageView.onclick=()=>viewProduct(p.id)','stageIndex.textContent'])assert(s.includes(key),key);
 assert.match(s,/window\.setInterval\(\(\)=>\{/);
});
test('cookie banner never exposes internal marketing technology label to shoppers',()=>{
 const s=src('meta-pixel.mjs'),html=src('index.html');
 assert.match(s,/Préférences de cookies/);
 assert.doesNotMatch(s,/message\.textContent=.*Meta Pixel/);
 assert.match(html,/Préférences cookies/);
 assert.match(s,/Accepter/);
 assert.match(s,/Refuser/);
});
