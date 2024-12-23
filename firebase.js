const admin = require('firebase-admin');
const dotenv = require('dotenv');
const serviceAccountKey = require('./serviceAccountKey.json');
  
dotenv.config();
admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});


const firestore = admin.firestore()
const storage = admin.storage().bucket();

module.exports = {firestore, storage}
  