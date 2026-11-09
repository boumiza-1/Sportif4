import {auth,db,configured} from './firebase.js';
import {demoProducts,money,safe,imageFallback,toast,readableError} from './common.js';
import {onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signInAnonymously,signOut,updateProfile} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {collection,getDocs,addDoc,doc,getDoc,serverTimestamp,query,where} from './database-api.js';
import {productPath,categoryPath,imageUrl,imageSrcset} from './seo-shared.mjs';
import {productOptionState,validateSelectedSize,tunisianMobile} from './product-options.mjs';
import {MetaPixel} from './meta-pixel.mjs';
const $=s=>document.querySelector(s);let products=[],settings={},user=null,category='all',search='',sort='new';
category=document.body.dataset.category||'all';
let liveCatalog=false;
let publishedProducts=new Set(),publishedCategories=new Set();
const productImage=(p,width=640)=>imageUrl(p.image,width)||imageFallback;
const adProductUrl=id=>publishedProducts.has(id)?productPath(id):'/?product='+encodeURIComponent(String(id));
const responsiveImage=(p)=>imageSrcset(p.image)?` srcset="${safe(imageSrcset(p.image))}" sizes="(max-width:680px) 46vw,(max-width:980px) 30vw,300px"`:'';
function renderCategoryLinks(){
  const filters=$('#filters');if(!filters)return;
  const names=[...new Set(products.filter(p=>p.active!==false&&p.category).map(p=>p.category))];
  filters.innerHTML='<a href="/#catalogue"'+(category==='all'?' class="active"':'')+'>Tout voir</a>'+names.map(name=>publishedCategories.has(name)?`<a href="${safe(categoryPath(name))}"${category===name?' class="active"':''}>${safe(name)}</a>`:`<button type="button" data-category="${safe(name)}"${category===name?' class="active"':''}>${safe(name)}</button>`).join('');
}
const saved=()=>{try{return JSON.parse(localStorage.getItem('sportifano_cart')||'[]')}catch{return []}};
let cart=saved();const saveCart=()=>{localStorage.setItem('sportifano_cart',JSON.stringify(cart));renderCart()};
const modal=(title,html)=>{$('#modalTitle').textContent=title;$('#modalBody').innerHTML=`<div class="modal-body">${html}</div>`;$('#modal').classList.remove('hidden');$('#shade').classList.remove('hidden')};
const close=()=>{$('#modal').classList.add('hidden');$('#cartDrawer').classList.add('hidden');$('#shade').classList.add('hidden')};
const cartProduct=id=>products.find(p=>p.id===id);const validCart=()=>cart.filter(i=>cartProduct(i.id));
function renderCoverProducts(){
const hero=document.querySelector('.hero-photo');if(!hero)return;
const list=products.filter(p=>p.active!==false&&p.image);
if(!list.length){hero.classList.add('no-live-product');return}
let index=0;
const image=$('#heroProductImage'),name=$('#heroProductName'),category=$('#heroProductCategory'),description=$('#heroProductDescription'),price=$('#heroProductPrice'),count=$('#heroProductCount'),details=$('#heroProductDetails');
function show(next){
index=(next+list.length)%list.length;const p=list[index];
image.style.backgroundImage='none';image.innerHTML='<img class="hero-product-png" src="'+String(productImage(p,960)).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')+'" alt="'+String(p.name||'Produit Sportifano').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')+'">';const productImg=image.querySelector('img');productImg.onerror=()=>{productImg.src=imageFallback;productImg.classList.add('is-fallback')};
image.classList.remove('hero-image-enter');void image.offsetWidth;image.classList.add('hero-image-enter');
name.textContent=p.name||'Produit Sportifano';category.textContent=p.category||'COLLECTION SPORTIFANO';description.textContent=p.description||'Découvrez ce produit et ses caractéristiques.';price.textContent=money(p.price);count.textContent=String(index+1).padStart(2,'0')+' / '+String(list.length).padStart(2,'0');
details.onclick=()=>{window.location.assign(adProductUrl(p.id));};
}
$('#heroProductPrev').onclick=()=>show(index-1);$('#heroProductNext').onclick=()=>show(index+1);
show(0);
}
function renderShowcase(){
const host=$('#showcaseList');if(!host)return;
const list=products.filter(p=>p.active!==false);
if(!list.length){host.innerHTML='<p class="muted">Aucun produit disponible pour le moment.</p>';return}
host.innerHTML=list.map((p,i)=>`<button type="button" class="showcase-choice${i===0?' is-active':''}" data-showcase="${safe(p.id)}" aria-pressed="${i===0?'true':'false'}"><img src="${safe(productImage(p))}" alt="" loading="lazy" onerror="this.src='${imageFallback}'"><span class="showcase-choice-copy"><span class="showcase-choice-name">${safe(p.name)}</span><span class="showcase-choice-price">${money(p.price)}</span></span><span class="showcase-choice-num">${String(i+1).padStart(2,'0')}</span></button>`).join('');
const stageImage=$('#showcaseImage'),stageName=$('#showcaseName'),stageCategory=$('#showcaseCategory'),stageDescription=$('#showcaseDescription'),stagePrice=$('#showcasePrice'),stageIndex=$('#showcaseIndex'),stageView=$('#showcaseView');
let activeId=null;
function activate(id,index){
const p=list.find(x=>String(x.id)===String(id));if(!p)return;
activeId=String(p.id);
host.querySelectorAll('[data-showcase]').forEach(b=>{const on=b.dataset.showcase===activeId;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',on?'true':'false')});
stageImage.classList.add('is-changing');
const next=productImage(p,960),preload=new Image();
preload.onload=()=>{stageImage.src=next;stageImage.alt=p.name;requestAnimationFrame(()=>stageImage.classList.remove('is-changing'))};
preload.onerror=()=>{stageImage.src=imageFallback;stageImage.classList.remove('is-changing')};
preload.src=next;
stageName.textContent=p.name||'Produit Sportifano';stageCategory.textContent=p.category||'Sportifano';stageDescription.textContent=p.description||'Découvrez ce produit sportif sur Sportifano.';stagePrice.textContent=money(p.price);stageIndex.textContent=String(index+1).padStart(2,'0');
stageView.onclick=()=>viewProduct(p.id);
}
host.onclick=e=>{const b=e.target.closest('[data-showcase]');if(!b)return;activate(b.dataset.showcase,list.findIndex(p=>String(p.id)===b.dataset.showcase))};
const observer=('IntersectionObserver' in window)?new IntersectionObserver(entries=>{
const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>Math.abs(a.boundingClientRect.top-window.innerHeight*.45)-Math.abs(b.boundingClientRect.top-window.innerHeight*.45));
if(visible.length){const b=visible[0].target;if(b.dataset.showcase!==activeId)activate(b.dataset.showcase,list.findIndex(p=>String(p.id)===b.dataset.showcase))}
},{rootMargin:'-30% 0px -35% 0px',threshold:0}):null;
host.querySelectorAll('[data-showcase]').forEach(b=>{if(observer)observer.observe(b)});
activate(list[0].id,0);
}
function renderProducts(){
  const grid=$('#productGrid');if(!grid)return;
  const list=products.filter(p=>p.active!==false&&(category==='all'||p.category===category)&&(`${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase())));
  if(sort==='asc')list.sort((a,b)=>a.price-b.price);if(sort==='desc')list.sort((a,b)=>b.price-a.price);
  grid.innerHTML=list.map(p=>{
    const href=adProductUrl(p.id);
    const picTag=published?'a':'button';
    const target=published?`href="${safe(href)}"`:`type="button" data-view="${safe(p.id)}"`;
    const title=published?`<a href="${safe(href)}">${safe(p.name)}</a>`:`<button class="product-title-button" type="button" data-view="${safe(p.id)}">${safe(p.name)}</button>`;
    const categoryName=p.category||'Collection';
    const categoryLabel=publishedCategories.has(p.category)?`<a href="${safe(categoryPath(p.category))}"><small>${safe(categoryName)}</small></a>`:`<small>${safe(categoryName)}</small>`;
    return `<article class="product-card"><${picTag} class="product-pic product-image-link" ${target} aria-label="Voir ${safe(p.name)}"><img src="${safe(productImage(p))}"${responsiveImage(p)} alt="${safe(p.name)}" loading="lazy" width="640" height="780">${p.badge?`<span class="product-badge">${safe(p.badge)}</span>`:''}<span class="product-add">VOIR LE PRODUIT ↗</span></${picTag}><div class="product-info">${categoryLabel}<h3>${title}</h3><b>${validPrice(p)?money(p.price):'Prix à confirmer'}</b>${validPrice({price:p.oldPrice})&&Number(p.oldPrice)>Number(p.price)?`<span class="old-price">${money(p.oldPrice)}</span>`:''}</div><button type="button" class="product-buy-now" data-buy="${safe(p.id)}" ${!liveCatalog||Number(p.stock)<1||!productOptionState(p).configured?'disabled':''}>PASSER LA COMMANDE ↗</button></article>`;
  }).join('');
  $('#emptyProducts')?.classList.toggle('hidden',!!list.length);
}

const validPrice=p=>p&&(typeof p.price==='number'||typeof p.price==='string')&&String(p.price).trim()!==''&&Number.isFinite(Number(p.price))&&Number(p.price)>=0;
const stockState=p=>!['number','string'].includes(typeof p.stock)||p.stock===null||p.stock===undefined||String(p.stock).trim()===''||typeof p.stock==='boolean'||!Number.isFinite(Number(p.stock))||Number(p.stock)<0?'unknown':Number(p.stock)>0?'available':'unavailable';
function refreshProductSchema(product){
  for(const script of document.querySelectorAll('script[type="application/ld+json"]')){
    let data;try{data=JSON.parse(script.textContent)}catch{continue}
    const refresh=node=>{
      if(Array.isArray(node))return node.map(refresh);
      if(!node||typeof node!=='object')return node;
      if(node['@type']==='Product'){
        if(!product)return null;
        node.name=product.name;node.description=product.description||product.name;if(product.category)node.category=product.category;else delete node.category;
        const img=imageUrl(product.image,960);if(img)node.image=[img];else delete node.image;
        if(validPrice(product)){
          node.offers={'@type':'Offer',url:document.querySelector('link[rel="canonical"]')?.href,priceCurrency:'TND',price:Number(product.price)};
          if(stockState(product)!=='unknown')node.offers.availability='https://schema.org/'+(stockState(product)==='available'?'InStock':'OutOfStock');
        }else delete node.offers;
      }
      if(Array.isArray(node['@graph']))node['@graph']=node['@graph'].map(refresh).filter(Boolean);
      return node;
    };
    const next=refresh(data);if(next)script.textContent=JSON.stringify(next).replace(/</g,'\\u003c');else script.remove();
  }
}
function renderProductPage(){
  const host=$('#seoProductContent');if(!host)return;
  const p=products.find(p=>p.id===document.body.dataset.productId&&p.active!==false);
  if(p)MetaPixel.viewProduct(p);
  if(!p){
    if(!liveCatalog)return;
    host.innerHTML='<div class="seo-product-copy"><h1>Ce produit n’est plus disponible</h1><p>Découvrez les autres articles actuellement proposés par Sportifano.</p><a class="btn btn-dark" href="/#catalogue">Voir la collection</a></div>';
    document.title='Produit indisponible | Sportifano';
    let robots=document.querySelector('meta[name="robots"]');if(!robots){robots=document.createElement('meta');robots.name='robots';document.head.append(robots)}robots.content='noindex, follow';refreshProductSchema(null);return;
  }
  host.querySelector('h1').textContent=p.name;
  host.querySelector('[data-seo-price]').textContent=validPrice(p)?money(p.price):'Prix à confirmer';
  host.querySelector('[data-seo-stock]').textContent=stockState(p)==='available'?'En stock · disponibilité à confirmer lors de la commande':stockState(p)==='unavailable'?'Rupture de stock':'Disponibilité à confirmer';
  host.querySelector('.seo-description').textContent=p.description||'Consultez les tailles, couleurs et disponibilités de cet article auprès de la boutique.';
  const image=host.querySelector('.seo-product-image img');if(image){image.src=productImage(p,960);image.alt=p.name;const srcset=imageSrcset(p.image);if(srcset)image.srcset=srcset;else image.removeAttribute('srcset')}
  const attrs=host.querySelector('.seo-attributes');if(attrs)attrs.innerHTML=[['Catégorie',p.category],['Tailles',Array.isArray(p.sizes)?p.sizes.join(', '):p.sizes],['Couleurs',Array.isArray(p.colors)?p.colors.join(', '):p.colors]].filter(([,v])=>v).map(([k,v])=>`<div><dt>${safe(k)}</dt><dd>${safe(v)}</dd></div>`).join('');
  const button=host.querySelector('[data-view]');if(button){button.disabled=!liveCatalog||stockState(p)!=='available'||!validPrice(p);button.textContent=!liveCatalog?'Disponibilité à vérifier':stockState(p)==='unavailable'?'Rupture de stock':stockState(p)==='unknown'?'Contactez-nous pour la disponibilité':'Choisir mes options et commander';}
  const duplicate=products.filter(x=>x.name.trim().toLocaleLowerCase('fr')===p.name.trim().toLocaleLowerCase('fr')).length>1;
  document.title=p.name+(duplicate?' · Réf. '+p.id:'')+' | Sportifano Tunisie';
  const description=(p.description||`${p.name} chez Sportifano. Consultez les prix, tailles et couleurs et commandez en Tunisie avec paiement à la livraison.`).slice(0,170);
  for(const key of ['description','og:description','twitter:description']){const tag=document.querySelector(`meta[name="${key}"],meta[property="${key}"]`);if(tag)tag.content=description}
  for(const key of ['og:title','twitter:title']){const tag=document.querySelector(`meta[property="${key}"],meta[name="${key}"]`);if(tag)tag.content=document.title}
  refreshProductSchema(p);
}

function renderCart(){let items=validCart();$('#cartCount').textContent=items.reduce((a,i)=>a+i.qty,0);$('#cartItemsCount').textContent=`(${items.length})`;$('#cartContents').innerHTML=items.length?items.map(i=>{let p=cartProduct(i.id);return `<div class="cart-item"><img src="${safe(productImage(p))}" alt=""><div><h4>${safe(p.name)}</h4><p>${safe([i.size,i.color].filter(Boolean).join(' / '))}</p><b>${money(p.price*i.qty)}</b><div class="qty-controls"><button data-qty="${i.key}" data-delta="-1">−</button>${i.qty}<button data-qty="${i.key}" data-delta="1">+</button><button class="remove-item" data-remove="${i.key}">Supprimer</button></div></div></div>`}).join(''):'<div class="empty">Votre panier est vide.</div>';$('#cartTotal').textContent=money(items.reduce((t,i)=>t+cartProduct(i.id).price*i.qty,0));$('#checkoutBtn').disabled=!items.length||!liveCatalog}
// One validated cart path shared by the normal product form and the shopping assistant.
// This only changes the local shopping cart; no order or payment is placed here.
function validatedCartAdd({productId,size='',color='',quantity=1}={}){
  const p=products.find(x=>String(x.id)===String(productId)&&x.active!==false);
  if(!liveCatalog)return {ok:false,code:'catalog_unavailable'};
  if(!p)return {ok:false,code:'product_unavailable'};
  if(!validPrice(p))return {ok:false,code:'price_unavailable'};
  const count=Number(quantity),available=Number(p.stock);
  if(!Number.isSafeInteger(count)||count<1||count>10)return {ok:false,code:'bad_quantity'};
  if(!Number.isSafeInteger(available)||available<1)return {ok:false,code:'out_of_stock'};
  const options=(value)=>Array.isArray(value)?value.map(v=>String(v).trim()).filter(Boolean):[];
  const sizeState=productOptionState(p),sizes=sizeState.sizes,colors=options(p.colors);if(!sizeState.configured)return {ok:false,code:'size_not_configured'};
  const match=(requested,available)=>available.find(item=>item.toLowerCase()===String(requested||'').trim().toLowerCase());
  const sizeCheck=validateSelectedSize(p,size);if(!sizeCheck.ok)return {ok:false,code:sizeCheck.code,sizes};const chosenSize=sizeCheck.size;
  const chosenColor=colors.length?match(color,colors)||(!color&&colors.length===1?colors[0]:''):'';
  if((sizes.length&&!chosenSize)||(size&&!sizes.length))return {ok:false,code:'size_unavailable',sizes};
  if((colors.length&&!chosenColor)||(color&&!colors.length))return {ok:false,code:'color_unavailable',colors};
  const inCart=cart.filter(x=>x.id===p.id).reduce((sum,x)=>sum+Number(x.qty||0),0);
  if(inCart+count>available)return {ok:false,code:'insufficient_stock',remaining:Math.max(0,available-inCart)};
  const key=[p.id,chosenSize,chosenColor].join('|');
  const found=cart.find(x=>x.key===key);
  if(found)found.qty+=count;
  else cart.push({id:p.id,key,size:chosenSize,color:chosenColor,qty:count});
  saveCart();
  MetaPixel.addToCart(p,count);
  window.dispatchEvent(new CustomEvent('sportifano:cart-updated',{detail:{count:cart.reduce((sum,x)=>sum+x.qty,0)}}));
  return {ok:true,product:{id:p.id,name:p.name,price:Number(p.price)},size:chosenSize,color:chosenColor,quantity:count};
}
window.SportifanoCart=Object.freeze({
  addItem:request=>validatedCartAdd(request),
  open:()=>{$('#cartDrawer').classList.remove('hidden');$('#shade').classList.remove('hidden')},
  isReady:()=>liveCatalog
});
function productSizeControl(p,field='size'){
  const conf=productOptionState(p);if(!conf.required)return '';
  const name=conf.type==='shoe'?'Pointure *':'Taille *';
  return '<label>'+name+'<select name="'+field+'" required><option value="">Choisissez '+(conf.type==='shoe'?'une pointure':'une taille')+'</option>'+conf.sizes.map(size=>'<option value="'+safe(size)+'">'+safe(size)+'</option>').join('')+'</select></label>';
}
function viewProduct(id){
  const p=products.find(x=>String(x.id)===String(id)&&x.active!==false);
  if(!p)return;
  MetaPixel.viewProduct(p);
  if(!validPrice(p))return toast('Contactez la boutique pour confirmer le prix.');
  const opts=productOptionState(p),ready=liveCatalog&&opts.configured&&Number(p.stock)>0;
  modal(p.name,'<div class="product-detail"><img src="'+safe(productImage(p))+'" alt="'+safe(p.name)+'"><div><small>'+safe(p.category||'')+'</small><h3>'+safe(p.name)+'</h3><p class="detail-price">'+money(p.price)+'</p><p class="muted">'+safe(p.description||'Produit Sportifano')+'</p><p class="muted">Stock : '+Number(p.stock||0)+'</p><form id="addProductForm"><div class="detail-options">'+productSizeControl(p)+(p.colors?.length?'<label>Couleur<select name="color" required><option value="">Choisissez une couleur</option>'+p.colors.map(x=>'<option value="'+safe(x)+'">'+safe(x)+'</option>').join('')+'</select></label>':'')+'</div>'+(!opts.configured?'<p class="error-text">Tailles non renseignées. La boutique doit configurer ce produit avant toute commande.</p>':'')+'<button type="submit" class="btn btn-dark wide" '+(!ready?'disabled':'')+'>AJOUTER AU PANIER ↗</button><button type="button" class="btn btn-outline wide" id="buyFromDetails" '+(!ready?'disabled':'')+'>PASSER LA COMMANDE ↗</button></form></div></div>');
  $('#addProductForm').onsubmit=e=>{
    e.preventDefault();const fd=new FormData(e.target);
    const result=validatedCartAdd({productId:p.id,size:String(fd.get('size')||''),color:String(fd.get('color')||''),quantity:1});
    if(!result.ok)return toast(result.code==='size_required'?'Choisissez votre taille / pointure.':'Option ou stock indisponible.');
    close();toast('Produit ajouté au panier');
  };
  $('#buyFromDetails').onclick=()=>{
    const fd=new FormData($('#addProductForm'));
    const size=String(fd.get('size')||''),color=String(fd.get('color')||'');
    if(!$('#addProductForm').reportValidity())return;
    directCheckout(p.id,{size,color});
  };
}
function authScreen(register=false){modal(register?'Créer un compte':'Mon compte',`<div class="tab-buttons"><button id="loginTab" class="${!register?'active':''}">Connexion</button><button id="registerTab" class="${register?'active':''}">Inscription</button></div><form id="authForm">${register?'<label>Nom complet<input name="name" required maxlength="100"></label>':''}<label>Email<input type="email" name="email" required autocomplete="email"></label><label>Mot de passe<input type="password" name="password" minlength="6" required autocomplete="${register?'new-password':'current-password'}"></label><button class="btn btn-dark wide">${register?'CRÉER UN COMPTE':'SE CONNECTER'}</button><p id="authError" class="error-text"></p></form>`);$('#loginTab').onclick=()=>authScreen(false);$('#registerTab').onclick=()=>authScreen(true);$('#authForm').onsubmit=async e=>{e.preventDefault();if(!configured)return $('#authError').textContent='Configurez Firebase dans firebase.js';let f=new FormData(e.target);try{let r=register?await createUserWithEmailAndPassword(auth,String(f.get('email')),String(f.get('password'))):await signInWithEmailAndPassword(auth,String(f.get('email')),String(f.get('password')));if(register)await updateProfile(r.user,{displayName:String(f.get('name'))});close();toast('Bienvenue sur Sportifano !')}catch(err){$('#authError').textContent=readableError(err)}}}
async function account(){if(!user)return authScreen();modal('Mon espace client',`<p>Connecté : <b>${safe(user.email)}</b></p><div class="tab-buttons"><button id="myOrdersBtn" class="active">Mes commandes</button><button id="signOutBtn">Déconnexion</button></div><div id="myOrders"><p>Chargement...</p></div>`);$('#signOutBtn').onclick=async()=>{await signOut(auth);close();toast('Vous êtes déconnecté')};try{let snap=await getDocs(query(collection(db,'orders'),where('userId','==',user.uid)));let arr=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));$('#myOrders').innerHTML=arr.length?arr.map(o=>`<div class="order-box"><b>Commande #${safe(o.id.slice(0,8))}</b><p>${safe(o.status||'pending')} · ${money(o.total)}</p><p>${o.items?.length||0} article(s)</p></div>`).join(''):'<p>Aucune commande pour le moment.</p>'}catch(e){$('#myOrders').textContent=readableError(e)}}
function directCheckout(id,selected={}){
  const p=products.find(x=>String(x.id)===String(id)&&x.active!==false);
  if(!p||!liveCatalog||!validPrice(p)||Number(p.stock)<1||!productOptionState(p).configured)return toast('Ce produit doit être configuré et disponible avant la commande.');
  openOrderForm({product:p,selected});
}
function checkout(){
  if(!liveCatalog)return toast('Vérifiez le stock en direct avant de commander.');
  if(!validCart().length)return toast('Votre panier est vide.');
  for(const item of validCart()){
    const p=cartProduct(item.id);
    if(!validateSelectedSize(p,item.size).ok)return toast('Choisissez la taille / pointure des articles avant commande.');
    if((p.colors||[]).length&&!(p.colors||[]).includes(item.color))return toast('Choisissez une couleur disponible.');
  }
  openOrderForm({items:validCart()});
}
function openOrderForm({product=null,selected={},items=null}={}){
  close();
  const direct=!!product;
  const sizeCtrl=direct?productSizeControl(product):'';
  const colors=direct&&Array.isArray(product.colors)?product.colors:[];
  const colorCtrl=colors.length?'<label>Couleur *<select name="color" required><option value="">Choisir une couleur</option>'+colors.map(c=>'<option value="'+safe(c)+'" '+(selected.color===c?'selected':'')+'>'+safe(c)+'</option>').join('')+'</select></label>':'';
  const initialSize=selected.size||'';
  const directPrice=direct?Number(product.price):0;
  const subtotal=direct?directPrice:(items||[]).reduce((total,i)=>total+Number(cartProduct(i.id).price)*i.qty,0);
  const fee=Number(settings.deliveryFee??8);
  modal('Passer la commande', '<form id="checkoutForm" class="direct-order-form">'+
    (direct?'<div class="order-selected-product"><img src="'+safe(productImage(product))+'" alt=""><div><strong>'+safe(product.name)+'</strong><small>'+money(product.price)+'</small></div></div><div class="detail-options">'+sizeCtrl+colorCtrl+'</div>':'<p class="muted">Vos articles du panier seront commandés avec les options sélectionnées.</p>')+
    '<label>Nom et prénom *<input name="name" required minlength="2" maxlength="100" autocomplete="name" value="'+safe(user?.displayName||'')+'"></label>'+
    '<label>Téléphone tunisien (8 chiffres) *<input name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" required placeholder="98453827" maxlength="18" pattern="(\\+216|00216)?[2459][0-9]{7}" title="Exemple : 98453827 (8 chiffres), ou +21698453827"></label>'+
    '<label>Ville *<input name="city" required maxlength="80" autocomplete="address-level2"></label>'+
    '<label>Adresse complète *<textarea name="address" rows="2" required minlength="5" maxlength="300" autocomplete="street-address"></textarea></label>'+
    '<label>Note de livraison (facultatif)<textarea name="note" rows="2" maxlength="300"></textarea></label>'+
    '<p>Mode de paiement : <b>À la livraison</b></p>'+
    '<p>Sous-total : <b id="checkoutSubtotal">'+money(subtotal)+'</b><br>Livraison : <b>'+money(fee)+'</b></p>'+
    '<button type="submit" class="btn btn-dark wide" id="placeOrderBtn">CONFIRMER MA COMMANDE ↗</button>'+
    '<p class="muted">Nous vous contacterons pour confirmer les détails et la disponibilité avant expédition.</p>'+
    '<p class="error-text" id="checkoutError" role="alert"></p></form>');
  MetaPixel.initiateCheckout(direct?[{id:product.id,price:Number(product.price),quantity:1}]:validCart().map(item=>({id:item.id,price:Number(cartProduct(item.id)?.price||0),quantity:item.qty})));
  const form=$('#checkoutForm');
  if(direct){
    const sizeSel=form.elements.namedItem('size');
    if(sizeSel&&initialSize&&[...sizeSel.options].some(o=>o.value===initialSize))sizeSel.value=initialSize;
  }
  form.onsubmit=async e=>{
    e.preventDefault();
    const out=$('#checkoutError'),button=$('#placeOrderBtn');out.textContent='';
    const fd=new FormData(form);
    const phone=tunisianMobile(fd.get('phone'));
    if(!phone){out.textContent='Numéro tunisien invalide : 8 chiffres. Exemple valide : 98453827. Exemple refusé : 9845382.';form.elements.namedItem('phone').focus();return;}
    const size=String(fd.get('size')||''),color=String(fd.get('color')||'');
    if(direct&&!validateSelectedSize(product,size).ok){out.textContent='Choisissez une taille ou pointure disponible.';return;}
    if(direct&&colors.length&&!colors.includes(color)){out.textContent='Choisissez une couleur.';return;}
    if(!configured){out.textContent='Le service de commandes est temporairement indisponible.';return;}
    button.disabled=true;button.textContent='ENREGISTREMENT...';
    try{
      const requested=direct?[{id:product.id,qty:1,size,color}]:validCart().map(i=>({...i}));
      // Refresh each item from Firebase immediately before submission.
      const orderItems=[];
      for(const entry of requested){
        const snap=await getDoc(doc(db,'products',entry.id));
        if(!snap.exists())throw Error('Produit indisponible. Veuillez actualiser la boutique.');
        const current={...snap.data(),id:entry.id};
        if(current.active===false||!validPrice(current))throw Error('Article indisponible.');
        const sz=validateSelectedSize(current,entry.size);
        if(!sz.ok)throw Error('Taille ou pointure non disponible pour : '+current.name);
        if((current.colors||[]).length&&!(current.colors||[]).includes(entry.color))throw Error('Couleur non disponible pour : '+current.name);
        const quantity=Number(entry.qty);
        if(!Number.isSafeInteger(quantity)||quantity<1||Number(current.stock)<quantity)throw Error('Stock insuffisant pour : '+current.name);
        orderItems.push({productId:current.id,name:String(current.name),image:productImage(current,640),price:Number(current.price),quantity,size:sz.size,color:entry.color||''});
      }
      let customer=user||auth.currentUser;
      if(!customer){
        try{const result=await signInAnonymously(auth);customer=result.user;user=customer;}
        catch(err){throw Error('Commande invité indisponible pour le moment. Activez la connexion anonyme Firebase ou connectez-vous avec votre compte Sportifano.');}
      }
      const cost=orderItems.reduce((sum,p)=>sum+p.price*p.quantity,0);
      const name=String(fd.get('name')||'').trim(),city=String(fd.get('city')||'').trim(),address=String(fd.get('address')||'').trim();
      if(name.length<2||!city||address.length<5)throw Error('Complétez le nom, la ville et l’adresse.');
      const result=await addDoc(collection(db,'orders'),{
        userId:customer.uid,email:customer.email||'',name,phone,city,address,
        note:String(fd.get('note')||'').trim(),items:orderItems,
        subtotal:cost,deliveryFee:fee,total:cost+fee,
        status:'pending',paymentMethod:'cash_on_delivery',createdAt:serverTimestamp()
      });
      MetaPixel.orderPlaced(orderItems.map(item=>({id:item.productId,price:item.price,quantity:item.quantity})),result.id);
      if(!direct){cart=[];saveCart();}
      modal('Commande reçue','<div class="order-success"><h3>Merci pour votre commande !</h3><p>Référence : <strong>#'+safe(result.id.slice(0,8))+'</strong></p><p>Votre commande a été enregistrée. Notre équipe vous contactera pour confirmer la livraison.</p><button type="button" id="finishOrder" class="btn btn-dark wide">CONTINUER MES ACHATS</button></div>');
      $('#finishOrder').onclick=close;toast('Commande enregistrée');
    }catch(err){
      out.textContent=String(err?.message||readableError(err));
      button.disabled=false;button.textContent='CONFIRMER MA COMMANDE ↗';
    }
  };
}
async function init(){
  $('#year').textContent=new Date().getFullYear();
  const timeout=promise=>{let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Lecture temporairement indisponible')),12000)})]).finally(()=>clearTimeout(timer))};
  const snapshotPromise=(async()=>{try{const response=await fetch('/catalogue.json',{signal:AbortSignal.timeout(5000)});if(!response.ok)return null;const data=await response.json();return Array.isArray(data.products)?data:null}catch{return null}})();
  if(configured){
    const [result,config]=await Promise.allSettled([timeout(getDocs(collection(db,'products'))),timeout(getDoc(doc(db,'settings','store')))]);
    if(result.status==='fulfilled'){products=result.value.docs.map(d=>({...d.data(),id:d.id})).filter(p=>p.active!==false&&typeof p.name==='string');liveCatalog=true;}
    if(config.status==='fulfilled'&&config.value.exists())settings=config.value.data();
  }
  const snapshot=await snapshotPromise;
  if(snapshot){
    publishedProducts=new Set(snapshot.products.map(p=>p.id));
    publishedCategories=new Set(snapshot.products.map(p=>p.category).filter(Boolean));
    if(!liveCatalog){products=snapshot.products;settings={...snapshot.settings,...settings};}
  }

  document.body.dataset.catalogReady=liveCatalog?'live':products.length?'snapshot':'unavailable';
  const status=$('#catalogStatus');if(status&&!liveCatalog){status.hidden=false;status.textContent='Vous pouvez consulter les articles. Les prix et disponibilités doivent être vérifiés auprès de la boutique avant de commander.';}
  if(settings.instagram&&$('#socialLink')){try{const url=new URL(settings.instagram);if(url.protocol==='https:'){$('#socialLink').href=url.href;$('#socialLink').textContent='SUIVEZ-NOUS ↗';}}catch{}}
  if(settings.phone&&$('#footerPhone')){$('#footerPhone').href='tel:'+String(settings.phone).replace(/[^+0-9]/g,'');$('#footerPhone').textContent=settings.phone;}
  MetaPixel.configure(Object.hasOwn(settings,'metaPixelId')?settings.metaPixelId:'1614291526710689');
  renderCategoryLinks();renderProducts();renderShowcase();renderCoverProducts();renderProductPage();renderCart();
  // Stable shopping deep link that works even when GitHub Pages serves only repository-root files.
  const requested=new URLSearchParams(location.search).get('product');
  if(requested&&/^[A-Za-z0-9_-]{1,120}$/.test(requested)&&document.body.dataset.seoPage==='home'){
    const found=products.find(p=>String(p.id)===requested&&p.active!==false);
    if(found){viewProduct(requested);}
    else{toast('Ce produit n’est plus disponible. Consultez la collection Sportifano.');}
  }
}

if(configured)onAuthStateChanged(auth,u=>user=u);
document.addEventListener('click',e=>{const button=e.target.closest('[data-view]');if(button&&!button.disabled)viewProduct(button.dataset.view)});
document.addEventListener('click',e=>{const b=e.target.closest('[data-buy]');if(b&&!b.disabled)directCheckout(b.dataset.buy);});
$('#filters')?.addEventListener('click',e=>{const b=e.target.closest('button[data-category]');if(!b)return;category=b.dataset.category;document.querySelectorAll('#filters [data-category]').forEach(x=>x.classList.toggle('active',x===b));renderProducts()});
$('#sortSelect')?.addEventListener('change',e=>{sort=e.target.value;renderProducts()});
$('#searchInput')?.addEventListener('input',e=>{search=e.target.value;renderProducts()});
$('#searchToggle').onclick=()=>{const input=$('#searchInput');if(!input){location.href='/#catalogue';return}input.classList.toggle('hidden');input.focus();location.hash='catalogue'};
$('#mobileMenu').onclick=()=>$('#mobileLinks').classList.toggle('hidden');$('#accountBtn').onclick=account;
$('#cartBtn').onclick=()=>{$('#cartDrawer').classList.remove('hidden');$('#shade').classList.remove('hidden')};
$('#shade').onclick=close;document.querySelectorAll('[data-close]').forEach(x=>x.onclick=close);
$('#cartContents').onclick=e=>{let q=e.target.closest('[data-qty]'),r=e.target.closest('[data-remove]');if(q){let item=cart.find(i=>i.key===q.dataset.qty);if(item){item.qty+=Number(q.dataset.delta);if(item.qty<=0)cart=cart.filter(i=>i!==item);else{let p=cartProduct(item.id);if(cart.filter(x=>x.id===item.id).reduce((a,x)=>a+x.qty,0)>Number(p.stock||0)){item.qty--;toast('Stock insuffisant')}}saveCart()}}if(r){cart=cart.filter(i=>i.key!==r.dataset.remove);saveCart()}};
$('#checkoutBtn').onclick=checkout;init();
