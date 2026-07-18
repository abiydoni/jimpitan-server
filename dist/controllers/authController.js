"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimAccount = exports.getUsersByVillage = exports.checkVillageCode = exports.updateProfile = exports.syncUser = exports.loginSync = exports.registerUser = void 0;
const models_1 = require("../models");
const superAdminEmail = () => process.env.SUPERADMIN_EMAIL || 'appsbeem@gmail.com';
const PROFILE_FIELDS = [
    'name', 'photoUrl', 'foto', 'status', 'villageId', 'phoneNumber',
    'agama', 'pekerjaan', 'nik', 'noKK', 'jenisKelamin', 'tempatLahir',
    'tanggalLahir', 'statusHubungan', 'statusPerkawinan', 'statusHidup',
    'alamat', 'uniqueCode', 'familyId',
];
const pickProfileFields = (body) => {
    const data = {};
    for (const field of PROFILE_FIELDS) {
        if (body[field] !== undefined) {
            data[field] = body[field];
        }
    }
    return data;
};
const assignRoles = async (uid, roles, villageId) => {
    const uniqueRoles = roles.filter((val, idx, arr) => arr.indexOf(val) === idx);
    await models_1.Role.destroy({ where: { userId: uid, villageId } });
    for (let index = 0; index < uniqueRoles.length; index++) {
        const roleName = uniqueRoles[index];
        await models_1.Role.create({
            id: `role_${uid}_${roleName}_${Date.now()}_${index}`,
            name: roleName,
            userId: uid,
            villageId,
        });
    }
};
const formatUserWithRoles = (user) => {
    const userJSON = user.toJSON();
    const roles = userJSON.roles;
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
const registerUser = async (req, res) => {
    try {
        const { uid, name, email, photoUrl, status, villageId } = req.body;
        if (!uid || !name || !email) {
            res.status(400).json({ success: false, message: 'UID, Name, and Email are required' });
            return;
        }
        const existingUser = await models_1.User.findByPk(uid);
        if (existingUser) {
            res.status(400).json({ success: false, message: 'User already exists' });
            return;
        }
        const newUser = await models_1.User.create({
            uid,
            name,
            email,
            photoUrl,
            status: status || 'INCOMPLETE',
            villageId: villageId || null,
        });
        if (villageId) {
            await models_1.Role.create({
                id: `role_${uid}_WARGA_${Date.now()}`,
                name: 'WARGA',
                userId: uid,
                villageId,
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
        const firebaseUser = req.firebaseUser;
        if (!uid || !email) {
            res.status(400).json({ success: false, message: 'UID and Email are required' });
            return;
        }
        if (firebaseUser && firebaseUser.uid !== uid) {
            res.status(403).json({ success: false, message: 'UID tidak sesuai dengan token autentikasi' });
            return;
        }
        let user = await models_1.User.findByPk(uid);
        if (!user) {
            const existingUser = await models_1.User.findOne({ where: { email } });
            if (existingUser) {
                const oldUid = existingUser.getDataValue('uid');
                if (oldUid !== uid) {
                    const { ChatMessage } = await Promise.resolve().then(() => __importStar(require('../models')));
                    await models_1.Role.update({ userId: uid }, { where: { userId: oldUid } });
                    await ChatMessage.update({ senderUid: uid }, { where: { senderUid: oldUid } });
                    await ChatMessage.update({ receiverUid: uid }, { where: { receiverUid: oldUid } });
                }
                await models_1.User.update({
                    uid,
                    photoUrl: photoUrl || existingUser.getDataValue('photoUrl'),
                }, { where: { uid: oldUid } });
                user = await models_1.User.findByPk(uid);
            }
            else {
                let status = 'INCOMPLETE';
                if (email === superAdminEmail()) {
                    status = 'ACTIVE';
                }
                user = await models_1.User.create({
                    uid,
                    name: name || (email === superAdminEmail() ? 'Superadmin appsbee' : ''),
                    email,
                    photoUrl: photoUrl || '',
                    status,
                });
                if (email === superAdminEmail()) {
                    const existingRole = await models_1.Role.findOne({ where: { userId: uid, name: 'SUPER_ADMIN' } });
                    if (!existingRole) {
                        await models_1.Role.create({
                            id: `role_${uid}_SUPER_ADMIN`,
                            name: 'SUPER_ADMIN',
                            userId: uid,
                            villageId: null,
                        });
                    }
                }
            }
        }
        const userWithRoles = await models_1.User.findByPk(uid, {
            include: [
                { model: models_1.Role, as: 'roles', attributes: ['id', 'name', 'villageId'] },
                { model: models_1.Village },
            ],
        });
        res.status(200).json({
            success: true,
            data: userWithRoles ? formatUserWithRoles(userWithRoles) : user,
        });
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
                { model: models_1.Role, as: 'roles', attributes: ['id', 'name', 'villageId'] },
                { model: models_1.Village },
            ],
        });
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.status(200).json({ success: true, data: formatUserWithRoles(user) });
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
        const { roles, villageId } = req.body;
        const user = await models_1.User.findByPk(uid);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const updateData = pickProfileFields(req.body);
        if (Object.keys(updateData).length > 0) {
            await user.update(updateData);
        }
        if (roles && Array.isArray(roles) && villageId) {
            await assignRoles(uid, roles, villageId);
        }
        const updatedUser = await models_1.User.findByPk(uid, {
            include: [
                { model: models_1.Role, as: 'roles', attributes: ['id', 'name', 'villageId'] },
            ],
        });
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser ? formatUserWithRoles(updatedUser) : user,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateProfile = updateProfile;
const checkVillageCode = async (req, res) => {
    try {
        const { code } = req.params;
        const codeStr = String(code);
        const village = await models_1.Village.findOne({ where: { uniqueCode: codeStr.toUpperCase() } });
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
        const firebaseUser = req.firebaseUser;
        if (!uid || !email || !nik || !villageId) {
            res.status(400).json({ success: false, message: 'Missing required fields' });
            return;
        }
        if (firebaseUser && firebaseUser.uid !== uid) {
            res.status(403).json({ success: false, message: 'UID tidak sesuai dengan token autentikasi' });
            return;
        }
        const existingBulkUser = await models_1.User.findOne({ where: { nik, villageId } });
        if (!existingBulkUser) {
            res.status(404).json({ success: false, message: 'Data dengan NIK tersebut tidak ditemukan di desa ini' });
            return;
        }
        const oldUid = existingBulkUser.getDataValue('uid');
        if (oldUid !== uid) {
            const { ChatMessage } = await Promise.resolve().then(() => __importStar(require('../models')));
            await models_1.Role.update({ userId: uid }, { where: { userId: oldUid } });
            try {
                await ChatMessage.update({ senderUid: uid }, { where: { senderUid: oldUid } });
                await ChatMessage.update({ receiverUid: uid }, { where: { receiverUid: oldUid } });
            }
            catch {
                // Abaikan jika model ChatMessage belum terdefinisi atau ada error
            }
            const tempUser = await models_1.User.findByPk(uid);
            if (tempUser) {
                await models_1.User.destroy({ where: { uid } });
            }
            await models_1.User.update({
                uid,
                email,
                name: name || existingBulkUser.getDataValue('name'),
                status: 'ACTIVE',
            }, { where: { uid: oldUid } });
        }
        else {
            await models_1.User.update({ email, status: 'ACTIVE' }, { where: { uid } });
        }
        const claimedUser = await models_1.User.findByPk(uid, {
            include: [
                { model: models_1.Role, as: 'roles', attributes: ['id', 'name', 'villageId'] },
            ],
        });
        res.json({
            success: true,
            message: 'Account successfully claimed',
            data: claimedUser ? formatUserWithRoles(claimedUser) : null,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.claimAccount = claimAccount;
