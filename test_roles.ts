import { Sequelize } from 'sequelize';
import { sequelize } from './src/config/database';
import { Role } from './src/models';

async function check() {
  try {
    const roles = await Role.findAll({ where: { userId: 'WIFWdIPxMjdSSToRjPOf8Y9c0Oa2' } });
    console.log('Roles for WIFW...:', roles.map(r => r.get({ plain: true })));
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

check();
