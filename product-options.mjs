/* Shared product option and Tunisian phone validation for admin, store and chatbot. */
export const SIZE_PRESETS=Object.freeze({
  clothing:Object.freeze(['S','M','L','XL','XXL']),
  shoe:Object.freeze(['39','40','41','42','43','44','45']),
  accessory:Object.freeze([])
});
export const PRODUCT_TYPE_LABELS=Object.freeze({
  clothing:'Vêtement / maillot / short (S → XXL)',
  shoe:'Chaussures / crampons / demi-crampons (39 → 45)',
  accessory:'Accessoire sans pointure'
});
export function inferProductType(product={}){
  if(Object.hasOwn(PRODUCT_TYPE_LABELS,product.productType))return product.productType;
  const title=String(product.name||'').toLowerCase(),cat=String(product.category||'').toLowerCase();
  if(/(crampon|crapon|krampon|demi|demu|dmi|basket|sneaker|chaussure|running|sbedri|sbabri|sab(a|b)t|سبادري|كرامبون|كرابون|صباط)/iu.test(title)||/(chaussure|footwear|shoes)/i.test(cat))return 'shoe';
  if(/(maillot|maryoul|maryoul|shirt|t-shirt|short|survet|sweat|pantalon|hoodie|jogging|tricot|تيشرت|مريول|تريكو|شورت)/iu.test(title)||/(vêtement|vetement|textile)/i.test(cat))return 'clothing';
  if(/(accessoire|accessory|sac|ballon|socks|chaussette|gant|ساك|اكسسوار)/iu.test(title)||/(accessoire)/i.test(cat))return 'accessory';
  // For older products with no explicit type, we still require an admin decision.
  const sizes=Array.isArray(product.sizes)?product.sizes.map(String):[];
  if(sizes.length&&sizes.every(s=>SIZE_PRESETS.shoe.includes(s)))return 'shoe';
  if(sizes.length&&sizes.every(s=>SIZE_PRESETS.clothing.includes(s.toUpperCase())))return 'clothing';
  return '';
}
export function isCleat(product={}) {
  return /(?:crampons?|crapons?|krampons?|demi[-\s]?(?:crampons?)?|demu|dmi|كرامبون|كرابون|football boots|cleats)/iu.test(String(product.name||'')+' '+String(product.category||''));
}
export function withoutCleatColors(product) {
  return isCleat(product)?{...product,colors:[]}:product;
}
export function typeRequiresSize(type){return type==='shoe'||type==='clothing';}
export function cleanSizes(sizes,type){
  const allowed=SIZE_PRESETS[type]||[];
  const list=Array.isArray(sizes)?sizes:String(sizes||'').split(',');
  return [...new Set(list.map(x=>String(x).trim().toUpperCase()).filter(s=>allowed.includes(s)))].sort((a,b)=>allowed.indexOf(a)-allowed.indexOf(b));
}
export function selectedSizes(product){
  return cleanSizes(product?.sizes,inferProductType(product));
}
export function productOptionState(product){
  const type=inferProductType(product);
  const sizes=selectedSizes(product);
  return {type,sizes,required:typeRequiresSize(type),configured:type==='accessory'||(typeRequiresSize(type)&&sizes.length>0)};
}
export function validateSelectedSize(product,value){
  const config=productOptionState(product);
  if(!config.configured)return {ok:false,code:'size_not_configured',sizes:config.sizes};
  if(!config.required)return {ok:true,size:''};
  const size=String(value||'').trim().toUpperCase();
  if(!size||!config.sizes.includes(size))return {ok:false,code:'size_required',sizes:config.sizes};
  return {ok:true,size};
}
export function tunisianMobile(value){
  let digits=String(value??'').trim().replace(/[\s().-]/g,'');
  if(digits.startsWith('+216'))digits=digits.slice(4);
  else if(digits.startsWith('00216'))digits=digits.slice(5);
  // Local mobile numbers: eight digits, beginning with 2, 4, 5 or 9.
  return /^[2459]\d{7}$/.test(digits)?digits:null;
}

/* Single published campaign; prices are in TND, rounded to millimes. */
export function normalizePromotion(raw={}) {
  if(!raw || typeof raw!=='object') return null;
  const scope=String(raw.scope||''),type=String(raw.type||''),value=Number(raw.value),start=Number(raw.start),end=Number(raw.end);
  if(!['all','category','product'].includes(scope)||!['percent','fixed'].includes(type)||!Number.isFinite(value)||value<=0||(type==='percent'&&value>=100)||!Number.isFinite(start)||!Number.isFinite(end)||end<=start|| (scope!=='all'&&!String(raw.target||'').trim()))return null;
  return {enabled:raw.enabled===true,scope,target:String(raw.target||''),type,value,start,end,popup:raw.popup===true,countdown:raw.countdown===true,title:String(raw.title||'Offre spéciale Sportifano').slice(0,100)};
}
export function promotionActive(raw,now=Date.now()){
  const p=normalizePromotion(raw);return p&&p.enabled&&now>=p.start&&now<p.end?p:null;
}
export function applyPromotion(product,raw,now=Date.now()){
  const p=promotionActive(raw,now);
  if(!p||product.active===false||Number(product.stock)<=0||(p.scope==='product'&&String(product.id)!==p.target)||(p.scope==='category'&&product.category!==p.target))return product;
  const base=Number(product.price);
  if(!Number.isFinite(base)||base<=0||product.price==null||String(product.price).trim()==='')return product;
  const price=Math.round((p.type==='percent'?base*(1-p.value/100):p.value)*1000)/1000;
  if(price<=0||price>=base)return product;
  return {...product,price,oldPrice:base,badge:'−'+Math.floor((base-price)/base*100+1e-8)+'%',promotionApplied:true};
}
