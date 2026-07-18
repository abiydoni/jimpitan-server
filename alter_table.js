const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function run() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL || "mysql://appsbeem_admin:A7by777__@localhost:3306/appsbeem_jimpitan_admin");
  try {
    await connection.execute('ALTER TABLE users ADD COLUMN statusPerkawinan VARCHAR(50) NULL AFTER statusHubungan;');
    console.log('Successfully added statusPerkawinan column');
  } catch (err) {
    // Abaikan jika sudah ada
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column statusPerkawinan already exists');
    } else {
      console.error('Error:', err);
    }
  } finally {
    await connection.end();
  }
}

run();
