import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SIZE_PRESETS,inferProductType,cleanSizes,selectedSizes,productOptionState,validateSelectedSize,tunisianMobile} from '../product-options.mjs';

test('apparel has S–XXL but shoes have 39–45',()=>{
 assert.deepEqual(SIZE_PRESETS.clothing,['S','M','L','XL','XXL']);
 assert.deepEqual(SIZE_PRESETS.shoe,['39','40','41','42','43','44','45']);
 assert.equal(inferProductType({name:'Maryoul Football / Maillot'}),'clothing');
 for(const item of ['demu crapon adidas','Crampon Nike','Basket running','Chaussure Puma'])
  assert.equal(inferProductType({name:item}),'shoe');
 assert.deepEqual(cleanSizes(['42','M','39','42'],'shoe'),['39','42']);
 assert.deepEqual(cleanSizes(['xl','s','40','xxl'],'clothing'),['S','XL','XXL']);
});
test('size required even when product has exactly one size',()=>{
 const shoe={name:'demi crampon',productType:'shoe',sizes:['42']};
 assert.deepEqual(validateSelectedSize(shoe,'42'),{ok:true,size:'42'});
 assert.equal(validateSelectedSize(shoe,'').ok,false);
 assert.equal(validateSelectedSize(shoe,'41').ok,false);
 assert.equal(validateSelectedSize(shoe,'XL').ok,false);
 const shirt={name:'Maillot',productType:'clothing',sizes:['S','M','L']};
 assert.equal(validateSelectedSize(shirt,'m').ok,true);
 assert.equal(validateSelectedSize(shirt,'42').ok,false);
});
test('no order for legacy product missing variant configuration',()=>{
 assert.equal(productOptionState({name:'Unknown Product',sizes:[]}).configured,false);
 assert.equal(validateSelectedSize({name:'crampon',sizes:[]},'40').ok,false);
 assert.equal(productOptionState({name:'Sac de sport',productType:'accessory',sizes:[]}).configured,true);
 assert.equal(validateSelectedSize({productType:'accessory'},'').ok,true);
});
test('valid Tunisian eight-digit mobile and invalid seven digits',()=>{
 for(const [v,expected] of [['98453827','98453827'],['9845382',null],['+216 98 453 827','98453827'],['0021698453827','98453827'],['25123456','25123456'],['50123456','50123456'],['41123456','41123456'],['01234567',null],['abc98453827',null],['984538271',null]]) assert.equal(tunisianMobile(v),expected,v);
});
test('store, admin and SEO build all use common validation',()=>{
 const root=new URL('../',import.meta.url);
 const read=p=>readFileSync(new URL(p,root),'utf8');
 const store=read('store.js'),admin=read('admin.js'),form=read('admin.html'),build=read('scripts/build-seo.mjs');
 assert.match(store,/validateSelectedSize\(current,entry\.size\)/);
 assert.match(store,/tunisianMobile\(fd\.get\('phone'\)\)/);
 assert.match(store,/data-buy=/);
 assert.match(store,/signInAnonymously\(auth\)/);
 assert.match(admin,/renderSizeChoices/);
 assert.match(admin,/typeRequiresSize\(data\.productType\)/);
 assert.match(form,/id="pProductType"/);
 assert.match(form,/id="pSizeOptions"/);
 assert.match(build,/'product-options\.mjs'/);
});
