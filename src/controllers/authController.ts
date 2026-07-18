import { Request, Response } from 'express';
import { User, Role, Village } from '../models';
import { AuthRequest } from '../middlewares/authMiddleware';

const superAdminEmail = () => process.env.SUPERADMIN_EMAIL || 'appsbeem@gmail.com';

const PROFILE_FIELDS = [
  'name', 'photoUrl', 'foto', 'status', 'villageId', 'phoneNumber',
  'agama', 'pekerjaan', 'nik', 'noKK', 'jenisKelamin', 'tempatLahir',
  'tanggalLahir', 'statusHubungan', 'statusPerkawinan', 'statusHidup',
  'alamat', 'uniqueCode', 'familyId', 'createdAt',
] as const;

const pickProfileFields = (body: Record<string, unknown>) => {
  const data: Record<string, unknown> = {};
  for (const field of PROFILE_FIELDS) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }
  return data;
};

const assignRoles = async (uid: string, roles: string[], villageId: string) => {
  const uniqueRoles = roles.filter((val, idx, arr) => arr.indexOf(val) === idx);
  await Role.destroy({ where: { userId: uid, villageId } });
  for (let index = 0; index < uniqueRoles.length; index++) {
    const roleName = uniqueRoles[index];
    await Role.create({
      id: `role_${uid}_${roleName}_${Date.now()}_${index}`,
      name: roleName,
      userId: uid,
      villageId,
    });
  }
};

const formatUserWithRoles = (user: User) => {
  const userJSON = user.toJSON() as Record<string, unknown>;
  const roles = userJSON.roles as Array<{ name: string }> | undefined;
  if (roles) {
    userJSON.roles = roles
      .map((r) => r.name)
      .filter((val, idx, arr) => arr.indexOf(val) === idx);
  }
  return userJSON;
};

/**
 * Registrasi User Baru
 * POST /api/auth/register
 */
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid, name, email, photoUrl, status, villageId } = req.body;

    if (!uid || !name || !email) {
      res.status(400).json({ success: false, message: 'UID, Name, and Email are required' });
      return;
    }

    const existingUser = await User.findByPk(uid);
    if (existingUser) {
      res.status(400).json({ success: false, message: 'User already exists' });
      return;
    }

    const newUser = await User.create({
      uid,
      name,
      email,
      photoUrl,
      status: status || 'INCOMPLETE',
      villageId: villageId || null,
    });

    if (villageId) {
      await Role.create({
        id: `role_${uid}_WARGA_${Date.now()}`,
        name: 'WARGA',
        userId: uid,
        villageId,
      });
    }

    res.status(201).json({ success: true, message: 'User registered successfully', data: newUser });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const loginSync = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid, email, name, photoUrl } = req.body;
    const firebaseUser = (req as AuthRequest).firebaseUser;

    if (!uid || !email) {
      res.status(400).json({ success: false, message: 'UID and Email are required' });
      return;
    }

    if (firebaseUser && firebaseUser.uid !== uid) {
      res.status(403).json({ success: false, message: 'UID tidak sesuai dengan token autentikasi' });
      return;
    }

    let user = await User.findByPk(uid);

    if (!user) {
      const existingUser = await User.findOne({ where: { email } });

      if (existingUser) {
        const oldUid = existingUser.getDataValue('uid');

        if (oldUid !== uid) {
          const { ChatMessage } = await import('../models');
          await Role.update({ userId: uid }, { where: { userId: oldUid } });
          await ChatMessage.update({ senderUid: uid }, { where: { senderUid: oldUid } });
          await ChatMessage.update({ receiverUid: uid }, { where: { receiverUid: oldUid } });
        }

        await User.update({
          uid,
          photoUrl: photoUrl || existingUser.getDataValue('photoUrl'),
        }, { where: { uid: oldUid } });

        user = await User.findByPk(uid);
      } else {
        let status = 'INCOMPLETE';

        if (email === superAdminEmail()) {
          status = 'ACTIVE';
        }

        user = await User.create({
          uid,
          name: name || (email === superAdminEmail() ? 'Superadmin appsbee' : ''),
          email,
          photoUrl: photoUrl || '',
          status,
        });

        if (email === superAdminEmail()) {
          const existingRole = await Role.findOne({ where: { userId: uid, name: 'SUPER_ADMIN' } });
          if (!existingRole) {
            await Role.create({
              id: `role_${uid}_SUPER_ADMIN`,
              name: 'SUPER_ADMIN',
              userId: uid,
              villageId: null,
            });
          }
        }
      }
    }

    const userWithRoles = await User.findByPk(uid, {
      include: [
        { model: Role, as: 'roles', attributes: ['id', 'name', 'villageId'] },
        { model: Village },
      ],
    });

    res.status(200).json({
      success: true,
      data: userWithRoles ? formatUserWithRoles(userWithRoles) : user,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Mendapatkan Profil User Beserta Role (Untuk Login/Sync)
 * GET /api/auth/sync/:uid
 */
export const syncUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;

    const user = await User.findByPk(uid as string, {
      include: [
        { model: Role, as: 'roles', attributes: ['id', 'name', 'villageId'] },
        { model: Village },
      ],
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({ success: true, data: formatUserWithRoles(user) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Mengupdate Profil User
 * PUT /api/auth/profile/:uid
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const { roles, villageId } = req.body;

    const user = await User.findByPk(uid as string);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const updateData = pickProfileFields(req.body);
    if (Object.keys(updateData).length > 0) {
      await user.update(updateData);
    }
    if (updateData.createdAt) {
      (user as any).setDataValue('createdAt', new Date(updateData.createdAt as string));
      (user as any).changed('createdAt', true);
      await user.save();
    }

    if (roles && Array.isArray(roles) && villageId) {
      await assignRoles(uid as string, roles, villageId);
    }

    const updatedUser = await User.findByPk(uid as string, {
      include: [
        { model: Role, as: 'roles', attributes: ['id', 'name', 'villageId'] },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser ? formatUserWithRoles(updatedUser) : user,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const checkVillageCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const codeStr = String(code);
    const village = await Village.findOne({ where: { uniqueCode: codeStr.toUpperCase() } });
    if (!village) {
      res.status(404).json({ success: false, message: 'Village code not found' });
      return;
    }
    res.json({ success: true, data: village });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUsersByVillage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;
    const users = await User.findAll({ where: { villageId } });
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const claimAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid, email, name, nik, villageId } = req.body;
    const firebaseUser = (req as AuthRequest).firebaseUser;

    if (!uid || !email || !nik || !villageId) {
      res.status(400).json({ success: false, message: 'Missing required fields' });
      return;
    }

    if (firebaseUser && firebaseUser.uid !== uid) {
      res.status(403).json({ success: false, message: 'UID tidak sesuai dengan token autentikasi' });
      return;
    }

    const existingBulkUser = await User.findOne({ where: { nik, villageId } });

    if (!existingBulkUser) {
      res.status(404).json({ success: false, message: 'Data dengan NIK tersebut tidak ditemukan di desa ini' });
      return;
    }

    const oldUid = existingBulkUser.getDataValue('uid');

    if (oldUid !== uid) {
      const { ChatMessage } = await import('../models');

      await Role.update({ userId: uid }, { where: { userId: oldUid } });

      try {
        await ChatMessage.update({ senderUid: uid }, { where: { senderUid: oldUid } });
        await ChatMessage.update({ receiverUid: uid }, { where: { receiverUid: oldUid } });
      } catch {
        // Abaikan jika model ChatMessage belum terdefinisi atau ada error
      }

      const tempUser = await User.findByPk(uid);
      if (tempUser) {
        await User.destroy({ where: { uid } });
      }

      await User.update({
        uid,
        email,
        name: name || existingBulkUser.getDataValue('name'),
        status: 'ACTIVE',
      }, { where: { uid: oldUid } });
    } else {
      await User.update({ email, status: 'ACTIVE' }, { where: { uid } });
    }

    const claimedUser = await User.findByPk(uid, {
      include: [
        { model: Role, as: 'roles', attributes: ['id', 'name', 'villageId'] },
      ],
    });

    res.json({
      success: true,
      message: 'Account successfully claimed',
      data: claimedUser ? formatUserWithRoles(claimedUser) : null,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
