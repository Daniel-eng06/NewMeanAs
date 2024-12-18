import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import dotenv from 'dotenv';
import serviceAccountKey from './serviceAccountKey.json'
  
dotenv.config();
admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});


const firestore = admin.firestore()
const storage = admin.storage().bucket();

export {firestore, storage}
  