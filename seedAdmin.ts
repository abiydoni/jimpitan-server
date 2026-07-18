import { User, Role, Village } from './src/models';
import { sequelize } from './src/config/database';

(async () => {
  try {
    await sequelize.authenticate();
    
    // ensure village_001 exists
    await Village.findOrCreate({
      where: { id: 'village_001' },
      defaults: { name: 'Pusat Appsbee', uniqueCode: 'PST001' }
    });

    const [user, created] = await User.findOrCreate({
      where: { uid: 'SUPERADMIN_WEB' },
      defaults: {
        uid: 'SUPERADMIN_WEB',
        name: 'Appsbee Support',
        email: 'superadmin@jimpitan.local',
        status: 'ACTIVE',
        villageId: 'village_001'
      }
    });

    if (!created) {
      await user.update({ name: 'Appsbee Support', villageId: 'village_001', status: 'ACTIVE' });
    }

    await Role.findOrCreate({
      where: { userId: 'SUPERADMIN_WEB', name: 'SUPER_ADMIN' },
      defaults: {
        id: `role_SUPERADMIN_WEB_SUPER_ADMIN`,
        name: 'SUPER_ADMIN',
        userId: 'SUPERADMIN_WEB',
        villageId: 'village_001'
      }
    });

    console.log('Appsbee Support created successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
