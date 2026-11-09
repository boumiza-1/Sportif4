import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('unique product ads links and no static 404 for unpublished products',()=>{
 const s=read('store.js'),a=read('admin.js'),chat=read('chatbot.js'),build=read('scripts/build-seo.mjs');
 assert.match(s,/publishedProducts\.has\(id\)\?productPath\(id\)/);
 assert.match(chat,/state\.publishedIds\?\.has/);
 assert.match(a,/data-copy-product/);
 assert.match(a,/\/catalogue\.json/);
 assert.match(build,/productPath\(product\.id\)/);
});
test('Admin includes ordered item photo, size, quantity, customer address',()=>{
 const s=read('store.js'),a=read('admin.js');
 assert.match(s,/image:productImage\(current,640\)/);
 assert.match(a,/class="admin-order-item"/);
 assert.match(a,/class="admin-order-mini"/);
 assert.match(a,/Pointure \/ taille/);
 assert.match(a,/Quantité/);
 assert.match(a,/o\.address/);
});
test('Meta events are consent-controlled and use configured pixel',()=>{
 const s=read('meta-pixel.mjs'),store=read('store.js'),admin=read('admin.js');
 assert.match(store,/1614291526710689/);
 assert.match(admin,/settingMetaPixel/);
 assert.match(s,/storedChoice\(\)!=='yes'/);
 for(const ev of ['PageView','ViewContent','AddToCart','InitiateCheckout','Purchase','Search'])assert(s.includes("'"+ev+"'"),ev);
 assert.match(store,/MetaPixel\.orderPlaced/);
 assert.match(store,/MetaPixel\.addToCart/);
 assert.match(store,/MetaPixel\.viewProduct/);
 assert.match(read('scripts/build-seo.mjs'),/'meta-pixel\.mjs'/);
});
