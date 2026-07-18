const mysql = require('mysql2/promise');
async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'appsbeem_admin',
    password: 'A7by777__',
    database: 'appsbeem_jimpitan_admin'
  });

  // Cek semua user beserta role di roles table
  const [rows] = await conn.execute(
    'SELECT u.uid, u.email, u.villageId, r.id as roleId, r.name as roleName, r.villageId as roleVillageId FROM users u LEFT JOIN roles r ON r.userId = u.uid LIMIT 10'
  );
  console.log('User-Role data:');
  console.log(JSON.stringify(rows, null, 2));

  // Cek data village config untuk menuPermissions
  const [villages] = await conn.execute('SELECT id, name, config FROM villages LIMIT 3');
  for (const v of villages) {
    let config = v.config;
    if (typeof config === 'string') {
      try { config = JSON.parse(config); } catch(e) {}
    }
    console.log('\nVillage:', v.name, '(', v.id, ')');
    if (config && config.menuPermissions) {
      const keys = Object.keys(config.menuPermissions);
      const firstKey = keys[0];
      console.log('  Roles in menuPermissions:', config.menuPermissions[firstKey] ? Object.keys(config.menuPermissions[firstKey]) : 'none');
    } else {
      console.log('  No menuPermissions found');
    }
  }
  process.exit(0);
}
main();
