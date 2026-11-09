// Sportifano: optional Meta Pixel, enabled by the shop owner and each visitor's consent.
// Never send customer name, phone, email or delivery address.
const CONSENT_KEY='sportifano_meta_pixel_consent_v1';
const validId=value=>/^\d{12,20}$/.test(String(value||'').trim());
let pixelId='',active=false,panel=null,currentProduct=null,lastViewed='';
function remember(choice){try{localStorage.setItem(CONSENT_KEY,choice)}catch{}}
function storedChoice(){try{return localStorage.getItem(CONSENT_KEY)}catch{return null}}
function fbq(...args){if(active&&typeof window.fbq==='function')window.fbq(...args)}
function itemData(p,quantity=1){
  const id=String(p?.id||p?.productId||'');
  const price=Number(p?.price);
  if(!id||!Number.isFinite(price)||price<0)return null;
  const qty=Number(quantity);
  if(!Number.isInteger(qty)||qty<1)return null;
  return {id,quantity:qty,item_price:price};
}
function cartPayload(items){
  const contents=(Array.isArray(items)?items:[])
    .map(i=>itemData(i,i.quantity??i.qty??1)).filter(Boolean);
  if(!contents.length)return null;
  return {currency:'TND',value:Number(contents.reduce((s,i)=>s+i.quantity*i.item_price,0).toFixed(3)),
    content_type:'product',content_ids:contents.map(x=>x.id),contents,num_items:contents.reduce((s,i)=>s+i.quantity,0)};
}
function showPanel(force=false){
  if(!pixelId||(!force&&storedChoice()))return;
  if(!panel){
    panel=document.createElement('div');
    panel.className='meta-consent';
    panel.setAttribute('role','region');
    panel.setAttribute('aria-label','Préférences de cookies');
    const message=document.createElement('p');
    message.textContent='Nous utilisons des cookies facultatifs pour mesurer l’audience et améliorer votre expérience. Vous pouvez accepter ou refuser. / نستعملوا كوكيز اختيارية لتحسين الخدمة وقياس الزيارات. تنجم توافق أو ترفض.';
    const buttons=document.createElement('div');
    const accept=document.createElement('button');accept.type='button';accept.textContent='Accepter / نوافق';
    const reject=document.createElement('button');reject.type='button';reject.textContent='Refuser / نرفض';reject.className='secondary';
    accept.addEventListener('click',()=>{remember('yes');panel.hidden=true;activate();});
    reject.addEventListener('click',()=>{remember('no');active=false;panel.hidden=true;});
    buttons.append(accept,reject);
    panel.append(message,buttons);
    document.body.append(panel);
  }
  panel.hidden=false;
}
function activate(){
  if(!validId(pixelId)||active||storedChoice()!=='yes')return;
  if(typeof window.fbq!=='function'){
    /* Meta Pixel's standard browser bootstrap, loaded only AFTER opt-in. */
    (function(f,b,e,v,n,t,s){
      if(f.fbq)return;
      n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=true;n.version='2.0';n.queue=[];
      t=b.createElement(e);t.async=true;t.src=v;
      s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s);
    })(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  }
  active=true;
  fbq('init',pixelId);
  fbq('track','PageView');
  if(currentProduct)sendProductView(currentProduct);
}
function sendProductView(p){
  const data=itemData(p);
  if(!data||!active||lastViewed===data.id)return;
  lastViewed=data.id;
  fbq('track','ViewContent',{currency:'TND',value:data.item_price,
    content_type:'product',content_ids:[data.id],contents:[data]});
}
export const MetaPixel=Object.freeze({
  configure(id){
    const val=String(id||'').trim();
    if(!validId(val)){pixelId='';return false}
    pixelId=val;
    const btn=document.getElementById('pixelConsentSettings');
    if(btn)btn.hidden=false;
    if(storedChoice()==='yes')activate();else showPanel();
    return true;
  },
  openPreferences(){showPanel(true)},
  viewProduct(p){currentProduct=p;sendProductView(p)},
  addToCart(p,quantity=1){if(!active)return;const item=itemData(p,quantity);if(!item)return;
    fbq('track','AddToCart',{currency:'TND',value:Number((item.item_price*item.quantity).toFixed(3)),
      content_type:'product',content_ids:[item.id],contents:[item]});},
  initiateCheckout(items){if(!active)return;const data=cartPayload(items);if(data)fbq('track','InitiateCheckout',data)},
  // A cash-on-delivery Purchase event means the order was submitted successfully,
  // NOT that delivery or collection of payment has been confirmed.
  orderPlaced(items,orderId){if(!active)return;const data=cartPayload(items);if(!data)return;
    fbq('track','Purchase',{...data,order_id:String(orderId||'').slice(0,90)});},
  search(term){if(active&&String(term||'').trim())fbq('track','Search',{search_string:String(term).trim().slice(0,80)})},
  get active(){return active}
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('pixelConsentSettings')?.addEventListener('click',()=>MetaPixel.openPreferences());
},{once:true});
else document.getElementById('pixelConsentSettings')?.addEventListener('click',()=>MetaPixel.openPreferences());
