import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Need to run this in the browser or use firebase-admin.
// I can't easily query Firestore from node without credentials.
