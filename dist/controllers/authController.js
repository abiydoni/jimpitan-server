"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimAccount = exports.getUsersByVillage = exports.checkVillageCode = exports.updateProfile = exports.syncUser = exports.loginSync = exports.registerUser = void 0;
const models_1 = require("../models");
/**
 * Registrasi User Baru
 * POST /api/auth/register
 */
const registerUser = async (req, res) => {
    try {
        const { uid, name, email, photoUrl, status, villageId } = req.body;
        if (!uid || !name || !email) {
            res.status(400).json({ success: false, message: 'UID, Name, and Email are required' });
            return;
        }
        // 1. Cek apakah user sudah ada
        const existingUser = await models_1.User.findByPk(uid);
        if (existingUser) {
            res.status(400).json({ success: false, message: 'User already exists' });
            return;
        }
        // 2. Buat User
        const newUser = await models_1.User.create({
            uid,
            name,
            email,
            photoUrl,
            status: status || 'INCOMPLETE',
            villageId: villageId || null
        });
        // 3. Tambahkan Role bawaan (WARGA) jika villageId disertakan
        if (villageId) {
            // Cari atau buat role WARGA
            const [role] = await models_1.Role.findOrCreate({
                where: { name: 'WARGA', villageId },
                defaults: { id: `role_${villageId}_WARGA`, name: 'WARGA', villageId }
            });
            // Pasangkan user dengan role
            await models_1.UserRole.create({
                userId: uid,
                roleId: role.dataValues.id,
                villageId
            });
        }
        res.status(201).json({ success: true, message: 'User registered successfully', data: newUser });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.registerUser = registerUser;
const loginSync = async (req, res) => {
    try {
        const { uid, email, name, photoUrl } = req.body;
        if (!uid || !email) {
            res.status(400).json({ success: false, message: 'UID and Email are required' });
            return;
        }
        let user = await models_1.User.findByPk(uid);
        if (!user) {
            // Cari apakah ada user dengan email tersebut (didaftarkan admin sebelumnya)
            const existingUser = await models_1.User.findOne({ where: { email } });
            if (existingUser) {
                const oldUid = existingUser.getDataValue('uid');
                // Manual cascade update for roles and chat_messages
                if (oldUid !== uid) {
                    const { Role, ChatMessage } = require('../models');
                    await Role.update({ userId: uid }, { where: { userId: oldUid } });
                    await ChatMessage.update({ senderUid: uid }, { where: { senderUid: oldUid } });
                    await ChatMessage.update({ receiverUid: uid }, { where: { receiverUid: oldUid } });
                }
                // Update user lama dengan UID baru dari firebase menggunakan update statis (karena primary key tidak bisa di-update via instance)
                await models_1.User.update({
                    uid,
                    photoUrl: photoUrl || existingUser.getDataValue('photoUrl'),
                }, { where: { uid: oldUid } });
                user = await models_1.User.findByPk(uid);
            }
            else {
                // Buat user baru
                let roles = [];
                let status = 'INCOMPLETE';
                if (email === 'appsbeem@gmail.com') {
                    status = 'ACTIVE';
                    // Kita anggap role SUPER_ADMIN akan dibuat saat join village, atau biarkan kosong tapi punya hardcode check
                }
                user = await models_1.User.create({
                    uid,
                    name: name || (email === 'appsbeem@gmail.com' ? 'Superadmin appsbee' : ''),
                    email,
                    photoUrl: photoUrl || '',
                    status,
                });
                if (email === 'appsbeem@gmail.com') {
                    // Assign Super Admin if needed. We can just create a global SUPER_ADMIN role or handle it on frontend.
                    // For now, frontend handles SUPER_ADMIN manually or checks the email.
                }
            }
        }
        res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.loginSync = loginSync;
/**
 * Mendapatkan Profil User Beserta Role (Untuk Login/Sync)
 * GET /api/auth/sync/:uid
 */
const syncUser = async (req, res) => {
    try {
        const { uid } = req.params;
        const user = await models_1.User.findByPk(uid, {
            include: [
                {
                    model: models_1.Role,
                    through: { attributes: [] } // Tidak menampilkan data tabel pivot (user_roles)
                },
                {
                    model: models_1.Village
                }
            ]
        });
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.status(200).json({ success: true, data: user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.syncUser = syncUser;
/**
 * Mengupdate Profil User
 * PUT /api/auth/profile/:uid
 */
const updateProfile = async (req, res) => {
    try {
        const { uid } = req.params;
        const { name, photoUrl, foto, status, villageId, phoneNumber, agama, pekerjaan, roles, nik, noKK } = req.body;
        const user = await models_1.User.findByPk(uid);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        await user.update(req.body);
        // Update roles if provided
        if (roles && Array.isArray(roles) && villageId) {
            for (const roleName of roles) {
                const [role] = await models_1.Role.findOrCreate({
                    where: { name: roleName, villageId },
                    defaults: { id: `role_${villageId}_${roleName}`, name: roleName, villageId }
                });
                await models_1.UserRole.findOrCreate({
                    where: { userId: uid, roleId: role.dataValues.id, villageId }
                });
            }
        }
        res.status(200).json({ success: true, message: 'Profile updated successfully', data: user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateProfile = updateProfile;
const checkVillageCode = async (req, res) => {
    try {
        const { code } = req.params;
        const village = await models_1.Village.findOne({ where: { villageCode: code } });
        if (!village) {
            res.status(404).json({ success: false, message: 'Village code not found' });
            return;
        }
        res.json({ success: true, data: village });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.checkVillageCode = checkVillageCode;
const getUsersByVillage = async (req, res) => {
    try {
        const { villageId } = req.params;
        const users = await models_1.User.findAll({ where: { villageId } });
        res.json({ success: true, data: users });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getUsersByVillage = getUsersByVillage;
const claimAccount = async (req, res) => {
    try {
        const { uid, email, name, nik, villageId } = req.body;
        if (!uid || !email || !nik || !villageId) {
            res.status(400).json({ success: false, message: 'Missing required fields' });
            return;
        }
        // Cari user asli (input masal) yang punya NIK ini di desa ini
        const existingBulkUser = await models_1.User.findOne({ where: { nik, villageId } });
        if (!existingBulkUser) {
            res.status(404).json({ success: false, message: 'Data dengan NIK tersebut tidak ditemukan di desa ini' });
            return;
        }
        const oldUid = existingBulkUser.getDataValue('uid');
        // Jika uid sama (mungkin sudah pernah klaim), tidak perlu ganti PK
        if (oldUid !== uid) {
            const { Role, ChatMessage } = require('../models');
            // Pindahkan relasi (Cascade manual)
            await Role.update({ userId: uid }, { where: { userId: oldUid } });
            try {
                if (ChatMessage) {
                    await ChatMessage.update({ senderUid: uid }, { where: { senderUid: oldUid } });
                    await ChatMessage.update({ receiverUid: uid }, { where: { receiverUid: oldUid } });
                }
            }
            catch (e) {
                // Abaikan jika model ChatMessage belum terdefinisi atau ada error
            }
            // Hapus temporary user yang dibuat oleh loginSync (jika ada)
            const tempUser = await models_1.User.findByPk(uid);
            if (tempUser) {
                await models_1.User.destroy({ where: { uid } });
            }
            // Update bulk user PK menjadi uid firebase
            await models_1.User.update({
                uid,
                email,
                name: name || existingBulkUser.getDataValue('name'),
                status: 'ACTIVE'
            }, { where: { uid: oldUid } });
        }
        else {
            await models_1.User.update({ email, status: 'ACTIVE' }, { where: { uid } });
        }
        const claimedUser = await models_1.User.findByPk(uid);
        res.json({ success: true, message: 'Account successfully claimed', data: claimedUser });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.claimAccount = claimAccount;
