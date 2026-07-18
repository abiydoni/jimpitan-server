"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkImportUsers = exports.updateOnlineStatus = exports.removeFcmToken = exports.updateFcmToken = exports.deleteSlide = exports.updateSlide = exports.createSlide = exports.getSlides = exports.deleteMenu = exports.updateMenu = exports.getMenus = exports.updateUserStatus = exports.getUserById = exports.saveUserFamily = exports.deleteUserFamily = exports.getUsers = exports.registerVillage = exports.deleteVillage = exports.updateVillage = exports.createVillage = exports.getVillageById = exports.getVillages = void 0;
const models_1 = require("../models");
const uuid_1 = require("uuid");
// Villages
const getVillages = async (req, res) => {
    try {
        const villages = await models_1.Village.findAll();
        res.json({ success: true, data: villages });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getVillages = getVillages;
const getVillageById = async (req, res) => {
    try {
        const { id } = req.params;
        const village = await models_1.Village.findByPk(id);
        if (!village) {
            res.status(404).json({ success: false, message: 'Village not found' });
            return;
        }
        res.json({ success: true, data: village });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getVillageById = getVillageById;
const createVillage = async (req, res) => {
    try {
        const village = await models_1.Village.create(req.body);
        res.json({ success: true, data: village });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createVillage = createVillage;
const updateVillage = async (req, res) => {
    try {
        const { id } = req.params;
        const village = await models_1.Village.findByPk(id);
        if (!village) {
            res.status(404).json({ success: false, message: 'Village not found' });
            return;
        }
        // Untuk config, kita harus parse jika dikirim sebagai JSON string, atau terima as object
        // Karena Sequelize JSON/JSONB otomatis parsing, kita bisa langsung update
        await village.update(req.body);
        res.json({ success: true, data: village });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateVillage = updateVillage;
const deleteVillage = async (req, res) => {
    try {
        const { id } = req.params;
        const village = await models_1.Village.findByPk(id);
        if (!village) {
            res.status(404).json({ success: false, message: 'Village not found' });
            return;
        }
        await village.destroy();
        res.json({ success: true, message: 'Village deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteVillage = deleteVillage;
const registerVillage = async (req, res) => {
    const transaction = await models_1.sequelize.transaction();
    try {
        const { uid, name, email, photoUrl, villageName, address, rtRw } = req.body;
        // 1. Generate random 6 character code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let villageCode = '';
        for (let i = 0; i < 6; i++) {
            villageCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const villageId = `village_${(0, uuid_1.v4)().substring(0, 8)}`;
        // 2. Create new village document
        const village = await models_1.Village.create({
            id: villageId,
            name: villageName,
            address: address + (rtRw ? ` - ${rtRw}` : ''),
            uniqueCode: villageCode,
            config: {
                roles: ['SUPER_ADMIN', 'ADMIN_DESA', 'WARGA'],
                currency: 'IDR',
                timezone: 'Asia/Jakarta'
            }
        }, { transaction });
        // 3. Setup user as ADMIN for the new village
        const [user, created] = await models_1.User.findOrCreate({
            where: { uid },
            defaults: {
                uid,
                name: name || 'Admin Desa',
                email: email || '',
                photoUrl: photoUrl || '',
                status: 'ACTIVE',
                villageId
            },
            transaction
        });
        if (!created) {
            await user.update({
                status: 'ACTIVE',
                villageId
            }, { transaction });
        }
        // Assign Role ADMIN_DESA
        await models_1.Role.create({
            id: `role_${uid}_ADMIN_DESA_${Date.now()}`,
            name: 'ADMIN_DESA',
            userId: uid,
            villageId
        }, { transaction });
        // 4. Setup default Jimpitan tariff
        await models_1.Tariff.create({
            id: `${villageId}_jimpitan`,
            name: 'Jimpitan Default',
            amount: 500,
            type: 'Harian',
            isActive: true,
            villageId
        }, { transaction });
        // 5. Setup default BILL slide
        await models_1.Slide.create({
            id: `slide_${(0, uuid_1.v4)().substring(0, 8)}`,
            title: 'Tagihan',
            subtitle: 'Bulan Ini',
            type: 'BILL',
            status: 'Belum Lunas',
            textColor: '#FFFFFF',
            value: 'Lihat Detail',
            villageId
        }, { transaction });
        await transaction.commit();
        res.status(201).json({ success: true, message: 'Village registered successfully', data: { villageId, villageCode } });
    }
    catch (error) {
        await transaction.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.registerVillage = registerVillage;
// Users
const getUsers = async (req, res) => {
    try {
        const { villageId, status } = req.query;
        const whereClause = {};
        if (villageId)
            whereClause.villageId = villageId;
        if (status)
            whereClause.status = status;
        const users = await models_1.User.findAll({
            where: whereClause,
            include: [{
                    model: models_1.Role,
                    as: 'roles',
                    attributes: ['id', 'name', 'villageId']
                }]
        });
        const formattedUsers = users.map((u) => {
            const userJSON = u.toJSON();
            if (userJSON.roles) {
                userJSON.roles = userJSON.roles.map((r) => r.name).filter((val, idx, arr) => arr.indexOf(val) === idx);
            }
            return userJSON;
        });
        res.json({ success: true, data: formattedUsers });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getUsers = getUsers;
const deleteUserFamily = async (req, res) => {
    try {
        const { familyId } = req.params;
        await models_1.User.destroy({ where: { familyId } });
        const { firebaseService } = require('../services/firebaseService');
        firebaseService.sendSyncNotification(req.body.villageId || 'all', 'REFRESH_USERS');
        res.json({ success: true, message: 'Family deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteUserFamily = deleteUserFamily;
const saveUserFamily = async (req, res) => {
    const transaction = await models_1.sequelize.transaction();
    try {
        const { familyId, uniqueCode, villageId, familyMembers, deletedDocIds } = req.body;
        // Process deletes
        if (deletedDocIds && deletedDocIds.length > 0) {
            await models_1.User.destroy({ where: { uid: deletedDocIds }, transaction });
        }
        // Process upserts
        for (const member of familyMembers) {
            const { docId, roles, ...userData } = member;
            const [user, created] = await models_1.User.findOrCreate({
                where: { uid: docId },
                defaults: {
                    uid: docId,
                    familyId,
                    uniqueCode,
                    villageId,
                    status: 'ACTIVE',
                    ...userData
                },
                transaction
            });
            if (!created) {
                await user.update({
                    familyId,
                    uniqueCode,
                    villageId,
                    status: 'ACTIVE',
                    ...userData
                }, { transaction });
            }
            // Process roles
            if (roles && Array.isArray(roles)) {
                const uniqueRoles = roles.filter((val, idx, arr) => arr.indexOf(val) === idx);
                await models_1.Role.destroy({ where: { userId: docId }, transaction });
                for (let index = 0; index < uniqueRoles.length; index++) {
                    const roleName = uniqueRoles[index];
                    await models_1.Role.create({
                        id: `ur_${docId}_${roleName}_${Date.now()}_${index}`,
                        name: roleName,
                        userId: docId,
                        villageId
                    }, { transaction });
                }
            }
        }
        await transaction.commit();
        res.json({ success: true, message: 'Family saved successfully' });
    }
    catch (error) {
        const fs = require('fs');
        try {
            fs.writeFileSync('save_error.log', JSON.stringify({ message: error.message, stack: error.stack, type: error.name }, null, 2));
        }
        catch (e) {
            console.error('Failed to write save_error.log', e);
        }
        console.error('SAVE ERROR:', error);
        await transaction.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.saveUserFamily = saveUserFamily;
const getUserById = async (req, res) => {
    try {
        const { uid } = req.params;
        const user = await models_1.User.findByPk(uid, {
            include: [
                {
                    model: models_1.Role,
                    as: 'roles',
                    attributes: ['id', 'name', 'villageId'],
                },
                {
                    model: models_1.Village,
                    attributes: ['id', 'name', 'config'],
                }
            ]
        });
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const userJSON = user.toJSON();
        if (userJSON.roles) {
            userJSON.roles = userJSON.roles.map((r) => r.name).filter((val, idx, arr) => arr.indexOf(val) === idx);
        }
        res.json({ success: true, data: userJSON });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getUserById = getUserById;
const updateUserStatus = async (req, res) => {
    try {
        const { uid } = req.params;
        const { status, villageId } = req.body;
        const user = await models_1.User.findByPk(uid);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        await user.update({ status, villageId });
        res.json({ success: true, data: user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateUserStatus = updateUserStatus;
// Menus
const getMenus = async (req, res) => {
    try {
        const menus = await models_1.Menu.findAll({
            order: [['order', 'ASC']]
        });
        res.json({ success: true, data: menus });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMenus = getMenus;
const updateMenu = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive, description, villageId, label, icon, order, position, isCore } = req.body;
        const [menu, created] = await models_1.Menu.findOrCreate({
            where: { id },
            defaults: { isActive, description, villageId, label, icon, order, position, isCore }
        });
        if (!created) {
            await menu.update({ isActive, description, villageId, label, icon, order, position, isCore });
        }
        res.json({ success: true, data: menu });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateMenu = updateMenu;
const deleteMenu = async (req, res) => {
    try {
        const { id } = req.params;
        await models_1.Menu.destroy({ where: { id } });
        res.json({ success: true, message: 'Menu deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteMenu = deleteMenu;
// Slides
const getSlides = async (req, res) => {
    try {
        const slides = await models_1.Slide.findAll();
        res.json({ success: true, data: slides });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSlides = getSlides;
const createSlide = async (req, res) => {
    try {
        const { id, title, subtitle, type, imageBase64, textColor, value, status, villageId } = req.body;
        const slide = await models_1.Slide.create({ id, title, subtitle, type, imageBase64, textColor, value, status, villageId });
        res.json({ success: true, data: slide });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createSlide = createSlide;
const updateSlide = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, subtitle, type, imageBase64, textColor, value, status, villageId } = req.body;
        const slide = await models_1.Slide.findByPk(id);
        if (!slide) {
            res.status(404).json({ success: false, message: 'Slide not found' });
            return;
        }
        await slide.update({ title, subtitle, type, imageBase64, textColor, value, status, villageId });
        res.json({ success: true, data: slide });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateSlide = updateSlide;
const deleteSlide = async (req, res) => {
    try {
        const { id } = req.params;
        await models_1.Slide.destroy({ where: { id } });
        res.json({ success: true, message: 'Slide deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteSlide = deleteSlide;
// FCM Token
const updateFcmToken = async (req, res) => {
    try {
        const { uid } = req.params;
        // Support both 'token' and 'fcmToken' field names from Flutter
        const fcmToken = req.body.token ?? req.body.fcmToken;
        if (!fcmToken) {
            res.status(400).json({ success: false, message: 'token is required' });
            return;
        }
        await models_1.User.update({ fcmToken }, { where: { uid } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateFcmToken = updateFcmToken;
const removeFcmToken = async (req, res) => {
    try {
        const { uid } = req.params;
        await models_1.User.update({ fcmToken: null }, { where: { uid } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.removeFcmToken = removeFcmToken;
const updateOnlineStatus = async (req, res) => {
    try {
        const { uid } = req.params;
        const { isOnline } = req.body;
        const updateData = { isOnline: !!isOnline };
        if (!isOnline) {
            updateData.lastSeen = new Date();
        }
        await models_1.User.update(updateData, { where: { uid } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateOnlineStatus = updateOnlineStatus;
const bulkImportUsers = async (req, res) => {
    const transaction = await models_1.sequelize.transaction();
    try {
        const { villageId, users } = req.body;
        if (!users || !Array.isArray(users)) {
            res.status(400).json({ success: false, message: 'Invalid users data' });
            return;
        }
        // Group by noKK (Nomor Kartu Keluarga)
        const families = {};
        for (const u of users) {
            const code = u.noKK || 'NO_KK';
            if (!families[code])
                families[code] = [];
            families[code].push(u);
        }
        for (const [code, members] of Object.entries(families)) {
            // Find if familyId exists for this noKK
            let familyId = `FAM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const existingUser = await models_1.User.findOne({ where: { noKK: code, villageId }, transaction });
            if (existingUser && existingUser.getDataValue('familyId')) {
                familyId = existingUser.getDataValue('familyId');
            }
            for (const member of members) {
                let docId = member.nik ? `UID-${member.nik}` : `UID-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                const { roles, email, ...userData } = member;
                let rawEmail = email ? email.trim() : '';
                if (rawEmail === '-' || rawEmail.toLowerCase() === 'kosong' || rawEmail === '.') {
                    rawEmail = '';
                }
                // Atasi error Duplicate Entry jika email kosong (karena email bersifat unique dan notNull di DB)
                const finalEmail = (rawEmail !== '') ? rawEmail : `dummy_${docId}@noemail.com`;
                const [user, created] = await models_1.User.findOrCreate({
                    where: { uid: docId },
                    defaults: {
                        uid: docId,
                        familyId,
                        villageId,
                        status: 'ACTIVE',
                        email: finalEmail,
                        ...userData
                    },
                    transaction
                });
                if (!created) {
                    await user.update({
                        familyId,
                        villageId,
                        status: 'ACTIVE',
                        email: finalEmail,
                        ...userData
                    }, { transaction });
                }
                // Process roles
                if (roles && Array.isArray(roles)) {
                    const uniqueRoles = roles.filter((val, idx, arr) => arr.indexOf(val) === idx);
                    await models_1.Role.destroy({ where: { userId: docId }, transaction });
                    for (let index = 0; index < uniqueRoles.length; index++) {
                        const roleName = uniqueRoles[index];
                        await models_1.Role.create({
                            id: `ur_${docId}_${roleName}_${Date.now()}_${index}`,
                            userId: docId,
                            name: roleName,
                            villageId
                        }, { transaction });
                    }
                }
            }
        }
        await transaction.commit();
        res.json({ success: true, message: 'Users imported successfully' });
    }
    catch (error) {
        await transaction.rollback();
        let errorMessage = error.message;
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            errorMessage = error.errors.map((e) => {
                if (e.path === 'email' && e.type === 'unique violation') {
                    return `Email '${e.value}' sudah digunakan oleh orang lain. Email tidak boleh kembar/sama, silakan kosongkan (hapus isi kolom email) jika tidak punya.`;
                }
                return e.message;
            }).join(', ');
        }
        res.status(500).json({ success: false, message: errorMessage });
    }
};
exports.bulkImportUsers = bulkImportUsers;
