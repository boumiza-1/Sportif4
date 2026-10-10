import {ref,get,set,update,remove,push,serverTimestamp as rTimestamp,query as rQuery,orderByChild,equalTo} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js';
const obj=(v)=>v&&typeof v==='object'?v:{};
const stamp=(v)=>({seconds: Math.floor(Number(v||0)/1000),toDate:()=>new Date(Number(v||0))});
const decode=(data)=>data && typeof data==='object'?{...data,...(data.createdAt?{createdAt:stamp(data.createdAt)}:{}),...(data.updatedAt?{updatedAt:stamp(data.updatedAt)}:{})}:data;
export const collection=(_db,path)=>({db:_db,path});
export const doc=(_db,path,key)=>({db:_db,path:path+'/'+key});
export const where=(field,operator,value)=>({field,operator,value});
export const query=(collectionRef,filter)=>({...collectionRef,filter});
export const serverTimestamp=()=>rTimestamp();
export async function getDocs(c){
  const snap=await get(c.filter ? rQuery(ref(c.db,c.path),orderByChild(c.filter.field),equalTo(c.filter.value)):ref(c.db,c.path));
  const result=obj(snap.val());return {docs:Object.entries(result).map(([id,value])=>({id,data:()=>decode(value)}))};
}
export async function getDoc(d){const s=await get(ref(d.db,d.path));return {exists:()=>s.exists(),data:()=>decode(s.val())};}
function withWriteTimeout(promise){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Firebase ne répond pas après 20 secondes. Vérifiez les règles Realtime Database et la connexion. Ne relancez pas avant de vérifier si la donnée existe.')),20000)})]).finally(()=>clearTimeout(timer));}
export async function addDoc(c,value){const r=push(ref(c.db,c.path));await withWriteTimeout(set(r,value));return {id:r.key};}
export async function setDoc(d,value){await set(ref(d.db,d.path),value);}
export async function updateDoc(d,value){await withWriteTimeout(update(ref(d.db,d.path),value));}
export async function deleteDoc(d){await remove(ref(d.db,d.path));}
