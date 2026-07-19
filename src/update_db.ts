import { sequelize } from './models';
import { addStartupLog } from './utils/startupLogs';

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    const addCol = async (table: string, col: string, def: string) => {
      try {
        await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
        console.log(`Added ${col} to ${table}`);
      } catch (e: any) {
        if (e.message.includes('Duplicate column name')) {
          console.log(`Column ${col} already exists in ${table}`);
        } else {
          console.error(`Error adding ${col} to ${table}:`, e.message);
        }
      }
    };

    await addCol('jimpitan_history', 'kkId', 'VARCHAR(128) NULL');
    await addCol('jimpitan_history', 'name', 'VARCHAR(255) NULL');
    await addCol('jimpitan_history', 'amount', 'INT NULL DEFAULT 0');
    await addCol('jimpitan_history', 'scannedBy', 'VARCHAR(128) NULL');
    await addCol('jimpitan_history', 'scannedByName', 'VARCHAR(128) NULL');
    await addCol('jimpitan_history', 'timestamp', 'VARCHAR(128) NULL');
    await addCol('jimpitan_history', 'type', 'VARCHAR(50) NULL');

    await addCol('dues_journals', 'paidDates', 'JSON NULL');
    
    // Also add to models/index.ts is needed for paidDates
    console.log('Done!');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

run();
