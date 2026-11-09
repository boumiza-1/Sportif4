import {auth,db,configured} from './firebase.js';
import {money,safe,imageFallback,toast,readableError,demoProducts} from './common.js';
import {onAuthStateChanged,signInWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {collection,doc,getDoc,getDocs,setDoc,addDoc,updateDoc,deleteDoc,serverTimestamp} from './database-api.js';
import {uploadCloudinaryImage} from './cloudinary.js';
import {SIZE_PRESETS,inferProductType,typeRequiresSize,cleanSizes,PRODUCT_TYPE_LABELS} from './product-options.mjs';
const $=s=>document.querySelector(s);let user=null,products=[],orders=[],categories=[],settings={},tab='dashboard',isAdmin=false;
const statuses={pending:'En attente',confirmed:'Confirmée',shipped:'Expédiée',delivered:'Livrée',cancelled:'Annulée'};
function showPreview(el,url){if(!el)return;el.classList.toggle('hidden',!url);if(url)el.src=url;else el.removeAttribute('src')}
async function uploadImage(file,folder,progress){
 if(!auth.currentUser||!isAdmin)throw Error('Accès administrateur requis');
 return uploadCloudinaryImage(file,folder,progress);
}
function choosePreview(input,el){let file=input.files?.[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){input.value='';toast('Image JPG/PNG/WEBP, max 5 Mo');return}let url=URL.createObjectURL(file);showPreview(el,url);el.onload=()=>URL.revokeObjectURL(url)}
const table=(heads,rows)=>`<table class="data-table"><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${heads.length}" class="muted">Aucune donnée</td></tr>`}</tbody></table>`;
function showTab(name){tab=name;document.querySelectorAll('.admin-section').forEach(x=>x.classList.toggle('hidden',x.id!==name+'Tab'));document.querySelectorAll('#adminNav button').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));const titles={dashboard:'Tableau de bord',products:'Produits',orders:'Commandes',categories:'Catégories',settings:'Paramètres'};$('#pageTitle').textContent=titles[name];$('#pageBreadcrumb').textContent='GESTION / '+titles[name].toUpperCase();$('.admin-sidebar').classList.remove('open')}
async function load(){try{let [p,o,c,s]=await Promise.all([getDocs(collection(db,'products')),getDocs(collection(db,'orders')),getDocs(collection(db,'categories')),getDoc(doc(db,'settings','store'))]);products=p.docs.map(d=>({id:d.id,...d.data()}));orders=o.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));categories=c.docs.map(d=>({id:d.id,...d.data()}));settings=s.exists()?s.data():{};render()}catch(e){toast(readableError(e))}}
function render(){renderDashboard();renderProducts();renderOrders();renderCategories();renderSettings()}
function orderRows(list){return list.map(o=>`<tr><td><b>#${safe(o.id.slice(0,8))}</b><br><span class="tiny">${o.createdAt?.toDate?.().toLocaleString('fr-TN')||'—'}</span></td><td>${safe(o.name)}<br><span class="tiny">${safe(o.phone||'')}</span></td><td>${money(o.total)}</td><td><span class="status ${safe(o.status)}">${safe(statuses[o.status]||o.status)}</span></td><td><button data-order="${safe(o.id)}">Détails</button></td></tr>`).join('')}
function renderDashboard(){$('#statProducts').textContent=products.length;$('#statOrders').textContent=orders.length;$('#statPending').textContent=orders.filter(o=>o.status==='pending').length;$('#statRevenue').textContent=money(orders.filter(o=>o.status!=='cancelled').reduce((a,o)=>a+Number(o.total||0),0));$('#recentOrders').innerHTML=table(['Commande','Client','Total','Statut',''],orderRows(orders.slice(0,6)))}
function renderProducts(){let term=$('#adminProductSearch').value.toLowerCase(),list=products.filter(p=>(p.name||'').toLowerCase().includes(term));$('#adminProducts').innerHTML=table(['Produit','Catégorie','Prix','Stock','Visible','Actions'],list.map(p=>`<tr><td><img src="${safe(p.image||imageFallback)}" alt=""><b>${safe(p.name)}</b></td><td>${safe(p.category)}</td><td>${money(p.price)}</td><td>${Number(p.stock||0)}</td><td>${p.active!==false?'Oui':'Non'}</td><td><button type="button" data-copy-product="${safe(p.id)}" title="Copier le lien unique du produit">Copier lien Ads</button><button data-edit="${safe(p.id)}">Modifier</button><button data-delete="${safe(p.id)}">Supprimer</button></td></tr>`).join(''))}
function renderOrders(){let status=$('#orderFilter').value,list=status==='all'?orders:orders.filter(o=>o.status===status);$('#adminOrders').innerHTML=table(['Commande','Client','Total','Statut','Action'],orderRows(list))}
function renderCategories(){$('#adminCategories').innerHTML=[...new Set(['Homme','Femme','Chaussures','Accessoires',...categories.map(c=>c.name)])].map(n=>`<div class="category-row"><strong>${safe(n)}</strong>${categories.some(c=>c.name===n)?`<button class="action-btn" data-delete-category="${safe(categories.find(c=>c.name===n).id)}">Supprimer</button>`:'<span class="tiny">Catégorie de base</span>'}</div>`).join('')}
function renderSettings(){$('#settingName').value=settings.name||'Sportifano';$('#settingPhone').value=settings.phone||'';$('#settingInstagram').value=settings.instagram||'';$('#settingMetaPixel').value=settings.metaPixelId??'1614291526710689';$('#settingDelivery').value=settings.deliveryFee??8;showPreview($('#coverPreview'),settings.coverImage||'')}
function renderSizeChoices(selected=[]){
  const type=$('#pProductType').value,available=SIZE_PRESETS[type]||[];
  const host=$('#pSizeOptions'),legend=$('#pSizeLegend'),hint=$('#pSizeHint');
  $('#pSizeFieldset').hidden=!type||type==='accessory';
  legend.textContent=type==='shoe'?'Pointures disponibles * (39 à 45)':'Tailles vêtements disponibles * (S à XXL)';
  hint.textContent=typeRequiresSize(type)?'Cochez toutes les tailles réellement disponibles. Au moins une taille obligatoire.':'Aucune taille nécessaire pour les accessoires.';
  host.replaceChildren();
  for(const item of available){
    const label=document.createElement('label');label.className='admin-size-choice';
    const box=document.createElement('input');box.type='checkbox';box.name='adminSize';box.value=item;box.checked=selected.includes(item);
    label.append(box,document.createTextNode(item));host.append(label);
  }
}
$('#pProductType').addEventListener('change',()=>renderSizeChoices());
function openProduct(id){
  const p=products.find(x=>x.id===id)||{};
  $('#productForm').reset();$('#productId').value=id||'';
  $('#adminModalTitle').textContent=id?'Modifier le produit':'Ajouter un produit';
  $('#pCategory').innerHTML=[...new Set(['Homme','Femme','Chaussures','Accessoires',...categories.map(c=>c.name)])].map(n=>`<option value="${safe(n)}" ${p.category===n?'selected':''}>${safe(n)}</option>`).join('');
  for(const [el,key] of [['pName','name'],['pPrice','price'],['pOldPrice','oldPrice'],['pStock','stock'],['pBadge','badge'],['pDescription','description'],['pImage','image']])$('#'+el).value=p[key]??(key==='stock'?10:'');
  $('#pProductType').value=inferProductType(p);
  renderSizeChoices(cleanSizes(p.sizes||[],inferProductType(p)));
  $('#pColors').value=(p.colors||[]).join(',');
  $('#pFile').value='';showPreview($('#productPreview'),p.image||'');
  $('#pActive').checked=p.active!==false;$('#uploadProgress').textContent='';
  $('#adminModal').classList.remove('hidden');
}
function closeProduct(){$('#adminModal').classList.add('hidden')}
async function saveProduct(e){e.preventDefault();if(!isAdmin)return;let btn=$('#saveProductBtn');btn.disabled=true;btn.textContent='ENREGISTREMENT...';try{let id=$('#productId').value,photo=$('#pFile').files[0],image=$('#pImage').value.trim();if(photo){if(photo.size>5*1024*1024)throw Error('Image trop lourde (max 5 Mo)');if(!['image/jpeg','image/png','image/webp'].includes(photo.type))throw Error('Format image non pris en charge');$('#uploadProgress').textContent='Upload en cours...';image=await uploadImage(photo,'products',$('#uploadProgress'));$('#pImage').value=image;$('#pFile').value='';}let data={name:$('#pName').value.trim(),category:$('#pCategory').value,price:Number($('#pPrice').value),oldPrice:Number($('#pOldPrice').value)||0,stock:Number($('#pStock').value),badge:$('#pBadge').value.trim(),productType:$('#pProductType').value,sizes:cleanSizes([...document.querySelectorAll('#pSizeOptions input:checked')].map(x=>x.value),$('#pProductType').value),colors:$('#pColors').value.split(',').map(x=>x.trim()).filter(Boolean),description:$('#pDescription').value.trim(),image,active:$('#pActive').checked,updatedAt:serverTimestamp()};if(!data.name||!Number.isFinite(data.price)||data.price<0||data.stock<0)throw Error('Données produit invalides');if(!PRODUCT_TYPE_LABELS[data.productType])throw Error('Choisissez un type de produit valide.');if(typeRequiresSize(data.productType)&&!data.sizes.length)throw Error('Cochez au moins une taille ou pointure disponible.');$('#uploadProgress').textContent='Enregistrement dans Firebase Realtime Database...';if(id)await updateDoc(doc(db,'products',id),data);else await addDoc(collection(db,'products'),{...data,createdAt:serverTimestamp()});closeProduct();toast('Produit enregistré');await load()}catch(err){const message=String(err?.message||readableError(err));const hint=/permission.denied|permission_denied|PERMISSION_DENIED/i.test(message)?' — Vérifiez admins/UID = admin et les règles products/.write dans Realtime Database.':'';toast('Sauvegarde impossible : '+message+hint);$('#uploadProgress').textContent='Erreur Firebase : '+message+hint;}finally{btn.disabled=false;btn.textContent='ENREGISTRER LE PRODUIT'}}
function orderLineItem(i){
  const product=products.find(p=>String(p.id)===String(i.productId||i.id));
  // Keep the photo captured at checkout even when the catalog product changes.
  const image=i.image||product?.image||imageFallback;
  const photo=typeof image==='string'&&(/^(https:\/\/|\/assets\/)/.test(image))?image:imageFallback;
  const size=String(i.size||'').trim(),color=String(i.color||'').trim();
  const quantity=Number(i.quantity||i.qty||1);
  return '<article class="admin-order-item">'+
    '<img src="'+safe(photo)+'" loading="lazy" alt="Photo de '+safe(i.name||product?.name||'produit')+'">'+
    '<div><strong>'+safe(i.name||product?.name||'Produit Sportifano')+'</strong>'+
    '<small>Réf. '+safe(String(i.productId||i.id||'—'))+'</small>'+
    '<p>'+safe(size?'Pointure / taille : '+size:'Sans taille')+(color?' · '+safe('Couleur : '+color):'')+'</p>'+
    '<b>Quantité : '+(Number.isSafeInteger(quantity)&&quantity>0?quantity:1)+' · '+money(i.price||0)+'</b></div></article>';
}
async function showOrder(id){
  const o=orders.find(x=>x.id===id);if(!o)return;
  const sheet=document.createElement('div');sheet.className='admin-order-overlay';sheet.setAttribute('role','dialog');
  sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','adminOrderTitle');
  sheet.innerHTML='<section class="admin-order-dialog">'+
    '<div class="admin-order-title"><div><small>COMMANDE SPORTIFANO</small><h2 id="adminOrderTitle">Commande #'+safe(id.slice(0,8))+'</h2></div><button type="button" data-close-order aria-label="Fermer les détails">✕</button></div>'+
    '<div class="admin-order-contact"><p><b>Client :</b> '+safe(o.name||'—')+'</p><p><b>Téléphone :</b> <a href="tel:'+safe(String(o.phone||'').replace(/[^+\d]/g,''))+'">'+safe(o.phone||'—')+'</a></p>'+
    '<p><b>Livraison :</b> '+safe([o.city,o.address].filter(Boolean).join(', ')||'—')+'</p>'+
    '<p><b>Note :</b> '+safe(o.note||'—')+'</p></div>'+
    '<h3>Produits commandés</h3><div class="admin-order-items">'+
    (Array.isArray(o.items)&&o.items.length?o.items.map(orderLineItem).join(''):'<p>Aucun détail produit disponible.</p>')+
    '</div><div class="admin-order-total"><strong>Total : '+money(o.total)+'</strong><span>Paiement à la livraison</span></div>'+
    '<form class="admin-order-status"><label>Statut de la commande<select name="status">'+
    Object.entries(statuses).map(([value,label])=>'<option value="'+safe(value)+'" '+(o.status===value?'selected':'')+'>'+safe(label)+'</option>').join('')+
    '</select></label><button type="submit" class="btn btn-dark">Enregistrer le statut</button><p role="alert" class="error-text"></p></form></section>';
  const close=()=>{sheet.remove();document.removeEventListener('keydown',escapeKey);};
  const escapeKey=e=>{if(e.key==='Escape')close()};
  sheet.querySelector('[data-close-order]').onclick=close;
  sheet.addEventListener('click',e=>{if(e.target===sheet)close()});
  document.addEventListener('keydown',escapeKey);
  document.body.append(sheet);sheet.querySelector('[data-close-order]').focus();
  sheet.querySelector('form').onsubmit=async e=>{
    e.preventDefault();
    const status=String(new FormData(e.currentTarget).get('status')||'');
    if(!Object.hasOwn(statuses,status))return;
    const btn=e.currentTarget.querySelector('button[type="submit"]'),err=e.currentTarget.querySelector('[role="alert"]');
    btn.disabled=true;err.textContent='';
    try{
      await updateDoc(doc(db,'orders',id),{status,updatedAt:serverTimestamp()});
      close();toast('Statut de la commande mis à jour');await load();
    }catch(error){err.textContent=readableError(error);btn.disabled=false;}
  };
}
$('#adminLogin').onsubmit=async e=>{e.preventDefault();$('#loginError').textContent='';if(!configured)return $('#loginError').textContent='Configurez d’abord firebase.js';try{await signInWithEmailAndPassword(auth,$('#adminEmail').value,$('#adminPassword').value)}catch(err){$('#loginError').textContent=readableError(err)}};
if(configured)onAuthStateChanged(auth,async u=>{user=u;isAdmin=false;if(!u){$('#loginScreen').classList.remove('hidden');$('#adminApp').classList.add('hidden');return}try{let d=await getDoc(doc(db,'admins',u.uid));if(!d.exists() || d.data()!=='admin'){await signOut(auth);$('#loginError').textContent='Accès refusé. Le champ admins/UID doit valoir admin dans Realtime Database.';return}isAdmin=true;$('#adminIdentity').textContent=u.email;$('#loginScreen').classList.add('hidden');$('#adminApp').classList.remove('hidden');await load()}catch(err){$('#loginError').textContent=readableError(err);await signOut(auth)}});
$('#logoutBtn').onclick=()=>signOut(auth);$('#sideToggle').onclick=()=>$('.admin-sidebar').classList.toggle('open');document.querySelectorAll('#adminNav [data-tab]').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>showTab(b.dataset.goto));$('#refreshBtn').onclick=load;$('#newProductBtn').onclick=()=>openProduct();$('#adminModalClose').onclick=closeProduct;$('#productForm').onsubmit=saveProduct;$('#adminProductSearch').oninput=renderProducts;$('#orderFilter').onchange=renderOrders;
$('#adminProducts').onclick=async e=>{const copy=e.target.closest('[data-copy-product]');if(copy){const p=products.find(x=>x.id===copy.dataset.copyProduct);if(!p)return;const listing=await fetch('/catalogue.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);const published=Array.isArray(listing?.products)&&listing.products.some(x=>String(x.id)===String(p.id));const url='https://www.sportifano.com'+(published?'/produits/'+encodeURIComponent(String(p.id))+'/':'/?product='+encodeURIComponent(String(p.id)));try{await navigator.clipboard.writeText(url);toast('Lien publicité copié : '+url)}catch{prompt('Copiez le lien produit pour Facebook Ads :',url)}return;}let b=e.target.closest('[data-edit],[data-delete]');if(!b)return;if(b.dataset.edit)return openProduct(b.dataset.edit);if(!confirm('Supprimer définitivement ce produit ?'))return;try{await deleteDoc(doc(db,'products',b.dataset.delete));toast('Produit supprimé');await load()}catch(err){toast(readableError(err))}};
function orderClick(e){let b=e.target.closest('[data-order]');if(b)showOrder(b.dataset.order)}$('#adminOrders').onclick=orderClick;$('#recentOrders').onclick=orderClick;
$('#categoryForm').onsubmit=async e=>{e.preventDefault();let name=$('#categoryName').value.trim();if(!name)return;if(categories.some(c=>c.name.toLowerCase()===name.toLowerCase()))return toast('Catégorie déjà existante');try{await addDoc(collection(db,'categories'),{name,createdAt:serverTimestamp()});$('#categoryName').value='';toast('Catégorie ajoutée');await load()}catch(err){toast(readableError(err))}};
$('#adminCategories').onclick=async e=>{let b=e.target.closest('[data-delete-category]');if(!b||!confirm('Supprimer cette catégorie ?'))return;try{await deleteDoc(doc(db,'categories',b.dataset.deleteCategory));await load()}catch(err){toast(readableError(err))}};
$('#settingsForm').onsubmit=async e=>{e.preventDefault();let data={name:$('#settingName').value.trim(),phone:$('#settingPhone').value.trim(),instagram:$('#settingInstagram').value.trim(),metaPixelId:$('#settingMetaPixel').value.trim(),deliveryFee:Number($('#settingDelivery').value)||0,coverImage:settings.coverImage||'',updatedAt:serverTimestamp()};try{if(data.metaPixelId&&!/^\d{12,20}$/.test(data.metaPixelId))throw Error('Meta Pixel ID invalide. Utilisez uniquement 12 à 20 chiffres.');if($('#coverFile').files[0]){data.coverImage=await uploadImage($('#coverFile').files[0],'covers',$('#coverProgress'));}await setDoc(doc(db,'settings','store'),data);toast('Paramètres sauvegardés');await load()}catch(err){toast(readableError(err));$('#coverProgress').textContent='Erreur : '+(err.message||readableError(err))}};

$('#importDemoBtn').onclick=async()=>{if(products.length&&!confirm('Ajouter les 8 articles de démonstration en plus des produits existants ?'))return;let b=$('#importDemoBtn');b.disabled=true;try{for(const p of demoProducts){let {id,...data}=p;await addDoc(collection(db,'products'),{...data,description:'Sportifano collection',createdAt:serverTimestamp()})}toast('8 produits de démonstration importés');await load()}catch(e){toast(readableError(e))}finally{b.disabled=false}};

$('#pFile').addEventListener('change',()=>choosePreview($('#pFile'),$('#productPreview')));
$('#coverFile').addEventListener('change',()=>choosePreview($('#coverFile'),$('#coverPreview')));
$('#removeCoverBtn').addEventListener('click',async()=>{if(!confirm('Revenir à la couverture par défaut ?'))return;try{await updateDoc(doc(db,'settings','store'),{coverImage:'',updatedAt:serverTimestamp()});$('#coverFile').value='';await load();toast('Couverture réinitialisée')}catch(e){toast(readableError(e))}});
