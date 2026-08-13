"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkImportUsers = exports.updateOnlineStatus = exports.removeFcmToken = exports.updateFcmToken = exports.deleteSlide = exports.updateSlide = exports.createSlide = exports.getSlides = exports.deleteMenu = exports.updateMenu = exports.getMenus = exports.linkUserAccount = exports.updateUserRoles = exports.updateUserStatus = exports.getUserById = exports.saveUserFamily = exports.deleteUserFamily = exports.getUsers = exports.registerVillage = exports.deleteVillage = exports.updateVillage = exports.createVillage = exports.getVillageById = exports.getVillages = void 0;
const sequelize_1 = require("sequelize");
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
        const village = await models_1.Village.findByPk(id, {
            include: [
                {
                    model: models_1.VillageSubscription,
                    as: 'subscriptions',
                    required: false
                }
            ]
        });
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
const generateDefaultVillageConfig = async (existingConfig) => {
    const forbiddenForAdminDesa = ['villages', 'menu_master'];
    const wargaMenus = ['scan', 'history', 'chat', 'home', 'profile', 'inventory', 'settings', 'help', 'about'];
    const standardMenuIds = [
        'scan', 'history', 'report', 'chat', 'villages', 'menus', 'menu_master',
        'home', 'profile', 'users', 'manage_roles', 'jadwal', 'tariffs', 'inventory',
        'iuran', 'journals', 'slides', 'exemptions', 'settings', 'help', 'about',
        'scan_manual', 'setor_jimpitan'
    ];
    const dbMenus = await models_1.Menu.findAll();
    const allMenuIds = new Set(standardMenuIds);
    dbMenus.forEach((m) => {
        if (m && m.id)
            allMenuIds.add(m.id);
    });
    const menuPermissions = existingConfig?.menuPermissions ? JSON.parse(JSON.stringify(existingConfig.menuPermissions)) : {};
    allMenuIds.forEach((menuId) => {
        if (!menuPermissions[menuId]) {
            menuPermissions[menuId] = {};
        }
        if (!menuPermissions[menuId]['SUPER_ADMIN']) {
            menuPermissions[menuId]['SUPER_ADMIN'] = { view: true, create: true, edit: true, delete: true };
        }
        if (!menuPermissions[menuId]['ADMIN_DESA'] && !forbiddenForAdminDesa.includes(menuId)) {
            menuPermissions[menuId]['ADMIN_DESA'] = { view: true, create: true, edit: true, delete: true };
        }
        if (!menuPermissions[menuId]['WARGA'] && wargaMenus.includes(menuId)) {
            menuPermissions[menuId]['WARGA'] = { view: true, create: false, edit: false, delete: false };
        }
    });
    return {
        roles: existingConfig?.roles || ['ADMIN_DESA', 'WARGA'],
        currency: existingConfig?.currency || 'IDR',
        timezone: existingConfig?.timezone || 'Asia/Jakarta',
        tariffPermissions: existingConfig?.tariffPermissions || {},
        ...existingConfig,
        menuPermissions
    };
};
const createVillage = async (req, res) => {
    try {
        const id = req.body.id || `village_${(0, uuid_1.v4)().substring(0, 8)}`;
        const config = await generateDefaultVillageConfig(req.body.config);
        const village = await models_1.Village.create({
            ...req.body,
            id,
            config
        });
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
        // 1. Generate random 5 digit code (Hanya Angka)
        const chars = '0123456789';
        let villageCode = '';
        for (let i = 0; i < 5; i++) {
            villageCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const config = await generateDefaultVillageConfig();
        const villageId = `village_${(0, uuid_1.v4)().substring(0, 8)}`;
        // 2. Create new village document
        const village = await models_1.Village.create({
            id: villageId,
            name: villageName,
            address: address + (rtRw ? ` - ${rtRw}` : ''),
            uniqueCode: villageCode,
            config
        }, { transaction });
        const sanitizedEmail = (typeof email === 'string' && email.trim().length > 0)
            ? email.trim()
            : null;
        // 3. Setup user as ADMIN for the new village
        const [user, created] = await models_1.User.findOrCreate({
            where: { uid },
            defaults: {
                uid,
                name: name || 'Admin Desa',
                email: sanitizedEmail,
                photoUrl: photoUrl || '',
                status: 'ACTIVE',
                villageId
            },
            transaction
        });
        if (!created) {
            await user.update({
                status: 'ACTIVE',
                villageId,
                ...(name ? { name } : {}),
                ...(sanitizedEmail ? { email: sanitizedEmail } : {})
            }, { transaction });
        }
        // Assign Role ADMIN_DESA
        await models_1.Role.destroy({ where: { userId: uid }, transaction });
        await models_1.Role.create({
            id: `role_${uid}_ADMIN_DESA_${Date.now()}`,
            name: 'ADMIN_DESA',
            userId: uid,
            villageId
        }, { transaction });
        // Create Master Role ADMIN_DESA (so it exists globally for this village)
        await models_1.Role.create({
            id: `role_master_${villageId}_ADMIN_DESA_${Date.now()}`,
            name: 'ADMIN_DESA',
            userId: null,
            villageId
        }, { transaction });
        // Create Master Role WARGA
        await models_1.Role.create({
            id: `role_master_${villageId}_WARGA_${Date.now()}`,
            name: 'WARGA',
            userId: null,
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
            id: `${villageId}_bill`,
            title: 'Tagihan',
            subtitle: 'Bulan Ini',
            type: 'BILL',
            status: 'Belum Lunas',
            textColor: '#FFFFFF',
            value: 'Lihat Detail',
            villageId
        }, { transaction });
        // 6. Setup 14-days Free Trial Subscription
        let plan = await models_1.SubscriptionPlan.findOne({ where: { name: 'Free Trial' }, transaction });
        if (!plan) {
            plan = await models_1.SubscriptionPlan.create({
                name: 'Free Trial',
                basePrice: 0,
                pricePerKk: 0,
            }, { transaction });
        }
        await models_1.VillageSubscription.create({
            villageId,
            planId: plan.id,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // + 14 days
            autoRenew: false
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
        const roleWhereClause = {};
        if (villageId)
            roleWhereClause.villageId = villageId;
        const users = await models_1.User.findAll({
            where: whereClause,
            include: [{
                    model: models_1.Role,
                    as: 'roles',
                    attributes: ['id', 'name', 'villageId'],
                    where: roleWhereClause,
                    required: false
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
        await models_1.User.destroy({
            where: {
                [sequelize_1.Op.or]: [
                    { familyId },
                    { uid: familyId }
                ]
            }
        });
        const { firebaseService } = require('../services/firebaseService');
        firebaseService.sendSyncNotification(req.body.villageId || 'all', 'REFRESH_USERS');
        res.json({ success: true, message: 'Family or user deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteUserFamily = deleteUserFamily;
const saveUserFamily = async (req, res) => {
    const transaction = await models_1.sequelize.transaction();
    try {
        const { familyId, uniqueCode, villageId, noKK, alamat, address, phone, phoneNumber, familyMembers, deletedDocIds } = req.body;
        // Process deletes
        if (deletedDocIds && Array.isArray(deletedDocIds) && deletedDocIds.length > 0) {
            const validDeletes = deletedDocIds.filter(Boolean);
            if (validDeletes.length > 0) {
                await models_1.User.destroy({ where: { uid: validDeletes }, transaction });
            }
        }
        const familyNoKK = noKK ?? '';
        const familyAlamat = alamat ?? address ?? '';
        const familyPhone = phone ?? phoneNumber ?? '';
        // Process upserts
        if (Array.isArray(familyMembers)) {
            for (const member of familyMembers) {
                const { docId, uid, id, _docId, roles, email, ...userData } = member;
                const targetDocId = (docId || uid || id || _docId || '').toString().trim() ||
                    (`${Date.now()}_${Math.floor(Math.random() * 1000)}`);
                const memberName = (member.name || member.namaLengkap || member.nama || '').toString().trim();
                const memberNoKK = (member.noKK || familyNoKK || '').toString().trim();
                const memberAlamat = (member.alamat || member.address || familyAlamat || '').toString().trim();
                const memberPhone = (member.phoneNumber || member.phone || familyPhone || '').toString().trim();
                // Sanitize email: convert empty string to null so MySQL unique index won't fail
                const sanitizedEmail = (typeof email === 'string' && email.trim().length > 0)
                    ? email.trim()
                    : null;
                const sanitizedMemberData = {
                    ...userData,
                    name: memberName,
                    email: sanitizedEmail,
                    noKK: memberNoKK,
                    alamat: memberAlamat,
                    phoneNumber: memberPhone,
                };
                const [user, created] = await models_1.User.findOrCreate({
                    where: { uid: targetDocId },
                    defaults: {
                        uid: targetDocId,
                        familyId: familyId || targetDocId,
                        uniqueCode: uniqueCode || '',
                        villageId: villageId || '',
                        status: 'ACTIVE',
                        ...sanitizedMemberData
                    },
                    transaction
                });
                if (!created) {
                    await user.update({
                        familyId: familyId || targetDocId,
                        uniqueCode: uniqueCode || user.getDataValue('uniqueCode'),
                        villageId: villageId || user.getDataValue('villageId'),
                        status: 'ACTIVE',
                        ...sanitizedMemberData
                    }, { transaction });
                }
                if (userData.createdAt) {
                    user.setDataValue('createdAt', new Date(userData.createdAt));
                    user.changed('createdAt', true);
                    await user.save({ transaction });
                }
                // Process roles
                if (roles && Array.isArray(roles)) {
                    const stringRoles = roles.map((r) => (typeof r === 'string' ? r : (r?.name || r?.id || 'WARGA'))).filter(Boolean);
                    const uniqueRoles = Array.from(new Set(stringRoles));
                    await models_1.Role.destroy({ where: { userId: targetDocId }, transaction });
                    for (let index = 0; index < uniqueRoles.length; index++) {
                        const roleName = uniqueRoles[index];
                        await models_1.Role.create({
                            id: `ur_${targetDocId}_${roleName}_${Date.now()}_${index}`,
                            name: roleName,
                            userId: targetDocId,
                            villageId: villageId || user.getDataValue('villageId')
                        }, { transaction });
                    }
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
                    include: [
                        {
                            model: models_1.VillageSubscription,
                            as: 'subscriptions',
                            required: false
                        }
                    ]
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
        const users = await models_1.User.findAll({
            where: {
                [sequelize_1.Op.or]: [
                    { uid: uid },
                    { familyId: uid }
                ]
            }
        });
        if (!users || users.length === 0) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const updateData = { status };
        if (villageId)
            updateData.villageId = villageId;
        const primaryFamilyId = users[0].getDataValue('familyId');
        await models_1.User.update(updateData, {
            where: {
                [sequelize_1.Op.or]: [
                    { uid: uid },
                    { familyId: uid },
                    ...(primaryFamilyId ? [{ familyId: primaryFamilyId }] : [])
                ]
            }
        });
        const targetVillageId = villageId || users[0].getDataValue('villageId') || 'all';
        try {
            const { firebaseService } = require('../services/firebaseService');
            firebaseService.sendSyncNotification(targetVillageId, 'REFRESH_USERS');
        }
        catch (e) {
            console.error('Failed to send sync notification:', e);
        }
        res.json({ success: true, message: 'User status updated successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateUserStatus = updateUserStatus;
const updateUserRoles = async (req, res) => {
    const transaction = await models_1.sequelize.transaction();
    try {
        const { uid } = req.params;
        const { roles, villageId } = req.body;
        if (!roles || !Array.isArray(roles)) {
            res.status(400).json({ success: false, message: 'Roles harus berupa array string' });
            await transaction.rollback();
            return;
        }
        const user = await models_1.User.findByPk(uid, { transaction });
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            await transaction.rollback();
            return;
        }
        // Hapus role lama untuk user ini
        await models_1.Role.destroy({ where: { userId: uid }, transaction });
        // Insert role baru
        const uniqueRoles = roles.filter((val, idx, arr) => arr.indexOf(val) === idx);
        for (let index = 0; index < uniqueRoles.length; index++) {
            const roleName = uniqueRoles[index];
            await models_1.Role.create({
                id: `ur_${uid}_${roleName}_${Date.now()}_${index}`,
                name: roleName,
                userId: uid,
                villageId: villageId || user.getDataValue('villageId')
            }, { transaction });
        }
        await transaction.commit();
        try {
            const { firebaseService } = require('../services/firebaseService');
            firebaseService.sendSyncNotification(villageId || user.getDataValue('villageId') || 'all', 'REFRESH_USERS');
        }
        catch (e) {
            console.error('Failed to send sync notification:', e);
        }
        res.json({ success: true, message: 'Roles updated successfully' });
    }
    catch (error) {
        await transaction.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateUserRoles = updateUserRoles;
const linkUserAccount = async (req, res) => {
    const transaction = await models_1.sequelize.transaction();
    try {
        const { pendingUid, targetUid, villageId } = req.body;
        if (!pendingUid || !targetUid) {
            res.status(400).json({ success: false, message: 'pendingUid dan targetUid wajib diisi' });
            await transaction.rollback();
            return;
        }
        if (pendingUid === targetUid) {
            res.json({ success: true, message: 'Data sudah terkait' });
            await transaction.rollback();
            return;
        }
        const pendingUser = await models_1.User.findByPk(pendingUid, { transaction });
        const targetUser = await models_1.User.findByPk(targetUid, { transaction });
        if (!pendingUser || !targetUser) {
            res.status(404).json({ success: false, message: 'User tidak ditemukan di database' });
            await transaction.rollback();
            return;
        }
        const email = pendingUser.getDataValue('email');
        const photoUrl = pendingUser.getDataValue('photoUrl');
        const name = targetUser.getDataValue('name') || pendingUser.getDataValue('name');
        const nik = targetUser.getDataValue('nik');
        const noKK = targetUser.getDataValue('noKK');
        const familyId = targetUser.getDataValue('familyId') === targetUid ? pendingUid : targetUser.getDataValue('familyId');
        const alamat = targetUser.getDataValue('alamat');
        const tempatLahir = targetUser.getDataValue('tempatLahir');
        const tanggalLahir = targetUser.getDataValue('tanggalLahir');
        const jenisKelamin = targetUser.getDataValue('jenisKelamin');
        const agama = targetUser.getDataValue('agama');
        const pekerjaan = targetUser.getDataValue('pekerjaan');
        const statusHubungan = targetUser.getDataValue('statusHubungan');
        const statusPerkawinan = targetUser.getDataValue('statusPerkawinan');
        const uniqueCode = targetUser.getDataValue('uniqueCode');
        const phoneNumber = targetUser.getDataValue('phoneNumber') || pendingUser.getDataValue('phoneNumber');
        const villageIdVal = villageId || targetUser.getDataValue('villageId') || pendingUser.getDataValue('villageId');
        // Update Role
        await models_1.Role.update({ userId: pendingUid }, { where: { userId: targetUid }, transaction });
        // Update ChatMessage
        try {
            await models_1.ChatMessage.update({ senderUid: pendingUid }, { where: { senderUid: targetUid }, transaction });
            await models_1.ChatMessage.update({ receiverUid: pendingUid }, { where: { receiverUid: targetUid }, transaction });
        }
        catch {
            // Abaikan jika error
        }
        // Update User familyId references
        await models_1.User.update({ familyId: pendingUid }, { where: { familyId: targetUid }, transaction });
        // Update DuesJournal and JimpitanHistory references
        try {
            await models_1.DuesJournal.update({ kkId: pendingUid }, { where: { kkId: targetUid }, transaction });
            await models_1.JimpitanHistory.update({ kkId: pendingUid }, { where: { kkId: targetUid }, transaction });
        }
        catch {
            // Abaikan jika error
        }
        // Pertahankan createdAt dari targetUser (warga lama) agar tanggal efektif tidak berubah
        const targetCreatedAt = targetUser.getDataValue('createdAt');
        // Destroy targetUser (the offline dummy record)
        await models_1.User.destroy({ where: { uid: targetUid }, transaction });
        // Update pendingUser with all details and set status ACTIVE
        await pendingUser.update({
            name,
            email,
            photoUrl,
            nik,
            noKK,
            familyId,
            alamat,
            tempatLahir,
            tanggalLahir,
            jenisKelamin,
            agama,
            pekerjaan,
            statusHubungan,
            statusPerkawinan,
            uniqueCode,
            phoneNumber,
            villageId: villageIdVal,
            status: 'ACTIVE'
        }, { transaction });
        if (targetCreatedAt) {
            pendingUser.setDataValue('createdAt', targetCreatedAt);
            pendingUser.changed('createdAt', true);
            await pendingUser.save({ transaction });
        }
        await transaction.commit();
        try {
            const { firebaseService } = require('../services/firebaseService');
            firebaseService.sendSyncNotification(villageIdVal || 'all', 'REFRESH_USERS');
        }
        catch (e) {
            console.error('Failed to send sync notification:', e);
        }
        res.json({ success: true, message: 'Data pendaftar berhasil dikaitkan ke warga lama' });
    }
    catch (error) {
        if (transaction)
            await transaction.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.linkUserAccount = linkUserAccount;
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
        const { villageId } = req.query;
        const whereClause = {};
        if (villageId) {
            whereClause.villageId = villageId;
        }
        const slides = await models_1.Slide.findAll({ where: whereClause });
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
                // Atasi error Duplicate Entry jika email kosong (karena email bersifat unique di DB)
                const sanitizedEmail = (typeof rawEmail === 'string' && rawEmail.trim().length > 0 && rawEmail.includes('@'))
                    ? rawEmail.trim()
                    : null;
                const memberName = (member.name || member.namaLengkap || member.nama || 'Warga').toString().trim();
                const statusKawin = member.statusPerkawinan || member.status_perkawinan || 'Belum Kawin';
                const sanitizedMemberData = {
                    ...userData,
                    name: memberName,
                    email: sanitizedEmail,
                    statusPerkawinan: statusKawin,
                    statusHidup: (member.statusHidup === 'Hidup' ? 'Aktif' : (member.statusHidup || 'Aktif')),
                };
                const [user, created] = await models_1.User.findOrCreate({
                    where: { uid: docId },
                    defaults: {
                        uid: docId,
                        familyId,
                        villageId,
                        status: 'ACTIVE',
                        ...sanitizedMemberData
                    },
                    transaction
                });
                if (!created) {
                    await user.update({
                        familyId,
                        villageId,
                        status: 'ACTIVE',
                        ...sanitizedMemberData
                    }, { transaction });
                }
                if (userData.createdAt) {
                    user.setDataValue('createdAt', new Date(userData.createdAt));
                    user.changed('createdAt', true);
                    await user.save({ transaction });
                }
                // Process roles
                const rawRoles = (roles && Array.isArray(roles) && roles.length > 0) ? roles : ['WARGA'];
                const stringRoles = rawRoles.map((r) => (typeof r === 'string' ? r : (r?.name || r?.id || 'WARGA'))).filter(Boolean);
                const uniqueRoles = Array.from(new Set(stringRoles));
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
