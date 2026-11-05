const test=require('node:test');
const assert=require('node:assert/strict');
const NLP=require('../chatbot-nlp.js');
const products=[
  {id:'demi-a',name:'demu crapon adidas',category:'Homme',price:99,stock:4,sizes:['41','42','43'],colors:['Noir','Blanc'],active:true},
  {id:'demi-b',name:'demi crampon Puma',category:'Homme',price:119,stock:0,sizes:['42'],colors:['Bleu'],active:true},
  {id:'running',name:'Basket Running',category:'Homme',price:80,stock:5,sizes:['42'],active:true}
];
test('understands Tunisian and French cart commands',()=>{
  for(const message of ['hottli demu crapon adidas taille 42 fil panier','7otli demi crapon pointure 42','حطلي ديمي كرامبون مقاس 42 في البانيي','ajoute demi crampon taille 42 au panier']){
    const parsed=NLP.cartRequest(message);
    assert.ok(parsed,message);
    assert.equal(parsed.size,'42',message);
    assert.equal(parsed.quantity,1,message);
  }
});
test('distinguishes an order status question from add to cart',()=>{
  assert.equal(NLP.cartRequest('win waslet el commande mta3i'),null);
  assert.equal(NLP.cartRequest('suivi commande #abc123'),null);
});
test('understands quantity and colors without mixing shoe size with quantity',()=>{
  const a=NLP.cartRequest('zidli 2 paires demu crapon noir pointure 42');
  assert.equal(a.quantity,2);
  assert.equal(a.size,'42');
  assert.equal(a.color,'noir');
  const b=NLP.cartRequest('حطلي زوز سبادري قياس 41');
  assert.equal(b.quantity,2);
  assert.equal(b.size,'41');
});
test('matches store colors across dialects',()=>{
  assert.equal(NLP.matchColor('noir',['Noir','Blanc']),'Noir');
  assert.equal(NLP.matchColor('noir',['Black','White']),'Black');
  assert.equal(NLP.matchColor('bleu',['Noir','Bleu']),'Bleu');
  assert.equal(NLP.matchColor('vert',['Noir'] ),null);
});
test('only selects matching product from catalog; no invented product',()=>{
  const found=NLP.search('hottli demu crapon adidas taille 42',products);
  assert.equal(found[0].id,'demi-a');
  assert(!found.some(p=>p.id==='running'));
});
