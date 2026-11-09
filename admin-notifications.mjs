/* Sportifano Admin: installable PWA, live order alerts, opt-in Firebase web push.
   No Firebase credentials for sending notifications are shipped to browsers. */
import {auth,db} from './firebase.js';
import {getApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {ref,onValue,set,remove} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js';
import {getMessaging,isSupported,getToken,deleteToken,onMessage} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging.js';

const $=selector=>document.querySelector(selector);
const deviceKey='sportifano_admin_push_device_v1';
let uid=null,unsubscribeOrders=null,unsubscribeMessage=null,seenIds=null;
let installPrompt=null,lastMessages=new Map(),activeSettings={},currentOrderHandler=null;
let worker=null;

const dateValue=v=>{
  const ms=Number(v||0);
  return {seconds:Math.floor(ms/1000),toDate:()=>new Date(ms)};
};
const normalizeOrder=(id,data)=>{
  const order={id,...data};
  if(data.createdAt)order.createdAt=dateValue(data.createdAt);
  if(data.updatedAt)order.updatedAt=dateValue(data.updatedAt);
  return order;
};
function status(message,warning=false){
  const el=$('#adminPushStatus');if(!el)return;
  el.textContent=message;el.classList.toggle('warning',warning);
}
function newOrderMessage(orderId){
  if(!uid||typeof orderId!=='string'||!orderId)return;
  const now=Date.now();
  if(lastMessages.has(orderId)&&now-lastMessages.get(orderId)<120000)return;
  lastMessages.set(orderId,now);
  if(lastMessages.size>100)lastMessages=new Map([...lastMessages].filter(([,time])=>now-time<300000));
  const alert=$('#newOrderAlert');
  if(alert){
    alert.hidden=false;
    $('#newOrderAlertText').textContent='Nouvelle commande reçue · #'+orderId.slice(0,8);
    $('#newOrderOpenBtn').onclick=()=>{alert.hidden=true;currentOrderHandler?.(orderId)};
  }
  const n=$('#newOrdersBadge');if(n){n.hidden=false;n.textContent='● Nouvelle commande'}
}
async function registerWorker(){
  if(!('serviceWorker' in navigator))throw Error('Ce navigateur ne permet pas les applications Web.');
  worker=await navigator.serviceWorker.register('/admin-sw.js',{scope:'/'});
  return worker;
}
function getDeviceId(){
  let id=localStorage.getItem(deviceKey);
  if(id&&!/^[a-zA-Z0-9-]{10,80}$/.test(id))id=null;
  if(!id){id=crypto.randomUUID();localStorage.setItem(deviceKey,id);}
  return id;
}
async function messagesInForeground(){
  if(unsubscribeMessage){unsubscribeMessage();unsubscribeMessage=null}
  if(!(await isSupported()))return;
  unsubscribeMessage=onMessage(getMessaging(getApp()),payload=>{
    if(payload.data?.type==='new_order')newOrderMessage(String(payload.data.orderId||''));
  });
}
export async function enableAdminPush(){
  if(!uid||auth.currentUser?.uid!==uid){status('Connectez-vous avec le compte administrateur.',true);return}
  const key=String(activeSettings.pushVapidKey||'').trim();
  if(!key){status('Ajoutez la clé publique Web Push (VAPID) dans Paramètres et enregistrez.',true);return}
  if(!('Notification' in window)){status('Notifications non disponibles sur ce navigateur.',true);return}
  // Ask only after an explicit button click, not on page load.
  const permission=await Notification.requestPermission();
  if(permission!=='granted'){status('Notifications refusées. Autorisez-les dans les réglages du navigateur.',true);return}
  try{
    if(!(await isSupported()))throw Error('Ce navigateur ne prend pas en charge Firebase Cloud Messaging.');
    const reg=await registerWorker();
    const messaging=getMessaging(getApp());
    const token=await getToken(messaging,{vapidKey:key,serviceWorkerRegistration:reg});
    if(!token)throw Error('Impossible de récupérer le token de notification.');
    // The RTDB rule permits only the currently authenticated administrator to register devices under their uid.
    await set(ref(db,'adminPushTokens/'+uid+'/'+getDeviceId()),{token,updatedAt:Date.now()});
    await messagesInForeground();
    status('Notifications activées sur cet appareil ✓');
    const disable=$('#disableAdminPushBtn');if(disable)disable.hidden=false;
  }catch(error){status('Activation impossible : '+(error.message||String(error)),true)}
}
export async function disableAdminPush(){
  if(!uid)return;
  try{
    await remove(ref(db,'adminPushTokens/'+uid+'/'+getDeviceId()));
    if(await isSupported())await deleteToken(getMessaging(getApp()));
    status('Notifications push désactivées sur cet appareil.');
    const disable=$('#disableAdminPushBtn');if(disable)disable.hidden=true;
  }catch(error){status('Impossible de désactiver : '+(error.message||String(error)),true)}
}
export async function stopAdminExperience({revokePush=false}={}){
  if(revokePush&&uid)await disableAdminPush();
  if(unsubscribeOrders){unsubscribeOrders();unsubscribeOrders=null;}
  if(unsubscribeMessage){unsubscribeMessage();unsubscribeMessage=null;}
  uid=null;seenIds=null;lastMessages.clear();currentOrderHandler=null;
}
export function updateAdminPushSettings(settings){activeSettings=settings||{};if(uid)status(activeSettings.pushVapidKey?'Alertes instantanées actives dans cette page. Activez Push pour les alertes hors application.':'Alertes temps réel actives ici. Clé VAPID nécessaire pour les alertes lorsque l’application est fermée.')}
export async function startAdminExperience({userId,settings,onOrders,onOpenOrder}){
  if(!userId)throw Error('Admin authentication required');
  await stopAdminExperience();
  uid=userId;currentOrderHandler=onOpenOrder;activeSettings=settings||{};
  updateAdminPushSettings(settings);
  // Orders only, no public token access. Initial snapshot is baseline, not 100 old notifications.
  unsubscribeOrders=onValue(ref(db,'orders'),snapshot=>{
    const data=snapshot.val()||{};
    const ids=new Set(Object.keys(data));
    if(seenIds){
      for(const id of ids)if(!seenIds.has(id)&&data[id]?.status==='pending')newOrderMessage(id);
    }
    seenIds=ids;
    const list=Object.entries(data).map(([id,value])=>normalizeOrder(id,value||{}));
    list.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    onOrders?.(list);
  },error=>status('Connexion commandes en direct : '+(error.message||error),true));
  if('serviceWorker' in navigator)registerWorker().catch(()=>{});
  messagesInForeground().catch(()=>{});
}
let wired=false;
export function wireAdminInstallControls(){
  if(wired)return;wired=true;
  $('#enableAdminPushBtn')?.addEventListener('click',()=>enableAdminPush());
  $('#disableAdminPushBtn')?.addEventListener('click',()=>disableAdminPush());
  $('#installAdminAppBtn')?.addEventListener('click',async()=>{
    if(installPrompt){
      const prompt=installPrompt;installPrompt=null;
      await prompt.prompt();
      const result=await prompt.userChoice;
      status(result.outcome==='accepted'?'Installation demandée ✓':'Installation annulée');
    }else{
      status('Android : menu ⋮ du navigateur → Installer l’application. iPhone : Safari → Partager → Sur l’écran d’accueil.');
    }
  });
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();installPrompt=event;
    const el=$('#installAdminAppBtn');if(el)el.hidden=false;
  });
  window.addEventListener('appinstalled',()=>{
    const el=$('#installAdminAppBtn');if(el)el.hidden=true;
    status('Sportifano Admin installé ✓');
  });
  if(window.matchMedia('(display-mode:standalone)').matches){
    const el=$('#installAdminAppBtn');if(el)el.hidden=true;
  }
}
