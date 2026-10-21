import { Request, Response } from 'express';
import { Op } from 'sequelize';
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
        if (email === superAdminEmail()) {
          user = await User.create({
            uid,
            name: name || 'Superadmin appsbee',
            email,
            photoUrl: photoUrl || '',
            status: 'ACTIVE',
          });

          const existingRole = await Role.findOne({ where: { userId: uid, name: 'SUPER_ADMIN' } });
          if (!existingRole) {
            await Role.create({
              id: `role_${uid}_SUPER_ADMIN`,
              name: 'SUPER_ADMIN',
              userId: uid,
              villageId: null,
            });
          }
        } else {
          // Jangan buat record di database jika user baru dan belum memilih/memasukkan kode desa valid.
          // Kembalikan null data sehingga Flutter AuthWrapper langsung mengarahkan ke JoinVillagePage / VillageRegistrationPage
          res.status(200).json({
            success: true,
            message: 'User authenticated, pending village selection',
            data: null,
          });
          return;
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

    let user = await User.findByPk(uid as string);

    // 1. Cek apakah akun ini sudah aktif di desa sebelumnya
    if (user) {
      const currentVillageId = user.getDataValue('villageId');
      const currentStatus = user.getDataValue('status');
      if (villageId && currentVillageId && currentVillageId !== villageId && currentStatus === 'ACTIVE') {
        const currentVillage = await Village.findByPk(currentVillageId);
        const villageName = currentVillage ? currentVillage.getDataValue('name') : 'desa sebelumnya';
        res.status(400).json({
          success: false,
          code: 'ALREADY_IN_OTHER_VILLAGE',
          message: `Akun Google Anda sudah terdaftar sebagai warga aktif di ${villageName}. Anda tidak dapat bergabung ke desa baru.`
        });
        return;
      }
    }

    // 2. Cek apakah NIK yang dimasukkan sudah terdaftar di desa lain
    const cleanNik = req.body.nik ? String(req.body.nik).trim() : null;
    if (cleanNik && villageId) {
      const userWithSameNik = await User.findOne({
        where: {
          nik: cleanNik,
          villageId: { [Op.ne]: villageId }
        }
      });
      if (userWithSameNik) {
        const otherVillage = await Village.findByPk(userWithSameNik.getDataValue('villageId'));
        const otherVillageName = otherVillage ? otherVillage.getDataValue('name') : 'desa lain';
        res.status(400).json({
          success: false,
          code: 'ALREADY_IN_OTHER_VILLAGE',
          message: `NIK ${cleanNik} sudah terdaftar sebagai warga di ${otherVillageName}. Anda tidak dapat bergabung ke desa baru.`
        });
        return;
      }
    }

    if (!user) {
      // Jika user belum ada di database (karena deferred creation saat loginSync),
      // buat user baru jika villageId valid disediakan (misal dari JoinVillagePage)
      if (!villageId) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const village = await Village.findByPk(villageId);
      if (!village) {
        res.status(404).json({ success: false, message: 'Desa tidak ditemukan' });
        return;
      }

      const updateData = pickProfileFields(req.body);
      user = await User.create({
        uid: uid as string,
        name: (updateData.name as string) || (req.body.name as string) || '',
        email: (updateData.email as string) || (req.body.email as string) || '',
        photoUrl: (updateData.photoUrl as string) || (req.body.photoUrl as string) || '',
        status: 'PENDING',
        villageId,
        noKK: (updateData.noKK as string) || (req.body.noKK as string) || null,
        nik: (updateData.nik as string) || (req.body.nik as string) || null,
        phoneNumber: (updateData.phoneNumber as string) || (req.body.phoneNumber as string) || null,
      });

      await assignRoles(uid as string, ['WARGA'], villageId);

      const createdUser = await User.findByPk(uid as string, {
        include: [
          { model: Role, as: 'roles', attributes: ['id', 'name', 'villageId'] },
        ],
      });

      res.status(200).json({
        success: true,
        message: 'Profile created and pending approval',
        data: createdUser ? formatUserWithRoles(createdUser) : user,
      });
      return;
    }

    const updateData = pickProfileFields(req.body);
    
    // SECURITY PATCH: Mencegah eksploitasi status
    // User hanya boleh set status ke PENDING/INCOMPLETE. Status ACTIVE hanya boleh diset oleh sistem/admin.
    if (updateData.status && !['PENDING', 'INCOMPLETE'].includes(updateData.status as string)) {
      delete updateData.status;
    }

    if (Object.keys(updateData).length > 0) {
      await user.update(updateData);
    }
    if (updateData.createdAt) {
      (user as any).setDataValue('createdAt', new Date(updateData.createdAt as string));
      (user as any).changed('createdAt', true);
      await user.save();
    }

    // SECURITY PATCH: Mencegah eksploitasi role
    // User tidak boleh set dirinya sendiri jadi admin.
    let safeRoles = roles;
    if (roles && Array.isArray(roles)) {
      safeRoles = roles.filter(r => r === 'WARGA');
    }

    if (safeRoles && Array.isArray(safeRoles) && safeRoles.length > 0 && villageId) {
      await assignRoles(uid as string, safeRoles, villageId);
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

/**
 * Memeriksa kemiripan dua nama (case-insensitive, mengabaikan tanda baca/gelar).
 * Mengembalikan true jika ada kesamaan kata bermakna atau kemiripan string >= 70%.
 */
function isNameSimilar(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const cleanA = normalize(nameA);
  const cleanB = normalize(nameB);

  if (cleanA === cleanB) return true;
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;

  // Cek kata kunci bermakna (abaikan gelar/singkatan pendek)
  const ignoreWords = new Set(['m', 'h', 'hj', 'haji', 'raden', 'dra', 'drs', 'dr', 'ir', 'st', 'se', 'sh', 'spd', 'skom']);
  const tokensA = cleanA.split(' ').filter(w => w.length > 2 && !ignoreWords.has(w));
  const tokensB = cleanB.split(' ').filter(w => w.length > 2 && !ignoreWords.has(w));

  if (tokensA.length === 0 || tokensB.length === 0) {
    const rawA = cleanA.split(' ');
    const rawB = cleanB.split(' ');
    return rawA.some(t => rawB.includes(t));
  }

  // Jika ada minimal 1 kata kunci yang sama persis
  if (tokensA.some(t => tokensB.includes(t))) return true;

  // Deteksi typo ringan (misal 'Achmad Subagyo' vs 'Ahmad Subagyo')
  const distance = levenshteinDistance(cleanA, cleanB);
  const maxLen = Math.max(cleanA.length, cleanB.length);
  const similarity = 1 - distance / maxLen;

  return similarity >= 0.65;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export const claimAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid, email, name, nik, villageId } = req.body;
    const firebaseUser = (req as AuthRequest).firebaseUser;

    if (!uid || !email || !nik || !villageId) {
      res.status(400).json({ success: false, message: 'UID, Email, NIK, dan Village ID wajib diisi' });
      return;
    }

    if (firebaseUser && firebaseUser.uid !== uid) {
      res.status(403).json({ success: false, message: 'UID tidak sesuai dengan token autentikasi' });
      return;
    }

    const cleanNik = String(nik).trim();
    const existingBulkUser = await User.findOne({ where: { nik: cleanNik, villageId } });

    if (!existingBulkUser) {
      // Cek apakah NIK ini sudah terdaftar di desa lain
      const userInOtherVillage = await User.findOne({
        where: {
          nik: cleanNik,
          villageId: { [Op.ne]: villageId }
        }
      });

      if (userInOtherVillage) {
        const otherVillage = await Village.findByPk(userInOtherVillage.getDataValue('villageId'));
        const otherVillageName = otherVillage ? otherVillage.getDataValue('name') : 'desa lain';
        res.status(400).json({
          success: false,
          code: 'ALREADY_IN_OTHER_VILLAGE',
          message: `NIK ${cleanNik} sudah terdaftar sebagai warga di ${otherVillageName}. Anda tidak dapat bergabung ke desa baru.`
        });
        return;
      }

      res.status(404).json({
        success: false,
        message: `Data dengan NIK "${cleanNik}" tidak ditemukan di desa ini. Pastikan NIK sudah didaftarkan RT atau kosongkan NIK untuk mendaftar sebagai warga baru.`
      });
      return;
    }

    // Validasi kemiripan nama untuk menanggulangi salah ketik NIK orang lain
    const registeredName = (existingBulkUser.getDataValue('name') || '').toString().trim();
    const inputName = (name || '').toString().trim();

    if (inputName && registeredName && !isNameSimilar(inputName, registeredName)) {
      res.status(400).json({
        success: false,
        message: `NIK ${cleanNik} terdaftar atas nama "${registeredName}", yang tidak cocok dengan nama "${inputName}". Periksa kembali NIK yang Anda masukkan.`
      });
      return;
    }

    const oldUid = existingBulkUser.getDataValue('uid');

    if (oldUid !== uid) {
      const { ChatMessage, DuesJournal, JimpitanHistory } = await import('../models');

      await Role.update({ userId: uid }, { where: { userId: oldUid } });

      try {
        await ChatMessage.update({ senderUid: uid }, { where: { senderUid: oldUid } });
        await ChatMessage.update({ receiverUid: uid }, { where: { receiverUid: oldUid } });
      } catch {
        // Abaikan jika error
      }

      // Update referensi kartu keluarga dan iuran
      try {
        await User.update({ familyId: uid }, { where: { familyId: oldUid } });
        await DuesJournal.update({ kkId: uid }, { where: { kkId: oldUid } });
        await JimpitanHistory.update({ kkId: uid }, { where: { kkId: oldUid } });
      } catch {
        // Abaikan jika error
      }

      const tempUser = await User.findByPk(uid);
      if (tempUser) {
        // SECURITY FIX: Hanya hapus user sementara (INCOMPLETE/tanpa desa) bukan warga aktif desa lain
        const tempStatus = tempUser.getDataValue('status');
        const tempVillageId = tempUser.getDataValue('villageId');
        if (tempStatus === 'INCOMPLETE' || !tempVillageId) {
          console.log(`[claimAccount] Menghapus user sementara uid=${uid} (status=${tempStatus}, villageId=${tempVillageId})`);
          await User.destroy({ where: { uid } });
        } else if (tempVillageId !== villageId && tempStatus === 'ACTIVE') {
          const otherVillage = await Village.findByPk(tempVillageId);
          const otherVillageName = otherVillage ? otherVillage.getDataValue('name') : 'desa lain';
          console.warn(`[claimAccount] DIBATALKAN: uid=${uid} sudah merupakan warga aktif desa ${tempVillageId}, tidak dapat diklaim`);
          res.status(409).json({ 
            success: false, 
            code: 'ALREADY_IN_OTHER_VILLAGE',
            message: `Akun Google ini sudah terdaftar sebagai warga aktif di ${otherVillageName}. Anda tidak dapat bergabung ke desa baru.` 
          });
          return;
        } else {
          await User.destroy({ where: { uid } });
        }
      }

      await User.update({
        uid,
        email,
        name: inputName || registeredName,
        status: 'ACTIVE',
      }, { where: { uid: oldUid } });
    } else {
      await User.update({ email, status: 'ACTIVE' }, { where: { uid } });
    }

    // Kirim notifikasi sync ke admin
    try {
      const firebaseService = require('../services/firebaseService');
      firebaseService.sendSyncNotification(villageId, 'REFRESH_USERS');
    } catch {
      // Abaikan jika error
    }

    const claimedUser = await User.findByPk(uid, {
      include: [
        { model: Role, as: 'roles', attributes: ['id', 'name', 'villageId'] },
      ],
    });

    res.json({
      success: true,
      message: 'Akun berhasil disinkronkan langsung dengan data warga Anda!',
      data: claimedUser ? formatUserWithRoles(claimedUser) : null,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

