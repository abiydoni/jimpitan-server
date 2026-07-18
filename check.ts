import { sequelize } from './src/config/database';

async function fix() {
  try {
    await sequelize.query("ALTER TABLE chat_messages MODIFY receiverUid varchar(128) NULL;");
    console.log("Fixed receiverUid to NULL");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

fix();
