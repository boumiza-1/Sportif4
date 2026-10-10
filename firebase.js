import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getDatabase} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js';
// Paste the Firebase Web App config from Project settings > Your apps > Web.
export const firebaseConfig = {
  apiKey: 'AIzaSyAuVOJH02IlEMz65mfm_vLzYUcLAzyM6bk',
  authDomain: 'sport24-b111c.firebaseapp.com',
  databaseURL: 'https://sport24-b111c-default-rtdb.firebaseio.com',
  projectId: 'sport24-b111c',
  storageBucket: 'sport24-b111c.firebasestorage.app',
  messagingSenderId: '1011201921741',
  appId: '1:1011201921741:web:be3779314878888ec54f84',
  measurementId: 'G-B23GJ1PB9J'
};
export const configured = !firebaseConfig.apiKey.startsWith('REMPLACER') && !firebaseConfig.appId.startsWith('REMPLACER');
const app=initializeApp(firebaseConfig);
export const auth=getAuth(app), db=getDatabase(app);
