const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const mysql = require('mysql2/promise');
const sa = require('../serviceAccountKey.json');

initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'appsbeem_admin',
    password: 'A7by777__',
    database: 'appsbeem_jimpitan_admin'
  });

  // Ambil semua user dari Firebase
  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} users in Firebase`);

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const uid = userDoc.id;
    const roles = data.roles; // Array of role strings
    const villageId = data.villageId || null; // undefined → null

    if (!roles || !Array.isArray(roles) || roles.length === 0) continue;

    console.log(`\nUser ${data.email} (${uid}): roles=${JSON.stringify(roles)}, village=${villageId}`);

    for (const roleName of roles) {
      const roleId = `role_${villageId || 'global'}_${roleName}_${uid.substring(0, 6)}`;

      // Cek apakah sudah ada
      const [existing] = await conn.execute(
        'SELECT id FROM roles WHERE userId = ? AND name = ? AND (villageId = ? OR (villageId IS NULL AND ? IS NULL))',
        [uid, roleName, villageId, villageId]
      );

      if (existing.length === 0) {
        await conn.execute(
          'INSERT IGNORE INTO roles (id, name, userId, villageId, createdAt) VALUES (?, ?, ?, ?, NOW())',
          [roleId, roleName, uid, villageId || null]
        );
        console.log(`  -> Inserted role ${roleName} for user`);
      } else {
        console.log(`  -> Role ${roleName} already exists`);
      }
    }
  }

  console.log('\nDone! Verifying...');
  const [allRoles] = await conn.execute(
    'SELECT u.email, r.name as role, r.villageId FROM roles r JOIN users u ON u.uid = r.userId'
  );
  console.log(JSON.stringify(allRoles, null, 2));

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
