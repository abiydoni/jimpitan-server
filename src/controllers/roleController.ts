import { Request, Response } from 'express';
import { Role } from '../models';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';

export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;
    
    // Ambil daftar peran (role) unik untuk desa ini atau yang bersifat global
    const roles = await Role.findAll({
      attributes: ['name'],
      where: {
        [Op.or]: [
          { villageId: villageId },
          { villageId: null }
        ]
      },
      group: ['name'], // Hanya ambil yang unik
    });

    const roleNames = roles.map(r => r.getDataValue('name'));

    res.json({ success: true, data: roleNames });
  } catch (error: any) {
    console.error('Error in getRoles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const saveRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;
    const { roles } = req.body; // Array of string

    if (!Array.isArray(roles)) {
      res.status(400).json({ success: false, message: 'roles harus berupa array string' });
      return;
    }

    // Untuk memastikan peran-peran ini ada di database, kita simpan sebagai master (userId = null)
    // agar muncul saat `getRoles` dipanggil meskipun belum di-assign ke user manapun.
    for (const roleName of roles) {
      const existing = await Role.findOne({
        where: {
          name: roleName,
          villageId: villageId,
          userId: null
        }
      });

      if (!existing) {
        await Role.create({
          id: `role_master_${villageId}_${roleName}_${uuidv4().substring(0,8)}`,
          name: roleName,
          villageId: villageId,
          userId: null
        });
      }
    }

    res.json({ success: true, message: 'Jabatan berhasil disimpan' });
  } catch (error: any) {
    console.error('Error in saveRoles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
