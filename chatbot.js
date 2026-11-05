/* Sportifano multilingual shopping assistant — no secret/API key required. */
(() => {
  'use strict';
  if (window.__sportifanoAssistant) return;
  window.__sportifanoAssistant = true;
  const root = document.createElement('div');
  root.id = 'sf-assistant';
  document.body.append(root);
  const state = {lang:'tn', catalog:[], settings:{}, open:false, loaded:false, history:[], recognizer:null};
  const i18n = {
    fr:{hello:'Bonjour 👋 Bienvenue chez Sportifano ! Je peux vous aider à trouver un article, une taille ou un prix.',prompt:'Posez votre question…',send:'Envoyer',label:'Assistant Sportifano',online:'Votre assistant shopping',start:['Voir les produits','Livraison','Paiement','Contact'],noProducts:'Je ne trouve pas de produit correspondant dans le catalogue. Essayez une autre catégorie ou consultez notre collection.',unknown:'Je peux vous aider avec les produits, les prix, les tailles, la livraison, le paiement et le contact. Que cherchez-vous ?',products:'Voici une sélection de notre boutique :',size:'Les tailles disponibles dépendent du modèle. Indiquez le produit qui vous intéresse, ou ouvrez sa fiche pour vérifier les tailles.',delivery:'Nous livrons en Tunisie. Les frais exacts sont indiqués lors de la commande. Le délai dépend de votre adresse et reste à confirmer avec la boutique.',payment:'Le paiement s’effectue à la livraison. Pas de paiement en ligne sur le site.',contact:'Pour joindre notre équipe, consultez notre page de contact.',stock:'Le stock peut changer. Vérifiez la fiche du produit et confirmez la disponibilité lors de la commande.',order:'Pour commander : choisissez un produit, sélectionnez les options, ajoutez-le au panier puis passez commande avec votre compte.',price:'Dites-moi le type d’article ou votre budget (ex. « chaussures moins de 150 DT ») pour voir les prix.',welcome:'Bonjour ! Dites-moi ce que vous cherchez 😊',more:'Voir le produit',catalogue:'Toute la collection',contactLink:'Nous contacter',shippingLink:'Livraison et paiement',empty:'Le catalogue est temporairement indisponible. Vous pouvez consulter la boutique ou contacter notre équipe.',thinking:'Je regarde…',voice:'Dicter un message',close:'Fermer',open:'Discuter avec nous',new:'Nouvelle discussion',privacy:'Ne partagez pas vos mots de passe ni vos données bancaires.',unknownStock:'Stock à confirmer',out:'Rupture de stock',available:'Disponible (à confirmer)',clear:'Discussion réinitialisée.',noVoice:'La dictée vocale n’est pas disponible sur ce navigateur.'},
    ar:{hello:'أهلاً وسهلاً 👋 مرحباً بكم في سبورتيفانو! أساعدكم في العثور على المنتجات والمقاسات والأسعار.',prompt:'اكتب سؤالك هنا…',send:'إرسال',label:'مساعد سبورتيفانو',online:'مساعد التسوق',start:['المنتجات','التوصيل','الدفع','اتصل بنا'],noProducts:'لم أجد منتجاً مطابقاً في المتجر. جرب نوعاً آخر أو تصفح المجموعة.',unknown:'يمكنني مساعدتك في المنتجات والأسعار والمقاسات والتوصيل والدفع والاتصال. ماذا تبحث عنه؟',products:'إليك بعض المنتجات المتوفرة في المتجر:',size:'المقاسات تختلف حسب المنتج. اذكر اسم المنتج أو افتح صفحته للتأكد من المقاسات.',delivery:'نوفر التوصيل داخل تونس. تظهر المصاريف عند الطلب، ويتم تأكيد مدة التوصيل حسب العنوان.',payment:'الدفع عند الاستلام. الدفع الإلكتروني غير متاح حالياً على الموقع.',contact:'يمكنك التواصل مع فريقنا من صفحة الاتصال.',stock:'المخزون قابل للتغيير. تأكد من صفحة المنتج عند الطلب.',order:'للطلب: اختر المنتج والمقاس، أضفه للسلة، ثم أكمل الطلب من حسابك.',price:'ما نوع المنتج وميزانيتك؟ مثلاً: أحذية أقل من 150 دينار.',welcome:'أهلاً! ماذا تبحث عنه؟ 😊',more:'عرض المنتج',catalogue:'جميع المنتجات',contactLink:'الاتصال بنا',shippingLink:'التوصيل والدفع',empty:'لا يمكن تحميل المنتجات حالياً. يرجى تصفح المتجر أو التواصل معنا.',thinking:'لحظة…',voice:'إملاء صوتي',close:'إغلاق',open:'تحدث معنا',new:'محادثة جديدة',privacy:'لا تشارك كلمة السر أو معلوماتك البنكية.',unknownStock:'التوفر غير مؤكد',out:'نفد المخزون',available:'متوفر (يرجى التأكيد)',clear:'بدأنا محادثة جديدة.',noVoice:'الإملاء الصوتي غير متاح في هذا المتصفح.'},
    tn:{hello:'عسلامة 👋 مرحبا بيك في Sportifano! شنوّة تحب تلقى؟ سبادري، دبش سبور، مقاسات ولا أسعار؟',prompt:'اسألني بالتونسي…',send:'ابعث',label:'مساعد Sportifano',online:'معاك في الشوبينغ',start:['ورّيني البرودويات','الليڥريزون','كيفاش نخلّص؟','نحب نتّصل'],noProducts:'ما لقيتش البرودوي اللي تحوّس عليه في الكاتالوغ. جرّب حاجة أخرى ولا شوف الكوليكسيون.',unknown:'ننجم نعاونك في البرودويات، السوام، المقاسات، الليڥريزون، الخلاص والكونتاكت. شنوّة يلزمك؟',products:'هاذم شوية برودويات من عندنا:',size:'المقاسات تتبدّل حسب المودال. قلّي شنوة البرودوي ولا حلّ صفحتو باش تتأكد.',delivery:'نوصلولك لوين ما كنت في تونس. معلوم الليڥريزون يبان وقت الكوموند، والمدة نأكّدوهالك حسب البلاصة.',payment:'تخلّص كي توصلك الكوموند، ما فماش خلاص أونلاين توّة.',contact:'تنجم تتّصل بينا من صفحة الكونتاكت.',stock:'الستوك ينجم يتبدّل. تثبّت في صفحة البرودوي وقت الكوموند.',order:'اختار البرودوي والمقاس، حطّو في البانيي وكمّل الكوموند بحسابك.',price:'قلّي شنوة تحب وقدّاش البودجي متاعك. مثال: سبادري أقل من 150 دينار.',welcome:'عسلامة! شنوّة تحب تلقى؟ 😊',more:'شوف البرودوي',catalogue:'شوف الكوليكسيون',contactLink:'كلّمنا',shippingLink:'الليڥريزون والخلاص',empty:'الكاتالوغ موش متاح توّة. تنجم تشوف السايت ولا تتّصل بينا.',thinking:'نشوفلك…',voice:'احكي بالصوت',close:'سكّر',open:'اسألنا',new:'محادثة جديدة',privacy:'ما تبعثش الموط دو باس ولا معلومات بنكية.',unknownStock:'الستوك موش مؤكّد',out:'الستوك وفى',available:'موجود (يلزم التأكيد)',clear:'بدّينا محادثة جديدة.',noVoice:'الكتابة بالصوت موش متاحة في المتصفح هذا.'}
  };
  const NLP=window.SportifanoChatNLP;
  if(!NLP){console.error('Sportifano chatbot language module missing');return;}
  const tidy=NLP.norm;
  const language=(text)=>NLP.language(text,state.lang);
  // All replies are templates grounded in the live store, not a generative AI model.
  const extras={
    fr:{
      greeting:'Bonjour 👋 Comment allez-vous ? Je suis là pour vous aider. Vous cherchez des crampons, des demi-crampons ou autre chose ?',
      orderLogin:'Pour protéger vos données, connectez-vous à votre compte Sportifano afin de consulter vos commandes. Ne partagez pas votre mot de passe ici.',
      orderEmpty:'Aucune commande retrouvée dans votre compte pour le moment.',
      orderFailed:'Impossible de consulter vos commandes actuellement. Réessayez dans votre espace client.',
      orderHeader:'Voici les dernières commandes associées à votre compte :',
      loginButton:'Se connecter / Mon compte',
      detailsHeader:'Voici les détails du produit :',
      sizesLabel:'Tailles',colorsLabel:'Couleurs',descriptionLabel:'Description',priceLabel:'Prix',
      unknownSize:'À confirmer sur la fiche produit',unknownDetails:'Consultez la fiche produit pour plus d’informations.',
      orderStatus:{pending:'En attente de confirmation',confirmed:'Confirmée',shipped:'Expédiée',delivered:'Livrée',cancelled:'Annulée'}
    },
    ar:{
      greeting:'مرحباً بكم 👋 كيف يمكنني مساعدتكم؟ هل تبحثون عن أحذية كرة القدم أو نوع آخر من المنتجات؟',
      orderLogin:'لحماية بياناتك، يرجى الدخول إلى حسابك في سبورتيفانو لمتابعة طلباتك. لا تكتب كلمة السر هنا.',
      orderEmpty:'لا توجد طلبات مرتبطة بحسابك حالياً.',
      orderFailed:'تعذّر عرض الطلبات الآن. يرجى المحاولة من حسابك.',
      orderHeader:'هذه آخر الطلبات المسجّلة في حسابك:',
      loginButton:'الدخول إلى حسابي',
      detailsHeader:'إليك معلومات المنتج:',
      sizesLabel:'المقاسات',colorsLabel:'الألوان',descriptionLabel:'الوصف',priceLabel:'السعر',
      unknownSize:'يجب التأكد من صفحة المنتج',unknownDetails:'يمكنك زيارة صفحة المنتج لمزيد من التفاصيل.',
      orderStatus:{pending:'في انتظار التأكيد',confirmed:'تم التأكيد',shipped:'قيد التوصيل',delivered:'تم التسليم',cancelled:'ملغى'}
    },
    tn:{
      greeting:'عسلامة خويا 😄 لاباس الحمد لله! إنتي لباس؟ مرحبا بيك في Sportifano. تحبّ ديمي كرامبون، كرامبون، سبادري ولا حاجة أخرى؟',
      orderLogin:'أكيد نعاونك في الكوموند متاعك 😊 أما يلزم تدخل لحسابك Sportifano الأول باش ما نوريش طلباتك لحدّ آخر. ما تبعثش الموط دو باس في الشات.',
      orderEmpty:'ما لقيتش كوموندات في الحساب متاعك توّة. كان عملت كوموند بحساب آخر، ادخل بيه.',
      orderFailed:'ما نجمتش نجيبلك الكوموندات توّة. جرّب من espace client متاعك.',
      orderHeader:'هاو آخر الكوموندات متاعك:',
      loginButton:'ادخل لحسابي',
      detailsHeader:'هاو الديتاي متاع البرودوي:',
      sizesLabel:'المقاسات',colorsLabel:'الألوان',descriptionLabel:'التفاصيل',priceLabel:'السوم',
      unknownSize:'المقاس يلزم يتأكد من صفحة البرودوي',unknownDetails:'تلقى التفاصيل الكاملة في صفحة البرودوي.',
      orderStatus:{pending:'تستنّى التأكيد',confirmed:'تأكّدت',shipped:'في طريقها ليك',delivered:'تسلّمت',cancelled:'تفسخت'}
    }
  };
  for(const code of ['fr','ar','tn'])Object.assign(i18n[code],extras[code]);
  const tr = () => i18n[state.lang];
  function node(tag, cls, value) { const el = document.createElement(tag); if(cls)el.className = cls; if(value !== undefined)el.textContent=value; return el; }
  const button = (text, click, cls='') => { const el = node('button',cls,text); el.type='button'; if(typeof click==='function')el.addEventListener('click',click); return el; };
  const link = (text, href, cls) => { const el=node('a',cls,text); el.href=href; return el; };
  function formatPrice(n){return Number(n).toLocaleString('fr-TN',{maximumFractionDigits:3})+' DT';}
  function productUrl(p){if(!p.id)return '/#catalogue'; return '/?product='+encodeURIComponent(String(p.id));}
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
  function reset(){state.cartDraft=null;state.history=[];state.lastProducts=[];messages.replaceChildren();addMessage(tr().hello);showSuggestions();}
  const stringList=value=>Array.isArray(value)?value.map(v=>String(v)).join(', '):String(value||'');
  function detailOf(p){
    const t=tr();
    const chunks=[t.detailsHeader,p.name];
    if(NLP.validPrice(p))chunks.push(t.priceLabel+': '+formatPrice(p.price));
    if(p.category)chunks.push(String(p.category));
    if(p.description)chunks.push(t.descriptionLabel+': '+String(p.description).slice(0,450));
    chunks.push(t.sizesLabel+': '+(stringList(p.sizes)||t.unknownSize));
    if(stringList(p.colors))chunks.push(t.colorsLabel+': '+stringList(p.colors));
    chunks.push(stock(p));
    return chunks.join('\n');
  }
  const authButton=()=>{const b=document.querySelector('#accountBtn');if(b)b.click();else window.location.assign('/');};
  async function myOrders(text){
    const t=tr();
    try {
      const {auth,db}=await import('/firebase.js');
      if(!auth.currentUser)return {text:t.orderLogin,signIn:true};
      const uid=auth.currentUser.uid;
      const {getDocs,query,collection,where}=await import('/database-api.js');
      // RTDB rules require auth.uid AND a userId-filtered query. Never read all orders.
      const snap=await Promise.race([
        getDocs(query(collection(db,'orders'),where('userId','==',uid))),
        new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),8000))
      ]);
      const orders=snap.docs.map(d=>({id:d.id,...d.data()}))
        .filter(o=>o.userId===uid)
        .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      const wanted=String(text||'').match(/#([a-z0-9_-]{6,})/i)?.[1];
      const selected=wanted?orders.filter(o=>o.id.startsWith(wanted)):orders.slice(0,4);
      if(!selected.length)return {text:t.orderEmpty};
      const lines=selected.map(o=>{
        const status=t.orderStatus[o.status]||t.orderStatus.pending;
        const items=(Array.isArray(o.items)?o.items:[]).slice(0,8).map(item=>{
          const title=String(item.name||'Article').slice(0,65);
          const qty=Number.isFinite(Number(item.quantity))?Number(item.quantity):1;
          return '• '+title+' × '+qty+(item.size?' ('+String(item.size).slice(0,16)+')':'');
        }).join('\n');
        const sum=Number.isFinite(Number(o.total))?formatPrice(o.total):'—';
        return '#'+o.id.slice(0,8)+' · '+status+'\n'+sum+(items?'\n'+items:'');
      });
      return {text:t.orderHeader+'\n\n'+lines.join('\n\n')};
    }catch(e){console.warn('Assistant order lookup failed',e?.code||e?.name||'error');return {text:t.orderFailed,signIn:true};}
  }
  // A cart draft is only a proposal. It never mutates the cart until explicit confirmation.
  const cartWords={
    tn:{choose:'أي مودال تقصد؟ اختار البرودوي اللي تحب عليه:',size:'شنوّة القياس اللي تحب عليه؟',color:'شنوّة اللون اللي تختار؟',confirm:'تأكّدلي: نزيدلك البرودوي هذا في البانيي؟',yes:'إي، زيد للبانيي',cancel:'لا، بلاش',added:'مريڨل! زدتهولك في البانيي ✅',open:'شوف البانيي',unavailable:'سامحني، البرودوي موش متوفّر توّة، ولا الستوك ما عادش يكفي.',noLive:'باش نزيدهولك في البانيي، يلزم الاتصال بالستوك المباشر يكون متاح. جرّب من بعد.',none:'ما لقيتش البرودوي هذا في الكاتالوغ، جرّب اسم آخر.',badSize:'المقاس المطلوب موش موجود للمودال هذا. اختار من المقاسات المتاحة.',badColor:'اللون المطلوب موش موجود للمودال هذا. اختار من الألوان المتاحة.',quantity:'الكمية',sizeLabel:'المقاس',colorLabel:'اللون',pending:'نستنّى تأكيدك قبل ما نزيد المنتج.',chooseFirst:'اختار المنتج أولًا.',noSize:'ما عندناش معلومة مؤكدة على المقاس هذا. تثبّت من صفحة المنتج.'},
    fr:{choose:'Quel modèle voulez-vous ? Choisissez un produit :',size:'Quelle taille souhaitez-vous ?',color:'Quelle couleur préférez-vous ?',confirm:'Confirmez-vous cet ajout au panier ?',yes:'Oui, ajouter au panier',cancel:'Annuler',added:'Votre article a été ajouté au panier ✅',open:'Voir mon panier',unavailable:'Cet article ou la quantité demandée n’est plus disponible.',noLive:'Le stock en direct est indisponible. Je ne peux pas ajouter au panier pour le moment.',none:'Je ne trouve pas cet article dans le catalogue.',badSize:'Cette taille n’est pas disponible. Choisissez une taille proposée.',badColor:'Cette couleur n’est pas disponible. Choisissez une couleur proposée.',quantity:'Quantité',sizeLabel:'Taille',colorLabel:'Couleur',pending:'Je demande votre confirmation avant de modifier le panier.',chooseFirst:'Choisissez d’abord un produit.',noSize:'La taille ne peut pas être vérifiée sur cet article.'},
    ar:{choose:'أي موديل تريد؟ اختر المنتج:',size:'ما المقاس المطلوب؟',color:'ما اللون الذي تريده؟',confirm:'هل تؤكد إضافة هذا المنتج إلى السلة؟',yes:'نعم، أضف للسلة',cancel:'إلغاء',added:'تمت إضافة المنتج إلى السلة ✅',open:'عرض السلة',unavailable:'المنتج أو الكمية المطلوبة غير متوفرة.',noLive:'المخزون المباشر غير متاح حالياً، لا يمكنني الإضافة للسلة.',none:'لم أجد المنتج المطلوب في المجموعة.',badSize:'هذا المقاس غير متوفر. اختر مقاساً متاحاً.',badColor:'هذا اللون غير متوفر. اختر لوناً متاحاً.',quantity:'الكمية',sizeLabel:'المقاس',colorLabel:'اللون',pending:'لن أعدّل السلة قبل موافقتك.',chooseFirst:'يرجى اختيار المنتج أولاً.',noSize:'لا يمكن التأكد من المقاس لهذا المنتج.'}
  };
  const cw=()=>cartWords[state.lang];
  const options=value=>Array.isArray(value)?value.map(x=>String(x).trim()).filter(Boolean):[];
  function cartControls(text,buttons){
    addMessage(text,'bot');
    const host=messages.lastChild?.querySelector('.sf-chat-msg-content');
    if(!host)return;
    const group=node('div','sf-chat-cart-controls');
    buttons.forEach(([label,action])=>group.append(button(label,action,'sf-chat-chip sf-chat-option')));
    host.append(group);
    messages.scrollTop=messages.scrollHeight;
  }
  function cancelCart(){
    state.cartDraft=null;
    cartControls(cw().cancel,[]);
  }
  function cartStep(){
    const d=state.cartDraft;
    if(!d)return;
    if(!d.product){
      cartControls(cw().choose,d.candidates.map(p=>[p.name+(NLP.validPrice(p)?' · '+formatPrice(p.price):''),()=>{if(state.cartDraft!==d)return;d.product=p;cartStep();}]));
      return;
    }
    const p=d.product,sizes=options(p.sizes),colors=options(p.colors);
    if(!NLP.validPrice(p)||!Number.isSafeInteger(Number(p.stock))||Number(p.stock)<1){
      state.cartDraft=null;addMessage(cw().unavailable,'bot');return;
    }
    if(sizes.length){
      const match=sizes.find(x=>NLP.norm(x)===NLP.norm(d.size));
      if(!match){
        const initial=d.size?cw().badSize:cw().size;
        d.size='';
        cartControls(initial,sizes.map(x=>[x,()=>{if(state.cartDraft!==d)return;d.size=x;cartStep();}]));
        return;
      }
      d.size=match;
    }else if(d.size){state.cartDraft=null;addMessage(cw().noSize,'bot');return;}
    if(colors.length){
      const match=NLP.matchColor(d.color,colors);
      if(!match){
        if(!d.color&&colors.length===1)d.color=colors[0];
        else {
          const initial=d.color?cw().badColor:cw().color;
          d.color='';
          cartControls(initial,colors.map(x=>[x,()=>{if(state.cartDraft!==d)return;d.color=x;cartStep();}]));
          return;
        }
      }else d.color=match;
    }else if(d.color){state.cartDraft=null;addMessage(cw().badColor,'bot');return;}
    const summary=cw().confirm+'\n'+p.name+'\n'+(NLP.validPrice(p)?formatPrice(p.price*d.quantity):'')+
      (d.size?'\n'+cw().sizeLabel+': '+d.size:'')+(d.color?'\n'+cw().colorLabel+': '+d.color:'')+
      '\n'+cw().quantity+': '+d.quantity;
    cartControls(summary,[
      [cw().yes,()=>confirmCart(d)],
      [cw().cancel,()=>{if(state.cartDraft===d)cancelCart();}]
    ]);
  }
  function confirmCart(d){
    if(state.cartDraft!==d||d.processing)return;
    d.processing=true;
    const api=window.SportifanoCart;
    if(!api?.isReady?.()){state.cartDraft=null;addMessage(cw().noLive,'bot');return;}
    const result=api.addItem({productId:d.product.id,size:d.size,color:d.color,quantity:d.quantity});
    state.cartDraft=null;
    if(!result.ok){
      addMessage(cw().unavailable,'bot');
      return;
    }
    cartControls(cw().added+' '+result.product.name+' × '+result.quantity,[
      [cw().open,()=>api.open()]
    ]);
  }
  function startCartRequest(text){
    const parsed=NLP.cartRequest(text);
    if(!parsed)return false;
    if(!state.loaded){addMessage(cw().noLive,'bot');return true;}
    const matched=NLP.search(text,state.catalog,{limit:6});
    const isReferenceOnly=!NLP.typeOf(text)&&!NLP.has(text,NLP.lex.products)&&!NLP.has(text,NLP.lex.shoe||[]);
    // Keep previously selected product for short follow-ups such as "hottli taille 42".
    const fromContext=(!matched.length||isReferenceOnly)&&state.lastProducts?.length===1;
    const candidates=fromContext?[state.lastProducts[0]]:matched;
    if(!candidates.length){addMessage(cw().none,'bot');return true;}
    const viable=candidates.filter(p=>Number(p.stock)>0&&NLP.validPrice(p));
    if(!viable.length){addMessage(cw().unavailable,'bot');return true;}
    state.cartDraft={candidates:viable,product:viable.length===1?viable[0]:null,size:parsed.size||'',color:parsed.color||'',quantity:parsed.quantity};
    cartStep();return true;
  }
  function continueCart(text){
    const d=state.cartDraft;if(!d)return false;
    if(NLP.has(text,['non','annuler','cancel','le','لا','بلاش','fasakh','فسخ'])){cancelCart();return true;}
    if(!d.product){
      const matches=d.candidates.filter(p=>NLP.norm(text).includes(NLP.norm(p.name))||NLP.norm(p.name).includes(NLP.norm(text)));
      if(matches.length===1){d.product=matches[0];cartStep();return true;}
      return false;
    }
    const size=NLP.sizeOf(text),sizes=options(d.product.sizes);
    const numeric=NLP.norm(text).match(/^(?:pointure |taille |size |مقاس |قياس )?(\d{2,3}|xxl|xl|xs|s|m|l)$/i);
    const chosen=size||(numeric?numeric[1].toUpperCase():null);
    if(chosen&&sizes.some(x=>NLP.norm(x)===NLP.norm(chosen))){d.size=chosen;cartStep();return true;}
    const color=options(d.product.colors).find(x=>NLP.norm(text)===NLP.norm(x)||NLP.matchColor(Object.keys({noir:1,blanc:1,bleu:1,rouge:1,vert:1,gris:1,rose:1,jaune:1,beige:1}).find(k=>NLP.matchColor(k,[text])),[x])===x);
    if(color){d.color=color;cartStep();return true;}
    // Spoken confirmation is explicit confirmation if the full choice is already selected.
    if(NLP.has(text,['oui','yes','ey','eyh','eyy','oui ajoute','اي','إي','نعم','ok zidh','ok zid','zidou'])&&d.product&&(!sizes.length||d.size)&&(!options(d.product.colors).length||d.color)){confirmCart(d);return true;}
    return false;
  }
  async function answer(text){
    const t=tr(),intent=NLP.intent(text);
    if(intent==='greeting')return {text:t.greeting};
    if(intent==='orderStatus')return myOrders(text);
    if(intent==='howOrder')return {text:t.order,link:['/#catalogue',t.catalogue]};
    if(intent==='delivery')return {text:t.delivery,link:['/livraison/',t.shippingLink]};
    if(intent==='payment')return {text:t.payment,link:['/livraison/',t.shippingLink]};
    if(intent==='contact')return {text:t.contact,link:['/contact/',t.contactLink]};
    const normalized=tidy(text);
    const wantsDetails=NLP.has(text,NLP.lex.details);
    const possibleProduct=state.catalog.find(p=>p.name&&normalized.includes(tidy(p.name))&&tidy(p.name).length>3);
    const type=NLP.typeOf(text);
    const productQuery=intent==='products'||!!possibleProduct;
    if(productQuery){
      if(!state.loaded)return {text:t.empty,link:['/#catalogue',t.catalogue]};
      // A short follow-up ("details", "prix", "taille") keeps the last product context.
      const contextual=!type&&!possibleProduct&&state.lastProducts?.length&&
        (wantsDetails||NLP.has(text,NLP.lex.size)||NLP.has(text,NLP.lex.stock))&&
        !NLP.has(text,NLP.lex.products);
      const products=possibleProduct?[possibleProduct]:contextual?state.lastProducts.slice(0,1):NLP.search(text,state.catalog,{limit:4});
      if(!products.length)return {text:t.noProducts,link:['/#catalogue',t.catalogue]};
      state.lastProducts=products;
      if(wantsDetails||contextual||products.length===1){
        return {text:detailOf(products[0]),products:products.slice(0,4),link:['/#catalogue',t.catalogue]};
      }
      if(NLP.has(text,NLP.lex.price)&&!type&&!NLP.budgetOf(text))return {text:t.price,products,link:['/#catalogue',t.catalogue]};
      return {text:t.products,products,link:['/#catalogue',t.catalogue]};
    }
    return {text:t.unknown,link:['/#catalogue',t.catalogue]};
  }
  async function send(value){
    const text=String(value||'').trim().slice(0,280);
    if(!text)return;
    input.value='';
    setLanguage(language(text));
    addMessage(text,'user');
    try{
      if(continueCart(text)||startCartRequest(text)){suggestions.replaceChildren();return;}
      const response=await answer(text);
      addMessage(response.text,'bot',response.products||[]);
      const last=messages.lastChild?.querySelector('.sf-chat-msg-content');
      if(response.link&&last)last.append(link(response.link[1],response.link[0],'sf-chat-action'));
      if(response.signIn&&last)last.append(button(tr().loginButton,authButton,'sf-chat-login sf-chat-action'));
    }catch(e){console.error('Sportifano assistant error',e);addMessage(tr().unknown);}
    suggestions.replaceChildren();
  }
  function startVoice(){
    const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Speech){addMessage(tr().noVoice);return;}
    try {
      if(state.recognizer){state.recognizer.stop();state.recognizer=null;return;}
      const rec=new Speech();state.recognizer=rec;rec.lang=state.lang==='fr'?'fr-FR':'ar-TN';rec.interimResults=false;rec.maxAlternatives=1;
      rec.onresult=e=>{const transcript=String(e.results[0][0].transcript||'').trim();if(transcript)send(transcript);};
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
