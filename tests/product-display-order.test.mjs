import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {displayOrder,sortProducts} from '../display-order.mjs';

const source=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('positive position 1 appears before 2, 3, 4, 5; products without position follow',()=>{
  const data=[
    {id:'b',name:'unranked B'},
    {id:'p5',displayOrder:5},
    {id:'p2',displayOrder:2},
    {id:'p1',displayOrder:1},
    {id:'a'},
    {id:'p4',displayOrder:4},
    {id:'p3',displayOrder:3}
  ];
  assert.deepEqual(sortProducts(data).map(p=>p.id),['p1','p2','p3','p4','p5','a','b']);
  assert.equal(data[0].id,'b','sorting must never mutate the Firebase snapshot');
});
test('invalid positions never become display priorities',()=>{
  for(const value of [null,undefined,'',0,-1,2.5,Infinity,'abc',100000])assert.equal(displayOrder(value),null);
  for(const value of [1,'2',99999])assert.equal(displayOrder(value),Number(value));
});
test('position ties are stable and deterministic',()=>{
  const list=[{id:'beta',displayOrder:2},{id:'alpha',displayOrder:2},{id:'delta'},{id:'charlie'}];
  assert.deepEqual(sortProducts(list).map(p=>p.id),['alpha','beta','charlie','delta']);
});
test('Admin can edit product order and show ordering column',()=>{
  const admin=source('admin.js'),html=source('admin.html');
  assert.match(html,/id="pDisplayOrder"/);
  assert.match(admin,/displayOrder:\$\('#pDisplayOrder'\)/);
  assert.match(admin,/displayOrder\(p\.displayOrder\)/);
  assert.match(admin,/products=sortProducts/);
  assert.match(admin,/L’ordre doit être/);
});
test('live store carousel and SEO static generation honor the same product order',()=>{
  const store=source('store.js'),build=source('scripts/build-seo.mjs');
  assert.match(store,/sortProducts\(products\.filter/);
  assert.match(store,/products=sortProducts\(result\.value\.docs/);
  assert.match(build,/products:orderedProducts/);
  assert.match(build,/const orderedProducts=sortProducts\(products\)/);
  assert.match(build,/'displayOrder'/);
  assert.match(build,/'display-order\.mjs'/);
});
