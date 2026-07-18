const mysql = require('mysql2/promise');
async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'appsbeem_admin',
    password: 'A7by777__',
    database: 'appsbeem_jimpitan_admin'
  });
  const uid = 'YmpD4o05lcPWHZ6yMdxPJeW35wd2';
  const [rows] = await conn.execute(
    'SELECT ur.userId, r.name as role_name, r.id as roleId FROM user_roles ur JOIN roles r ON ur.roleId = r.id WHERE ur.userId = ?',
    [uid]
  );
  console.log('Roles for appsbeem:', JSON.stringify(rows, null, 2));
  process.exit(0);
}
main();
