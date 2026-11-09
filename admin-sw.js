/* Sportifano Admin — push only; no private dashboard HTML/response caching. */
'use strict';
try{
  importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');
  firebase.initializeApp({
    apiKey:'AIzaSyAuVOJH02IlEMz65mfm_vLzYUcLAzyM6bk',
    authDomain:'sport24-b111c.firebaseapp.com',
    projectId:'sport24-b111c',
    messagingSenderId:'1011201921741',
    appId:'1:1011201921741:web:be3779314878888ec54f84'
  });
  firebase.messaging().onBackgroundMessage(payload=>{
    if(payload?.data?.type!=='new_order')return;
    const orderId=String(payload.data.orderId||'');
    return self.registration.showNotification('Sportifano · Nouvelle commande',{
      body:'Une nouvelle commande attend votre validation.',
      icon:'/admin-icon-192.png',
      badge:'/admin-icon-192.png',
      tag:'sportifano-new-order-'+orderId,
      renotify:true,
      data:{url:'/admin.html?tab=orders'+(orderId?'&order='+encodeURIComponent(orderId):'')}
    });
  });
}catch(error){
  // Preserve PWA installation on browsers where Firebase web messaging is unsupported.
  console.warn('Sportifano push non disponible dans ce navigateur',error?.message||error);
}
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||'/admin.html?tab=orders';
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async list=>{
    for(const client of list){
      if(new URL(client.url).origin===self.location.origin){
        await client.navigate(target);return client.focus();
      }
    }
    return self.clients.openWindow(target);
  }));
});
