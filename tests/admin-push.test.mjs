import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Admin manifest is installable and points to private admin start URL',()=>{
 const m=JSON.parse(read('admin-manifest.webmanifest'));
 assert.equal(m.display,'standalone');
 assert.match(m.start_url,/^\/admin\.html/);
 assert(m.icons.some(i=>i.sizes==='192x192'));
 assert(m.icons.some(i=>i.sizes==='512x512'));
 assert(read('admin-icon-192.png').length>0);
 assert(read('admin-icon-512.png').length>0);
 const html=read('admin.html');
 assert.match(html,/rel="manifest"/);
 assert.match(html,/id="installAdminAppBtn"/);
 assert.match(html,/id="enableAdminPushBtn"/);
 assert.match(html,/id="newOrderAlert"/);
});
test('Dashboard listens to real-time orders only after admin authorization',()=>{
 const js=read('admin.js'),notifications=read('admin-notifications.mjs');
 assert(js.indexOf('startAdminExperience({')>js.indexOf("d.data()!=='admin'"));
 assert.match(js,/onOrders:list=>/);
 assert.match(notifications,/onValue\(ref\(db,'orders'\)/);
 assert.match(notifications,/if\(seenIds\)/);
 assert.match(notifications,/seenIds=ids/);
 assert.match(notifications,/newOrderMessage\(id\)/);
 assert.match(js,/stopAdminExperience\(\{revokePush:true\}\)/);
});
test('Push subscription requires explicit permission and verified admin identity',()=>{
 const n=read('admin-notifications.mjs'),rules=JSON.parse(read('database.rules.json')).rules;
 assert.match(n,/Notification\.requestPermission\(\)/);
 assert.match(n,/auth\.currentUser\?\.uid!==uid/);
 assert.match(n,/adminPushTokens/);
 assert(rules.adminPushTokens.$uid.$deviceId['.write'].includes("root.child('admins')"));
 assert(rules.adminPushTokens.$uid.$deviceId['.write'].includes('auth.uid === $uid'));
 assert(!Object.hasOwn(rules.adminPushTokens,'.read'));
});
test('Only new orders trigger FCM push and no customer personal info is exposed',()=>{
 const fn=read('functions/index.js'),worker=read('admin-sw.js');
 assert.match(fn,/onValueCreated/);
 assert.match(fn,/\/orders\/\{orderId\}/);
 assert.match(fn,/admins\[uid\]!=='admin'/);
 assert.match(fn,/sendEachForMulticast/);
 assert.match(fn,/data:\{type:'new_order',orderId\}/);
 assert.doesNotMatch(fn,/data:\{[^}]*phone:/);
 assert.doesNotMatch(fn,/data:\{[^}]*address:/);
 assert.match(worker,/onBackgroundMessage/);
 assert.match(worker,/showNotification/);
 assert.match(worker,/notificationclick/);
 assert.doesNotMatch(worker,/addEventListener\('fetch'/);
});
test('Static GitHub Pages generator publishes PWA and service worker files',()=>{
 const b=read('scripts/build-seo.mjs');
 for(const name of ['admin-manifest.webmanifest','admin-notifications.mjs','admin-sw.js','admin-icon-192.png','admin-icon-512.png']){
  assert(b.includes("'"+name+"'"),name);
 }
 const f=JSON.parse(read('firebase.json'));
 assert.equal(f.database.rules,'database.rules.json');
 assert.equal(f.functions[0].source,'functions');
});
