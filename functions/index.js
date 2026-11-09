'use strict';
const {onValueCreated}=require('firebase-functions/v2/database');
const {initializeApp}=require('firebase-admin/app');
const {getDatabase}=require('firebase-admin/database');
const {getMessaging}=require('firebase-admin/messaging');
initializeApp();
// Triggered by a NEW RTDB order only. No names, telephone numbers or addresses in the push payload.
exports.notifySportifanoNewOrder=onValueCreated({
  ref:'/orders/{orderId}',
  instance:'sport24-b111c-default-rtdb',
  region:'us-central1'
},async event=>{
  const orderId=String(event.params.orderId||'');
  const order=event.data.val();
  if(!orderId||!order||order.status!=='pending')return;
  const db=getDatabase();
  const [adminsSnap,tokensSnap]=await Promise.all([
    db.ref('admins').get(),db.ref('adminPushTokens').get()
  ]);
  const admins=adminsSnap.val()||{},byUser=tokensSnap.val()||{};
  const destinations=[];
  for(const [uid,devices] of Object.entries(byUser)){
    if(admins[uid]!=='admin'||!devices||typeof devices!=='object')continue;
    for(const [deviceId,record] of Object.entries(devices)){
      if(!record?.token||typeof record.token!=='string')continue;
      destinations.push({uid,deviceId,token:record.token});
    }
  }
  const unique=new Map();
  for(const d of destinations)if(!unique.has(d.token))unique.set(d.token,d);
  const recipients=[...unique.values()];
  for(let start=0;start<recipients.length;start+=500){
    const group=recipients.slice(start,start+500);
    const reply=await getMessaging().sendEachForMulticast({
      tokens:group.map(x=>x.token),
      data:{type:'new_order',orderId},
      webpush:{headers:{Urgency:'high'}}
    });
    const invalid=[];
    reply.responses.forEach((result,i)=>{
      if(result.success)return;
      const code=String(result.error?.code||'');
      if(['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(code))
        invalid.push(db.ref('adminPushTokens/'+group[i].uid+'/'+group[i].deviceId).remove());
      else console.error('Sportifano push delivery failure:',code);
    });
    await Promise.allSettled(invalid);
    console.log('Sportifano push:',reply.successCount,'success /',reply.failureCount,'failed');
  }
});
