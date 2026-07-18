import { Sequelize } from 'sequelize';
import { sequelize } from './src/config/database';
import { User, Role } from './src/models';

async function check() {
  try {
    await sequelize.authenticate();
    const users = await User.findAll({
      include: [{ model: Role, as: 'roles' }],
      limit: 1,
      where: { email: 'abiydoni@gmail.com' }
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

check();
