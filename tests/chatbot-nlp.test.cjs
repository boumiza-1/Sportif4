const test=require('node:test');
const assert=require('node:assert/strict');
const NLP=require('../chatbot-nlp.js');

const catalog=[
 {id:'a',name:'demu crapon adidas',category:'Homme',price:99,stock:4,sizes:['41','42'],description:'Demi crampons pour terrain synthétique',active:true},
 {id:'b',name:'Crampon Nike Football',category:'Homme',price:159,stock:2,sizes:['43'],active:true},
 {id:'c',name:'Basket Running City',category:'Homme',price:119,stock:5,active:true},
 {id:'d',name:'demi crampon Puma',category:'Homme',price:149,stock:0,active:true},
 {id:'e',name:'Sac de sport',category:'Accessoires',price:39,stock:7,active:true},
 {id:'f',name:'Crampon hidden',category:'Homme',price:10,stock:3,active:false}
];

test('Tunisian Latin slang and greeting remain Tunisian',()=>{
 for(const sample of ['slm khouya cv','slem khouya labes','3aslema','nheb demu crapon','9adech soumha'])
  assert.equal(NLP.language(sample,'fr'),'tn',sample);
 assert.equal(NLP.language('Bonjour, avez-vous des crampons ?', 'tn'),'fr');
 assert.equal(NLP.language('السلام عليكم، ما هي الأسعار؟','fr'),'ar');
 assert.equal(NLP.language('شنوة عندكم من سبادري؟','fr'),'tn');
});
test('slm khouya cv is greeting, not a failed product lookup',()=>{
 assert.equal(NLP.intent('slm khouya cv'),'greeting');
});
test('demu crapon, demi crampon, and dmi crapon are same football boot intent',()=>{
 for(const v of ['demu crapon','demu crampon','demi crampon','dmi crapon','demo crapon','ديمي كرامبون']){
  assert.equal(NLP.typeOf(v),'demi',v);
  const products=NLP.search(v,catalog);
  assert.equal(products.length,2,v);
  assert(products.every(p=>/demu|demi/i.test(p.name)),v);
 }
});
test('demi-crampon must not silently return ordinary running or full studs',()=>{
 const products=NLP.search('nheb demu crapon',catalog);
 assert(!products.some(p=>p.id==='b'||p.id==='c'));
});
test('brand, price, size, and active product filters',()=>{
 const filtered=NLP.search('nheb demu crapon adidas moins de 120 dt taille 42',catalog);
 assert.equal(filtered.length,1);
 assert.equal(filtered[0].id,'a');
 const empty=NLP.search('nheb demu crapon b 50dt',catalog);
 assert.equal(empty.length,0);
});
test('order tracking classified before how to order, with no guess of sensitive status',()=>{
 for(const query of ['win waslet el commande','ma commande','mes commandes','وين وصلت طلبيتي','suivi commande'])
  assert.equal(NLP.intent(query),'orderStatus',query);
 assert.equal(NLP.intent('kifech ncommandi'),'howOrder');
});
test('accent normalization and safe unknown query behavior',()=>{
 assert.equal(NLP.norm('DÉMI-CRAMPON'),'demi crampon');
 assert.deepEqual(NLP.search('demu crapon',null),[]);
 assert(!NLP.search('demu crapon',catalog).some(p=>p.active===false));
});
