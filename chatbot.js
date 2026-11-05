/* Sportifano multilingual shopping assistant — no secret/API key required. */
(() => {
  'use strict';
  if (window.__sportifanoAssistant) return;
  window.__sportifanoAssistant = true;
  const root = document.createElement('div');
  root.id = 'sf-assistant';
  document.body.append(root);
  const state = {lang:'fr', catalog:[], settings:{}, open:false, loaded:false, history:[], recognizer:null};
  const i18n = {
    fr:{hello:'Bonjour 👋 Bienvenue chez Sportifano ! Je peux vous aider à trouver un article, une taille ou un prix.',prompt:'Posez votre question…',send:'Envoyer',label:'Assistant Sportifano',online:'Votre assistant shopping',start:['Voir les produits','Livraison','Paiement','Contact'],noProducts:'Je ne trouve pas de produit correspondant dans le catalogue. Essayez une autre catégorie ou consultez notre collection.',unknown:'Je peux vous aider avec les produits, les prix, les tailles, la livraison, le paiement et le contact. Que cherchez-vous ?',products:'Voici une sélection de notre boutique :',size:'Les tailles disponibles dépendent du modèle. Indiquez le produit qui vous intéresse, ou ouvrez sa fiche pour vérifier les tailles.',delivery:'Nous livrons en Tunisie. Les frais exacts sont indiqués lors de la commande. Le délai dépend de votre adresse et reste à confirmer avec la boutique.',payment:'Le paiement s’effectue à la livraison. Pas de paiement en ligne sur le site.',contact:'Pour joindre notre équipe, consultez notre page de contact.',stock:'Le stock peut changer. Vérifiez la fiche du produit et confirmez la disponibilité lors de la commande.',order:'Pour commander : choisissez un produit, sélectionnez les options, ajoutez-le au panier puis passez commande avec votre compte.',price:'Dites-moi le type d’article ou votre budget (ex. « chaussures moins de 150 DT ») pour voir les prix.',welcome:'Bonjour ! Dites-moi ce que vous cherchez 😊',more:'Voir le produit',catalogue:'Toute la collection',contactLink:'Nous contacter',shippingLink:'Livraison et paiement',empty:'Le catalogue est temporairement indisponible. Vous pouvez consulter la boutique ou contacter notre équipe.',thinking:'Je regarde…',voice:'Dicter un message',close:'Fermer',open:'Discuter avec nous',new:'Nouvelle discussion',privacy:'Ne partagez pas vos mots de passe ni vos données bancaires.',unknownStock:'Stock à confirmer',out:'Rupture de stock',available:'Disponible (à confirmer)',clear:'Discussion réinitialisée.',noVoice:'La dictée vocale n’est pas disponible sur ce navigateur.'},
    ar:{hello:'أهلاً وسهلاً 👋 مرحباً بكم في سبورتيفانو! أساعدكم في العثور على المنتجات والمقاسات والأسعار.',prompt:'اكتب سؤالك هنا…',send:'إرسال',label:'مساعد سبورتيفانو',online:'مساعد التسوق',start:['المنتجات','التوصيل','الدفع','اتصل بنا'],noProducts:'لم أجد منتجاً مطابقاً في المتجر. جرب نوعاً آخر أو تصفح المجموعة.',unknown:'يمكنني مساعدتك في المنتجات والأسعار والمقاسات والتوصيل والدفع والاتصال. ماذا تبحث عنه؟',products:'إليك بعض المنتجات المتوفرة في المتجر:',size:'المقاسات تختلف حسب المنتج. اذكر اسم المنتج أو افتح صفحته للتأكد من المقاسات.',delivery:'نوفر التوصيل داخل تونس. تظهر المصاريف عند الطلب، ويتم تأكيد مدة التوصيل حسب العنوان.',payment:'الدفع عند الاستلام. الدفع الإلكتروني غير متاح حالياً على الموقع.',contact:'يمكنك التواصل مع فريقنا من صفحة الاتصال.',stock:'المخزون قابل للتغيير. تأكد من صفحة المنتج عند الطلب.',order:'للطلب: اختر المنتج والمقاس، أضفه للسلة، ثم أكمل الطلب من حسابك.',price:'ما نوع المنتج وميزانيتك؟ مثلاً: أحذية أقل من 150 دينار.',welcome:'أهلاً! ماذا تبحث عنه؟ 😊',more:'عرض المنتج',catalogue:'جميع المنتجات',contactLink:'الاتصال بنا',shippingLink:'التوصيل والدفع',empty:'لا يمكن تحميل المنتجات حالياً. يرجى تصفح المتجر أو التواصل معنا.',thinking:'لحظة…',voice:'إملاء صوتي',close:'إغلاق',open:'تحدث معنا',new:'محادثة جديدة',privacy:'لا تشارك كلمة السر أو معلوماتك البنكية.',unknownStock:'التوفر غير مؤكد',out:'نفد المخزون',available:'متوفر (يرجى التأكيد)',clear:'بدأنا محادثة جديدة.',noVoice:'الإملاء الصوتي غير متاح في هذا المتصفح.'},
    tn:{hello:'عسلامة 👋 مرحبا بيك في Sportifano! شنوّة تحب تلقى؟ سبادري، دبش سبور، مقاسات ولا أسعار؟',prompt:'اسألني بالتونسي…',send:'ابعث',label:'مساعد Sportifano',online:'معاك في الشوبينغ',start:['ورّيني البرودويات','الليڥريزون','كيفاش نخلّص؟','نحب نتّصل'],noProducts:'ما لقيتش البرودوي اللي تحوّس عليه في الكاتالوغ. جرّب حاجة أخرى ولا شوف الكوليكسيون.',unknown:'ننجم نعاونك في البرودويات، السوام، المقاسات، الليڥريزون، الخلاص والكونتاكت. شنوّة يلزمك؟',products:'هاذم شوية برودويات من عندنا:',size:'المقاسات تتبدّل حسب المودال. قلّي شنوة البرودوي ولا حلّ صفحتو باش تتأكد.',delivery:'نوصلولك لوين ما كنت في تونس. معلوم الليڥريزون يبان وقت الكوموند، والمدة نأكّدوهالك حسب البلاصة.',payment:'تخلّص كي توصلك الكوموند، ما فماش خلاص أونلاين توّة.',contact:'تنجم تتّصل بينا من صفحة الكونتاكت.',stock:'الستوك ينجم يتبدّل. تثبّت في صفحة البرودوي وقت الكوموند.',order:'اختار البرودوي والمقاس، حطّو في البانيي وكمّل الكوموند بحسابك.',price:'قلّي شنوة تحب وقدّاش البودجي متاعك. مثال: سبادري أقل من 150 دينار.',welcome:'عسلامة! شنوّة تحب تلقى؟ 😊',more:'شوف البرودوي',catalogue:'شوف الكوليكسيون',contactLink:'كلّمنا',shippingLink:'الليڥريزون والخلاص',empty:'الكاتالوغ موش متاح توّة. تنجم تشوف السايت ولا تتّصل بينا.',thinking:'نشوفلك…',voice:'احكي بالصوت',close:'سكّر',open:'اسألنا',new:'محادثة جديدة',privacy:'ما تبعثش الموط دو باس ولا معلومات بنكية.',unknownStock:'الستوك موش مؤكّد',out:'الستوك وفى',available:'موجود (يلزم التأكيد)',clear:'بدّينا محادثة جديدة.',noVoice:'الكتابة بالصوت موش متاحة في المتصفح هذا.'}
  };
  const dictionary = {
    product:['produit','produits','article','articles','collection','catalogue','show','montre','cherche','avoir','sport','برودوي','برودويات','المنتجات','منتجات','اعرض','وريني','ورّيني','نحب نشوف','chouf','produit','produits','product','produit','collection','kateloug'],
    shoe:['chaussure','chaussures','basket','baskets','sneaker','sneakers','running','shoes','سبادري','سبابط','حذاء','أحذية','صباط','sabbat','sbedri','sbabri','sneakers'],
    man:['homme','hommes','men','رجال','رجالي','راجل','للرجال','rjel','rajeli'],
    woman:['femme','femmes','women','نسائي','نساء','بنات','مرا','للبنات','bnet','nsa','femme'],
    accessory:['accessoire','accessoires','sac','sacs','bag','حقيبة','اكسسوارات','أكسسوارات','ساك','sac'],
    price:['prix','combien','coûte','coute','budget','dt','dinar','dinars','tnd','قداش','قدّاش','السعر','سعر','دينار','بقداش','souma','soum','9adech','9addech','9adach','prix'],
    size:['taille','tailles','pointure','mesure','size','مقاس','المقاس','قياس','قياسات','taille','9yas'],
    delivery:['livraison','livrer','livrez','délai','delai','expédition','delivery','توصيل','التوصيل','توصّل','ليڥريزون','livraison','livrison','tawsil','livry'],
    payment:['paiement','payer','paiement à la livraison','cash','payment','الدفع','نخلص','خلاص','تخلص','كيفاش نخلص','nkhaless','nkhalas','khalass'],
    contact:['contact','téléphone','telephone','numéro','numero','instagram','appeler','واتساب','رقم','اتصل','نتصل','نكلّم','noumrou','numrou','contacter'],
    stock:['stock','disponible','disponibilité','dispo','reste','المخزون','متوفر','موجود','ستوك','stock','mawjoud'],
    order:['commande','commander','panier','acheter','achat','order','طلب','نطلب','كوموند','commandi','panier','ncommandi','nekhou']
  };
  const tidy = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}\s.]/gu,' ').replace(/\s+/g,' ').trim();
  const has = (text, group) => dictionary[group].some(word => tidy(text).includes(tidy(word)));
  function language(input) {
    const s = String(input || '');
    if (/[؀-ۿ]/u.test(s)) return /(?:شنوه|شنوة|قداش|برودوي|سبادري|نحب|تنج|كوموند|عسلامة|توّه|توّة|ليڥريزون|باهي)/u.test(s) ? 'tn' : 'ar';
    if (/\b(?:chnowa|chneya|nheb|9adech|9addech|9adach|kifech|fama|tawa|sbedri|sbabri|barcha|bech|livrison|noumrou|khalas|najem)\b/i.test(s)) return 'tn';
    return 'fr';
  }
  const tr = () => i18n[state.lang];
  function node(tag, cls, value) { const el = document.createElement(tag); if(cls)el.className = cls; if(value !== undefined)el.textContent=value; return el; }
  const button = (text, click, cls='') => { const el = node('button',cls,text); el.type='button'; if(typeof click==='function')el.addEventListener('click',click); return el; };
  const link = (text, href, cls) => { const el=node('a',cls,text); el.href=href; return el; };
  function formatPrice(n){return Number(n).toLocaleString('fr-TN',{maximumFractionDigits:3})+' DT';}
  function productUrl(p){if(!p.id)return '/#catalogue'; return '/produits/'+encodeURIComponent(String(p.id))+'/';}
  function priceValid(p){return (typeof p.price==='number'||typeof p.price==='string')&&String(p.price).trim()!==''&&Number.isFinite(Number(p.price))&&Number(p.price)>=0;}
  function stock(p){if(p.stock==null||String(p.stock).trim()===''||!Number.isFinite(Number(p.stock)))return tr().unknownStock;return Number(p.stock)>0?tr().available:tr().out;}
  function productCard(p) {
    const card=node('a','sf-chat-product');card.href=productUrl(p);
    const pic=node('div','sf-chat-product-image');
    if(typeof p.image==='string'&&/^https:\/\//i.test(p.image)) {const img=node('img');img.src=p.image;img.alt='';img.loading='lazy';pic.append(img);}
    else pic.textContent='SPORTIFANO';
    const body=node('div','sf-chat-product-body');body.append(node('strong','',p.name||'Sportifano'));
    body.append(node('small','',String(p.category||'')+' · '+stock(p)));
    body.append(node('span','sf-chat-product-price',priceValid(p)?formatPrice(p.price):tr().unknownStock));
    card.append(pic,body);return card;
  }
  function addMessage(text, role='bot', products=[]) {
    const wrap=node('div','sf-chat-msg '+role);
    if(role==='bot')wrap.append(node('span','sf-chat-avatar','S'));
    const content=node('div','sf-chat-msg-content');
    const bubble=node('div','sf-chat-bubble',text);content.append(bubble);
    if(products.length){const cards=node('div','sf-chat-cards');products.forEach(p=>cards.append(productCard(p)));content.append(cards);}
    wrap.append(content);messages.append(wrap);messages.scrollTop=messages.scrollHeight;
    state.history.push({text,role});
  }
  const trigger=button('✦','', 'sf-chat-trigger');
  trigger.setAttribute('aria-label','Ouvrir l’assistant Sportifano');
  trigger.innerHTML='<span class="sf-chat-trigger-symbol">✦</span><span class="sf-chat-trigger-text">Besoin d’aide ?</span>';
  const panel=node('section','sf-chat-panel');panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Assistant Sportifano');
  const header=node('div','sf-chat-header');
  const logo=node('div','sf-chat-logo','S');
  const heading=node('div','sf-chat-heading');heading.append(node('strong','', 'SPORTIFANO'),node('small','sf-chat-online',i18n.fr.online));
  const headerClose=button('×',()=>toggle(false),'sf-chat-close');headerClose.setAttribute('aria-label','Fermer');
  header.append(logo,heading,headerClose);
  const tools=node('div','sf-chat-tools');
  const languages=node('div','sf-chat-languages');
  for(const [code,label] of [['fr','FR'],['ar','العربية'],['tn','تونسي']]) {
    const b=button(label,()=>setLanguage(code),'sf-chat-lang');b.dataset.lang=code;languages.append(b);
  }
  tools.append(languages,button('↻',()=>reset(),'sf-chat-reset'));
  tools.lastChild.title='Nouvelle discussion';
  const messages=node('div','sf-chat-messages');messages.setAttribute('aria-live','polite');
  const suggestions=node('div','sf-chat-suggestions');
  const form=node('form','sf-chat-form');
  const input=node('input','sf-chat-input');input.type='text';input.maxLength=280;input.autocomplete='off';input.required=true;input.placeholder=i18n.fr.prompt;input.setAttribute('aria-label','Votre question');
  const voice=button('🎙',startVoice,'sf-chat-voice');voice.title='Dictée vocale';
  const submit=node('button','sf-chat-submit','➤');submit.type='submit';submit.setAttribute('aria-label','Envoyer');
  form.append(voice,input,submit);
  const privacy=node('div','sf-chat-privacy',i18n.fr.privacy);
  panel.append(header,tools,messages,suggestions,form,privacy);
  root.append(trigger,panel);
  function showSuggestions(){suggestions.replaceChildren();tr().start.forEach(question=>suggestions.append(button(question,()=>send(question),'sf-chat-chip')));}
  function setLanguage(code){state.lang=code;panel.dir=code==='fr'?'ltr':'rtl';input.placeholder=tr().prompt;submit.setAttribute('aria-label',tr().send);voice.title=tr().voice;headerClose.setAttribute('aria-label',tr().close);privacy.textContent=tr().privacy;heading.lastChild.textContent=tr().online;root.querySelectorAll('.sf-chat-lang').forEach(el=>el.classList.toggle('active',el.dataset.lang===code));showSuggestions();try{sessionStorage.setItem('sf_chat_lang',code);}catch{}}
  function toggle(open){state.open=open;panel.hidden=!open;trigger.setAttribute('aria-expanded',String(open));if(open){if(!state.history.length)addMessage(tr().hello);input.focus();}}
  function reset(){state.history=[];messages.replaceChildren();addMessage(tr().hello);showSuggestions();}
  function rank(text, category) {
    let q=tidy(text);const budget=q.match(/(?:moins de|inferieur|under|اقل من|تحت|اقل|moins|<|budget|بودجي|maximum|max)\s*(\d{2,5})/i);
    const max=budget?Number(budget[1]):null;
    const requestedSize=q.match(/(?:taille|pointure|size|مقاس|قياس|9yas)\s*(\d{2,3}|xs|s|m|l|xl|xxl)\b/i);
    let words=q.split(' ').filter(w=>w.length>2&&!['prix','produit','collection','chouf','nheb','barcha','pour','moins','avec','article','sportifano','cherche','show','اريد','نحب','شوف'].includes(w));
    const matches=state.catalog.filter(p=>{
      if(p.active===false||!p.name)return false;
      if(category && !tidy(p.category).includes(tidy(category)))return false;
      if(max!==null && (!priceValid(p)||Number(p.price)>max))return false;
      if(requestedSize && !String(Array.isArray(p.sizes)?p.sizes.join(' '):p.sizes||'').toLowerCase().split(/[\s,]+/).includes(requestedSize[1].toLowerCase()))return false;
      return true;
    }).map(p=>{
      const hay=tidy([p.name,p.category,p.description,p.colors?.join?.(' '),p.sizes?.join?.(' ')].join(' '));
      const score=words.reduce((acc,w)=>acc+(hay.includes(w)?3:0),0)+(hay.includes(q)?7:0);
      return {p,score};
    }).sort((a,b)=>b.score-a.score);
    const qualified=matches.some(x=>x.score>0);
    return (qualified?matches.filter(x=>x.score>0):matches).slice(0,4).map(x=>x.p);
  }
  function matchCategory(text) {
    if(has(text,'shoe'))return 'Chaussures';
    if(has(text,'man'))return 'Homme';
    if(has(text,'woman'))return 'Femme';
    if(has(text,'accessory'))return 'Accessoires';
    return null;
  }
  function answer(text){
    const t=tr();const category=matchCategory(text);
    const possibleProduct=state.catalog.find(p=>tidy(text).includes(tidy(p.name))&&tidy(p.name).length>3);
    if(has(text,'delivery'))return {text:t.delivery,link:['/livraison/',t.shippingLink]};
    if(has(text,'payment'))return {text:t.payment,link:['/livraison/',t.shippingLink]};
    if(has(text,'contact'))return {text:t.contact,link:['/contact/',t.contactLink]};
    if(has(text,'order'))return {text:t.order,link:['/#catalogue',t.catalogue]};
    if(has(text,'stock')&&!category&&!possibleProduct)return {text:t.stock};
    if(has(text,'size')&&!category&&!possibleProduct)return {text:t.size};
    if(has(text,'price')&&!category&&!possibleProduct&&!/\d{2,5}/.test(text))return {text:t.price};
    const wantsProducts=category||possibleProduct||has(text,'product')||has(text,'price')||has(text,'size')||has(text,'stock')||/\b\d{2,5}\s*(?:dt|tnd|dinars?)\b/i.test(text);
    if(wantsProducts) {
      if(!state.loaded)return {text:t.empty,link:['/#catalogue',t.catalogue]};
      let products=possibleProduct?[possibleProduct]:rank(text,category);
      if(!products.length)return {text:t.noProducts,link:['/#catalogue',t.catalogue]};
      const introduction=has(text,'size')?t.size:has(text,'stock')?t.stock:t.products;
      return {text:introduction,products,link:['/#catalogue',t.catalogue]};
    }
    return {text:t.unknown,link:['/#catalogue',t.catalogue]};
  }
  function send(value){
    const text=String(value||'').trim().slice(0,280);
    if(!text)return;
    input.value='';
    const detected=language(text);
    // Automatically follow the language of the visitor's message, with manual selection available.
    setLanguage(detected);
    addMessage(text,'user');
    const response=answer(text);
    addMessage(response.text,'bot',response.products||[]);
    if(response.link){const last=messages.lastChild.querySelector('.sf-chat-msg-content');last.append(link(response.link[1],response.link[0],'sf-chat-action'));}
    suggestions.replaceChildren();
  }
  function startVoice(){
    const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Speech){addMessage(tr().noVoice);return;}
    try {
      if(state.recognizer){state.recognizer.stop();state.recognizer=null;return;}
      const rec=new Speech();state.recognizer=rec;rec.lang=state.lang==='fr'?'fr-FR':'ar-TN';rec.interimResults=false;rec.maxAlternatives=1;
      rec.onresult=e=>{input.value=e.results[0][0].transcript;input.focus();};
      rec.onend=()=>{state.recognizer=null;voice.classList.remove('listening');};
      rec.onerror=()=>{state.recognizer=null;voice.classList.remove('listening');};
      voice.classList.add('listening');rec.start();
    }catch{state.recognizer=null;voice.classList.remove('listening');}
  }
  async function loadCatalog(){
    // The static generated catalog is the safe fallback; live public RTDB may be fresher.
    try {
      const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),5000);
      let response;
      try{response=await fetch('/catalogue.json',{signal:controller.signal,cache:'no-store'});}finally{clearTimeout(timeout);}
      if(response.ok){const data=await response.json();if(Array.isArray(data.products)){state.catalog=data.products.filter(p=>p&&p.active!==false&&typeof p.name==='string');state.settings=data.settings||{};state.loaded=true;}}
    } catch {}
    try {
      const {db}=await import('/firebase.js');
      const {collection,getDocs,getDoc,doc}=await import('/database-api.js');
      const withTimeout=p=>Promise.race([p,new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),4500))]);
      const [productsResult,settingsResult]=await Promise.allSettled([withTimeout(getDocs(collection(db,'products'))),withTimeout(getDoc(doc(db,'settings','store')))]);
      if(productsResult.status==='fulfilled'){state.catalog=productsResult.value.docs.map(d=>({ ...d.data(),id:d.id })).filter(p=>p.active!==false&&typeof p.name==='string');state.loaded=true;}
      if(settingsResult.status==='fulfilled'&&settingsResult.value.exists())state.settings=settingsResult.value.data();
    } catch {}
  }
  trigger.addEventListener('click',()=>toggle(!state.open));
  form.addEventListener('submit',e=>{e.preventDefault();send(input.value);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.open)toggle(false);});
  try {const saved=sessionStorage.getItem('sf_chat_lang');if(i18n[saved])state.lang=saved;}catch{}
  setLanguage(state.lang);
  showSuggestions();
  loadCatalog();
})();
