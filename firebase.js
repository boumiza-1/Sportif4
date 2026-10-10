import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getDatabase} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js';
import {getStorage} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js';
// Paste the Firebase Web App config from Project settings > Your apps > Web.
export const firebaseConfig = {
  apiKey: 'REMPLACER_API_KEY',
  authDomain: 'sport24-b111c.firebaseapp.com',
  databaseURL: 'https://sport24-b111c-default-rtdb.firebaseio.com',
  projectId: 'sport24-b111c',
  storageBucket: 'sport24-b111c.firebasestorage.app',
  messagingSenderId: 'REMPLACER_SENDER_ID',
  appId: 'REMPLACER_APP_ID'
};
export const configured = !firebaseConfig.apiKey.startsWith('REMPLACER') && !firebaseConfig.appId.startsWith('REMPLACER');
const app=initializeApp(firebaseConfig);
export const auth=getAuth(app), db=getDatabase(app), storage=getStorage(app);
