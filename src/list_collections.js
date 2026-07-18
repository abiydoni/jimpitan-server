const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const sa = require('../serviceAccountKey.json');

initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function main() {
  // Tampilkan SEMUA koleksi top-level di Firebase
  const collections = await db.listCollections();
  console.log('=== Semua koleksi di Firebase ===');
  for (const col of collections) {
    const snap = await col.get();
    console.log(`  ${col.id}: ${snap.size} dokumen`);
    if (snap.size > 0 && snap.size <= 5) {
      snap.docs.forEach(doc => {
        const keys = Object.keys(doc.data());
        console.log(`    [${doc.id}] fields: ${keys.join(', ')}`);
      });
    }
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
