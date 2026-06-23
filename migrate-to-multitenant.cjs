// Migration Script: Move flat collections to Chapter-based Subcollections
// Run: GOOGLE_CLOUD_PROJECT=rotary-club-of-amity-tvm node migrate-to-multitenant.cjs

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ projectId: 'rotary-club-of-amity-tvm' });
const db = getFirestore();

const CHAPTER_ID = 'amity-tvm';

async function copyCollectionToSubcollection(colName) {
  console.log(`Migrating ${colName}...`);
  const snapshot = await db.collection(colName).get();
  if (snapshot.empty) {
    console.log(`  No docs in ${colName}, skipping.`);
    return;
  }

  const batch = db.batch();
  let count = 0;
  snapshot.forEach(doc => {
    // New path: chapters/amity-tvm/COLLECTION_NAME/DOC_ID
    const newRef = db.collection('chapters').doc(CHAPTER_ID).collection(colName).doc(doc.id);
    batch.set(newRef, doc.data());
    count++;
  });

  await batch.commit();
  console.log(`  ✅ Migrated ${count} docs to chapters/${CHAPTER_ID}/${colName}`);
}

async function migrateMembersToGlobalUsers() {
  console.log(`Migrating members to global users...`);
  const snapshot = await db.collection('members').get();
  if (snapshot.empty) {
    console.log(`  No members found!`);
    return;
  }

  const batch = db.batch();
  let count = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    // Use the member ID as the user ID for simplicity
    const newRef = db.collection('users').doc(doc.id);
    
    // Create the global user object
    batch.set(newRef, {
      ...data,
      chapterId: CHAPTER_ID,
      status: 'active',
      isSuperAdmin: false
    });
    count++;
  });

  await batch.commit();
  console.log(`  ✅ Migrated ${count} members to global users collection.`);
}

async function main() {
  console.log('🚀 Starting Multi-Tenant Migration...');

  // 1. Create the chapter document
  await db.collection('chapters').doc(CHAPTER_ID).set({
    name: 'Rotary Club of Amity Trivandrum',
    status: 'active',
    createdAt: new Date().toISOString()
  });
  console.log(`✅ Created chapter document: ${CHAPTER_ID}`);

  // 2. Migrate members to global 'users' collection
  await migrateMembersToGlobalUsers();

  // 3. Migrate all other collections to chapter subcollections
  const collections = [
    'events',
    'attendance',
    'payments',
    'payment_edits',
    'announcements',
    'tasks',
    'projectNotes',
    'minutes',
    'opinions'
  ];

  for (const col of collections) {
    await copyCollectionToSubcollection(col);
  }

  // Also keep a copy of members in the subcollection for backward compatibility
  // while we refactor the frontend, or for chapter-specific queries if needed.
  await copyCollectionToSubcollection('members');

  console.log('🎉 Migration Complete! Note: Original root collections were NOT deleted for safety.');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
