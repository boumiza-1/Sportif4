/* Sportifano assistant NLP: pure, testable, multilingual vocabulary. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SportifanoChatNLP=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const norm=value=>String(value??'').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f\u064b-\u065f]/g,'')
    .replace(/[أإآٱ]/g,'ا').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
    .replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
  const terms=value=>norm(value).split(' ').filter(Boolean);
  const has=(value,aliases)=>{const t=' '+norm(value)+' ';return aliases.some(a=>t.includes(' '+norm(a)+' '));};
  const lex={
    demi:['demi crampon','demi crapon','demu crampon','demu crapon','dmi crampon','dmi crapon','demy crampon','demy crapon','demicrampon','demicrapon','demi crampan','dmi crampan','demi krampon','demu krapon','dmu crampon','demi','demu','demo','dmi','demy','tf football','football turf','terrain synthetique','turf','astroturf','astro turf','ديمي كرامبون','ديمي كرابون','دمي كرابون','ديمو كرامبون','ديمي','دمي','نصف كرامبون','صباط ديمي'],
    crampon:['crampon','crampons','crapon','crapons','crampan','crampans','crampoon','krampon','krampons','cramponn','كرامبون','كرابون','كراپون','كرامبونات','صباط كورة','سباط كورة','sbat koura','sabbat koura','sabat koura','football boots','football cleats','chaussures de foot','chaussure de foot'],
    running:['running','ranning','jogging','chaussures de course','course a pied','سبادري جري','سبادري للجري'],
    sneaker:['sneaker','sneakers','basket','baskets','sbedri','sbedry','sbabri','sabadr','سبادري','سبادريات'],
    shoe:['chaussure','chaussures','shoes','sabat','sabbat','sbat','صباط','سباط','حذاء','احذيه','أحذية'],
    tracksuit:['survetement','survet','survêtement','ensemble sport','ensemble sportif','training set','ترينينغ','ترينغ','بدله رياضيه','تراكسوت'],
    tshirt:['t shirt','tshirt','tee shirt','تيشرت','تي شرت','تيشيرت','تريكو'],
    jersey:['maillot','maiyo','mayou','jersey','مريول','مريول كورة','مايو','مايو كورة','قميص فريق'],
    shorts:['short','shorts','شورت','شورط'],
    bag:['sac','sacs','backpack','bag','sport bag','sac de sport','ساك','ساك سبور','حقيبه','شنطه'],
    ball:['ballon','ballons','football ball','بالون','كره'],
    socks:['chaussette','chaussettes','socks','تقاشر','جوارب'],
    gloves:['gants','gant','gloves','قفازات'],
    men:['homme','hommes','men','man','رجالي','رجال','للرجال','rjel','rajeli'],
    women:['femme','femmes','women','woman','نسائي','بنات','للبنات','للنساء','bnet','nsa'],
    accessories:['accessoire','accessoires','accessory','accessories','اكسسوارات','accessoir'],
    greeting:['slm','slem','salam','salem','salut','slt','bjr','bonjour','bonsoir','cc','cv','cava','ça va','khouya','khoya','5ouya','5oya','khuya','3aslema','aslema','asslema','عسلامه','سلام','السلام عليكم','مرحبا','صباح الخير','مساء الخير','لباس','لاباس','labes','labess','lebes'],
    delivery:['livraison','livrer','livrez','delai','délai','expedition','delivery','التوصيل','توصيل','التوصيل','يوصل','ليڥريزون','livrison','livry','tawsil','wasla','toussel','toossel'],
    payment:['paiement','payer','payment','cash','الدفع','نخلص','تخلص','خلاص','khalas','nkhalas','nkhaless','nkhalas','khalleṣ'],
    contact:['contact','contacter','telephone','téléphone','numero','numéro','instagram','whatsapp','wattsapp','واتساب','اتصال','اتصل','نتصل','رقم','noumrou','numrou','nklmk'],
    size:['taille','tailles','pointure','size','mesure','قياس','قياسات','مقاس','مقاسات','9yas','9yess'],
    stock:['stock','disponible','dispo','disponibilite','disponibilité','ستوك','موجود','متوفر','mawjoud','fama'],
    order:['commande','commandes','commander','commandi','ncommandi','comande','comondi','komondi','كوموند','كومونده','طلبيه','طلبية','طلب','نطلب','panier','acheter','achat'],
    orderStatus:['suivi','suivre','statut','status','track','tracking','mes commandes','ma commande','mon commande','ou est ma commande','ou en est ma commande','commande mte3i','commande mta3i','commandeti','komondeti','win waslet','wen waslet','woslet el commande','win el komonda','mes achats','طلباتي','طلباتي وين','طلبيتي','طلبيه متاعي','طلبية متاعي','كوموندي','كوموند متاعي','وين وصلت','تتبع الطلب','حاله طلبي'],
    products:['produit','produits','article','articles','collection','catalogue','catalog','modeles','modèles','show','montre','cherche','nheb','n7eb','نحب','وريني','ورّيني','شوف','المنتجات','منتجات','برودوي','برودويات','عندكم','3andkom','3andek','3andkoum'],
    price:['prix','combien','coute','coûte','budget','dt','tnd','dinar','dinars','سعر','السعر','السوام','قداش','بقداش','دينار','souma','soum','9adech','9addech','9adach','9ad'],
    details:['detail','details','détails','caracteristiques','caractéristiques','informations','infos','description','fiche','details mta3','المواصفات','تفاصيل','شنو فيه','chfih','chfihom'],
    howOrder:['comment commander','comment acheter','how to order','كيفاش نطلب','كيفاش نكوموندي','kifech ncommandi','kifech nechri','kifech na3mel commande']
  };
  const types=['demi','crampon','running','sneaker','shoe','tracksuit','tshirt','jersey','shorts','bag','ball','socks','gloves','accessories'];
  const tunisianWords=['slm','slem','salam','aslema','3aslema','khouya','khoya','khuya','5ouya','5oya','chneya','chnowa','chnoua','chnia','chniya','nheb','n7eb','9adech','9adach','9addech','kifech','fama','tawa','sbedri','sbabri','barcha','bech','livrison','noumrou','khalas','najem','3andkom','3andek','3andkoum','mta3i','mte3i','winek','win','wen','labes','labess','demu','demo','crapon','comondi','komondi','woslet','mrigel'];
  const tunisianArabic=['عسلامه','شنوه','شنوة','شنيا','شنية','قداش','بقداش','خويا','خويه','نحب','تنجم','برودوي','سبادري','صباط','سباط','كوموند','ليڥريزون','باهي','لاباس','توه','توة','خاطر','فما','برشا','عايشك','نخلص','نعاونك','وين','متاعي','طلبيتي','كرابون','كرامبون'];
  const frenchWords=['bonjour','bonsoir','merci','je cherche','vous avez','je voudrais','je veux','combien','livraison','commande','taille','pointure','chaussures','prix','pouvez vous','est ce que','comment','s il vous plait','crampons'];
  function language(value,previous='tn'){
    const v=norm(value);
    if(!v)return previous;
    if(/[\u0600-\u06ff]/.test(v))return has(v,tunisianArabic)?'tn':(previous==='tn'&&has(v,['سلام','مرحبا'])?'tn':'ar');
    if(has(v,tunisianWords))return 'tn';
    if(has(v,frenchWords))return 'fr';
    return previous;
  }
  function typeOf(value) {
    for(const type of types)if(has(value,lex[type]))return type;
    return null;
  }
  const genderOf=value=>has(value,lex.men)?'men':has(value,lex.women)?'women':null;
  function budgetOf(value){
    const v=norm(value);
    const m=v.match(/(?:moins de|moins que|max(?:imum)?|under|budget|أقل من|اقل من|تحت|ما يفوتش|b|ب)\s*(\d{2,5})\s*(?:dt|tnd|dinar|دينار)?\b/i)
        ||v.match(/\b(\d{2,5})\s*(?:dt|tnd|dinar|دينار)\b/i);
    return m?Number(m[1]):null;
  }
  function sizeOf(value){
    const v=norm(value);
    const m=v.match(/(?:pointure|taille|size|9yas|قياس|مقاس)\s*(\d{2,3}|xxl|xl|xs|s|m|l)\b/i);
    return m?String(m[1]).toUpperCase():null;
  }
  function intent(value){
    if(has(value,lex.orderStatus))return 'orderStatus';
    if(has(value,lex.howOrder))return 'howOrder';
    if(has(value,lex.delivery))return 'delivery';
    if(has(value,lex.payment))return 'payment';
    if(has(value,lex.contact))return 'contact';
    const type=typeOf(value);
    if(type||has(value,lex.details)||has(value,lex.products)||has(value,lex.size)||has(value,lex.price)||has(value,lex.stock)||budgetOf(value)!==null)return 'products';
    if(has(value,lex.order))return 'howOrder';
    if(has(value,lex.greeting))return 'greeting';
    return 'unknown';
  }
  const searchStop=new Set(['je','veux','vous','un','une','des','les','le','la','avec','sur','pour','est','tu','avez','combien','prix','cher','moins','que','comment','produit','produits','taille','pointure','sportifano','nheb','n7eb','andkom','3andkom','chouf','chneya','chnowa','please','عندي','عندكم','نحب','بقداش','قداش','وريني','شوف','تفاصيل','مقاس','على','من','في','الى','سامحني','خويا','شنوه','شنوة','نحب','ده','dt']);
  function productText(p){return [p.name,p.category,p.description,Array.isArray(p.colors)?p.colors.join(' '):p.colors,Array.isArray(p.sizes)?p.sizes.join(' '):p.sizes].filter(Boolean).join(' ');}
  const validPrice=p=>p&&(typeof p.price==='number'||typeof p.price==='string')&&String(p.price).trim()!==''&&Number.isFinite(Number(p.price))&&Number(p.price)>=0;
  const productHasType=(p,type)=>{
    const s=productText(p);
    if(type==='demi')return has(s,lex.demi.filter(a=>a!=='demi'&&a!=='demu'&&a!=='demo'&&a!=='dmi'&&a!=='demy'))||has(s,['demi','dmi','demu','demo','tf','turf']);
    if(type==='crampon')return has(s,lex.crampon)||has(s,lex.demi);
    if(type==='sneaker')return has(s,lex.sneaker)||has(s,['basket','sneaker','espadrille','سبادري']);
    if(type==='shoe')return has(s,lex.shoe)||has(s,lex.crampon)||has(s,lex.demi)||has(s,lex.running)||has(s,lex.sneaker);
    return has(s,lex[type]||[]);
  };
  function search(query,catalog,options={}){
    const list=(Array.isArray(catalog)?catalog:[]).filter(p=>p&&p.active!==false&&typeof p.name==='string');
    const target=typeOf(query),gender=genderOf(query),max=budgetOf(query),size=sizeOf(query);
    let queryWords=terms(query).filter(w=>w.length>=3&&!searchStop.has(w)&&!w.match(/^\d+$/));
    const ignore=new Set(Object.values(lex).flat().flatMap(s=>terms(s)).filter(w=>w.length>=3));
    const targetWords=queryWords.filter(w=>!ignore.has(w));
    let matching=list.filter(p=>{
      if(target&&!productHasType(p,target))return false;
      if(max!==null&&(!validPrice(p)||Number(p.price)>max))return false;
      if(size&&Array.isArray(p.sizes)&&p.sizes.length&&!p.sizes.some(s=>norm(s)===norm(size)))return false;
      if(gender){const s=norm(productText(p));if(has(s,lex[gender==='men'?'women':'men']))return false;}
      return true;
    }).map(p=>{
      const hay=norm(productText(p)), name=norm(p.name);
      let score=0;
      if(target&&productHasType(p,target))score+=12;
      for(const w of targetWords){if((' '+name+' ').includes(' '+w+' '))score+=7;else if((' '+hay+' ').includes(' '+w+' '))score+=3;}
      if(gender&&has(hay,lex[gender]))score+=4;
      if(size&&Array.isArray(p.sizes)&&p.sizes.some(s=>norm(s)===norm(size)))score+=3;
      if(max!==null)score+=1;
      return {p,score};
    }).sort((a,b)=>b.score-a.score);
    if(!target&&targetWords.length&&matching.some(x=>x.score>0))matching=matching.filter(x=>x.score>0);
    if(!target&&targetWords.length&&!matching.some(x=>x.score>0))matching=[];
    return matching.slice(0,options.limit||4).map(x=>x.p);
  }
  return {norm,has,lex,language,typeOf,genderOf,budgetOf,sizeOf,intent,search,productHasType,validPrice};
});
