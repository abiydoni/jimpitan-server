"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivityLogs = exports.bulkImportUsers = exports.updateOnlineStatus = exports.removeFcmToken = exports.updateFcmToken = exports.deleteSlide = exports.updateSlide = exports.createSlide = exports.getSlides = exports.deleteMenu = exports.updateMenu = exports.getMenus = exports.linkUserAccount = exports.updateUserRoles = exports.updateUserStatus = exports.deleteUser = exports.cleanupIncompleteUsers = exports.getUserById = exports.saveUserFamily = exports.moveUserFamily = exports.deleteUserFamily = exports.getUsers = exports.registerVillage = exports.notifyVillageManual = exports.deleteVillage = exports.updateVillage = exports.createVillage = exports.generateResidentUniqueCode = exports.getVillageById = exports.getVillages = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const uuid_1 = require("uuid");
const jakartaTime_1 = require("../utils/jakartaTime");
const notificationHelper_1 = require("../utils/notificationHelper");
const activityLogger_1 = require("../utils/activityLogger");
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
const generateResidentUniqueCode = async (transaction) => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let isUnique = false;
    let code = '';
    while (!isUnique) {
        let suffix = '';
        for (let i = 0; i < 7; i++) {
            suffix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        code = `JMP${suffix}`;
        const existing = await models_1.User.findOne({
            where: { uniqueCode: code },
            transaction
        });
        if (!existing) {
            isUnique = true;
        }
    }
    return code;
};
exports.generateResidentUniqueCode = generateResidentUniqueCode;
const createVillage = async (req, res) => {
    try {
        const id = req.body.id || `village_${(0, uuid_1.v4)().substring(0, 8)}`;
        const config = await generateDefaultVillageConfig(req.body.config);
        const village = await models_1.Village.create({
            ...req.body,
            id,
            config
        });
        // Kirim notifikasi otomatis ke Chat Admin Pusat
        (0, notificationHelper_1.notifyAdminPusatNewVillage)({
            villageId: id,
            villageName: village.getDataValue('name') || req.body.name || 'Desa Baru',
            uniqueCode: village.getDataValue('uniqueCode') || req.body.uniqueCode || '-',
            address: village.getDataValue('address') || req.body.address || '-',
            registrantName: 'Admin Web',
            registrantPhone: req.body.contactInfo || null
        }).catch(err => console.error('Error notifying admin pusat in createVillage:', err));
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
        const villageUniqueCode = village.uniqueCode;
        // Cari semua UID user yang terikat ke desa ini (baik via villageId maupun uniqueCode)
        const villageUsers = await models_1.User.findAll({
            where: {
                [sequelize_1.Op.or]: [
                    { villageId: id },
                    ...(villageUniqueCode ? [{ uniqueCode: villageUniqueCode }] : [])
                ]
            },
            attributes: ['uid']
        });
        const userUids = villageUsers.map((u) => u.uid).filter(Boolean);
        await models_1.sequelize.transaction(async (t) => {
            // 1. Group Read States
            await models_1.GroupReadState.destroy({
                where: {
                    [sequelize_1.Op.or]: [
                        { roomId: `GROUP_${id}` },
                        ...(userUids.length > 0 ? [{ userId: { [sequelize_1.Op.in]: userUids } }] : [])
                    ]
                },
                transaction: t
            });
            // 2. Chat Messages
            await models_1.ChatMessage.destroy({
                where: {
                    [sequelize_1.Op.or]: [
                        { villageId: id },
                        { roomId: `GROUP_${id}` },
                        ...(userUids.length > 0 ? [
                            { senderUid: { [sequelize_1.Op.in]: userUids } },
                            { receiverUid: { [sequelize_1.Op.in]: userUids } }
                        ] : [])
                    ]
                },
                transaction: t
            });
            // 3. Jimpitan History
            await models_1.JimpitanHistory.destroy({ where: { villageId: id }, transaction: t });
            // 4. Dues Journal
            await models_1.DuesJournal.destroy({ where: { villageId: id }, transaction: t });
            // 5. Inventory Loans & Items
            await models_1.InventoryLoan.destroy({ where: { villageId: id }, transaction: t });
            await models_1.InventoryItem.destroy({ where: { villageId: id }, transaction: t });
            // 6. Exemptions & Tariffs
            await models_1.Exemption.destroy({ where: { villageId: id }, transaction: t });
            await models_1.Tariff.destroy({ where: { villageId: id }, transaction: t });
            // 7. Schedules
            await models_1.Schedule.destroy({ where: { villageId: id }, transaction: t });
            // 8. Slides
            await models_1.Slide.destroy({ where: { villageId: id }, transaction: t });
            // 9. Menus
            await models_1.Menu.destroy({ where: { villageId: id }, transaction: t });
            // 10. Roles
            await models_1.Role.destroy({
                where: {
                    [sequelize_1.Op.or]: [
                        { villageId: id },
                        ...(userUids.length > 0 ? [{ userId: { [sequelize_1.Op.in]: userUids } }] : [])
                    ]
                },
                transaction: t
            });
            // 11. SaaS Invoices & Village Subscriptions
            await models_1.Invoice.destroy({ where: { villageId: id }, transaction: t });
            await models_1.VillageSubscription.destroy({ where: { villageId: id }, transaction: t });
            // 12. WA Blast History
            await models_1.WaBlastHistory.destroy({ where: { villageId: id }, transaction: t });
            // 13. Users
            await models_1.User.destroy({
                where: {
                    [sequelize_1.Op.or]: [
                        { villageId: id },
                        ...(villageUniqueCode ? [{ uniqueCode: villageUniqueCode }] : [])
                    ]
                },
                transaction: t
            });
            // 14. Village
            await village.destroy({ transaction: t });
        });
        res.json({ success: true, message: 'Village and all associated data deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteVillage = deleteVillage;
const notifyVillageManual = async (req, res) => {
    try {
        const { id } = req.params;
        const village = await models_1.Village.findByPk(id);
        if (!village) {
            res.status(404).json({ success: false, message: 'Desa tidak ditemukan' });
            return;
        }
        // Cari admin desa yang terdaftar untuk desa ini
        const adminRole = await models_1.Role.findOne({
            where: {
                villageId: id,
                name: 'ADMIN_DESA',
                userId: { [sequelize_1.Op.ne]: null }
            }
        });
        let registrantUser = null;
        if (adminRole && adminRole.getDataValue('userId')) {
            registrantUser = await models_1.User.findByPk(adminRole.getDataValue('userId'));
        }
        if (!registrantUser) {
            registrantUser = await models_1.User.findOne({ where: { villageId: id } });
        }
        await (0, notificationHelper_1.notifyAdminPusatNewVillage)({
            villageId: id,
            villageName: village.getDataValue('name'),
            uniqueCode: village.getDataValue('uniqueCode'),
            address: village.getDataValue('address'),
            registrantUid: registrantUser ? registrantUser.getDataValue('uid') : null,
            registrantName: registrantUser ? registrantUser.getDataValue('name') : 'Admin Desa',
            registrantPhone: registrantUser ? (registrantUser.getDataValue('phoneNumber') || registrantUser.getDataValue('phone')) : null,
            registrantEmail: registrantUser ? registrantUser.getDataValue('email') : null
        });
        res.json({
            success: true,
            message: `Notifikasi chat pendaftaran desa "${village.getDataValue('name')}" berhasil dikirim!`,
            data: {
                villageName: village.getDataValue('name'),
                uniqueCode: village.getDataValue('uniqueCode'),
                registrantName: registrantUser ? registrantUser.getDataValue('name') : 'Admin Desa'
            }
        });
    }
    catch (error) {
        console.error('Error in notifyVillageManual:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.notifyVillageManual = notifyVillageManual;
const registerVillage = async (req, res) => {
    const transaction = await models_1.sequelize.transaction();
    try {
        const { uid, name, email, photoUrl, villageName, address, rtRw, noKK, nik, phone, phoneNumber } = req.body;
        const finalPhone = (phone || phoneNumber) ? String(phone || phoneNumber).trim() : null;
        const finalNoKK = noKK ? String(noKK).trim() : null;
        const finalNik = nik ? String(nik).trim() : null;
        const finalVillageName = villageName ? String(villageName).trim() : null;
        const finalAddress = address ? String(address).trim() : null;
        const finalRtRw = rtRw ? String(rtRw).trim() : null;
        if (!uid || !finalVillageName || !finalAddress || !finalRtRw || !finalNoKK || !finalNik || !finalPhone) {
            await transaction.rollback();
            res.status(400).json({
                success: false,
                message: 'Seluruh data wajib diisi lengkap (Nama Desa, Alamat, RT/RW, No KK, NIK, dan Nomor HP/WhatsApp).'
            });
            return;
        }
        // Cek apakah akun ini sudah aktif di desa lain
        const existingUser = await models_1.User.findByPk(uid, { transaction });
        if (existingUser && existingUser.getDataValue('villageId') && existingUser.getDataValue('status') === 'ACTIVE') {
            await transaction.rollback();
            res.status(400).json({
                success: false,
                message: 'Akun Google ini sudah terdaftar sebagai warga/admin di desa lain. Silakan gunakan akun lain untuk membuat desa baru.'
            });
            return;
        }
        // Cek apakah NIK sudah digunakan di database
        const existingUserWithNik = await models_1.User.findOne({
            where: {
                nik: finalNik,
                uid: { [sequelize_1.Op.ne]: uid }
            },
            transaction
        });
        if (existingUserWithNik) {
            await transaction.rollback();
            res.status(400).json({
                success: false,
                message: 'NIK tersebut sudah terdaftar di sistem. Silakan periksa kembali atau gunakan NIK Anda yang benar.'
            });
            return;
        }
        // Cek apakah No KK sudah terdaftar di database
        const existingUserWithNoKK = await models_1.User.findOne({
            where: {
                noKK: finalNoKK,
                uid: { [sequelize_1.Op.ne]: uid }
            },
            transaction
        });
        if (existingUserWithNoKK) {
            await transaction.rollback();
            res.status(400).json({
                success: false,
                message: 'Nomor Kartu Keluarga (KK) tersebut sudah terdaftar di sistem. Silakan periksa kembali atau gunakan Nomor KK Anda yang benar.'
            });
            return;
        }
        // 1. Generate random 5 digit code (Hanya Angka)
        const chars = '0123456789';
        let villageCode = '';
        for (let i = 0; i < 5; i++) {
            villageCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const config = await generateDefaultVillageConfig();
        const villageId = `village_${(0, uuid_1.v4)().substring(0, 8)}`;
        const fullAddress = ((address || '').toString().trim() + (rtRw ? ` - RT/RW ${rtRw}` : '')).trim();
        // 2. Create new village document
        const village = await models_1.Village.create({
            id: villageId,
            name: villageName,
            address: fullAddress,
            uniqueCode: villageCode,
            config
        }, { transaction });
        const sanitizedEmail = (typeof email === 'string' && email.trim().length > 0)
            ? email.trim()
            : null;
        const generatedFamilyId = `FAM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const generatedUniqueCode = await (0, exports.generateResidentUniqueCode)(transaction);
        // 3. Setup user as ADMIN and Family Head for the new village
        const [user, created] = await models_1.User.findOrCreate({
            where: { uid },
            defaults: {
                uid,
                name: name || 'Admin Desa',
                email: sanitizedEmail,
                photoUrl: photoUrl || '',
                noKK: noKK ? String(noKK).trim() : null,
                nik: nik ? String(nik).trim() : null,
                phoneNumber: finalPhone,
                alamat: fullAddress || null,
                familyId: generatedFamilyId,
                uniqueCode: generatedUniqueCode,
                statusHubungan: 'KEPALA_KELUARGA',
                status: 'ACTIVE',
                villageId
            },
            transaction
        });
        if (!created) {
            await user.update({
                status: 'ACTIVE',
                villageId,
                familyId: user.getDataValue('familyId') || generatedFamilyId,
                uniqueCode: user.getDataValue('uniqueCode') || generatedUniqueCode,
                statusHubungan: user.getDataValue('statusHubungan') || 'KEPALA_KELUARGA',
                alamat: user.getDataValue('alamat') || fullAddress || null,
                ...(name ? { name } : {}),
                ...(sanitizedEmail ? { email: sanitizedEmail } : {}),
                ...(noKK ? { noKK: String(noKK).trim() } : {}),
                ...(nik ? { nik: String(nik).trim() } : {}),
                ...(finalPhone ? { phoneNumber: finalPhone } : {})
            }, { transaction });
        }
        // Assign Role ADMIN_DESA and WARGA for this user
        await models_1.Role.destroy({ where: { userId: uid }, transaction });
        await models_1.Role.create({
            id: `role_${uid}_ADMIN_DESA_${Date.now()}`,
            name: 'ADMIN_DESA',
            userId: uid,
            villageId
        }, { transaction });
        await models_1.Role.create({
            id: `role_${uid}_WARGA_${Date.now() + 1}`,
            name: 'WARGA',
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
        // 6. Setup 1-Month Free Trial Subscription
        let plan = await models_1.SubscriptionPlan.findOne({ where: { name: 'Free Trial' }, transaction });
        if (!plan) {
            plan = await models_1.SubscriptionPlan.create({
                name: 'Free Trial',
                basePrice: 0,
                pricePerKk: 0,
                durationMonths: 1,
                durationUnit: 'MONTHLY'
            }, { transaction });
        }
        await models_1.VillageSubscription.create({
            villageId,
            planId: plan.id,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: (0, jakartaTime_1.addJakartaMonths)(new Date(), 1), // 1 month free trial
            autoRenew: false
        }, { transaction });
        await transaction.commit();
        (0, activityLogger_1.logActivity)({
            villageId,
            userId: uid,
            userName: name || 'Admin Desa',
            userEmail: sanitizedEmail,
            userRole: 'ADMIN_DESA',
            action: 'REGISTER_VILLAGE',
            targetId: villageId,
            targetName: villageName,
            description: `Admin "${name || 'Admin Desa'}" mendaftarkan desa baru "${villageName}" (Kode: ${villageCode})`,
            details: { villageId, villageCode, fullAddress, phone: finalPhone, email: sanitizedEmail },
            req,
        });
        // Kirim notifikasi otomatis ke Chat Admin Pusat & Pendaftar Desa Baru
        (0, notificationHelper_1.notifyAdminPusatNewVillage)({
            villageId,
            villageName: villageName || 'Desa Baru',
            uniqueCode: villageCode,
            address: fullAddress || '-',
            registrantUid: uid,
            registrantName: name || 'Admin Desa',
            registrantPhone: finalPhone || null,
            registrantEmail: sanitizedEmail || null
        }).catch(err => console.error('Error notifying admin pusat in registerVillage:', err));
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
        // Auto-heal missing uniqueCode, familyId, or alamat for users in this village
        let villageAddress = null;
        for (const u of users) {
            let changed = false;
            const updateData = {};
            if (u.getDataValue('villageId') && (!u.getDataValue('uniqueCode') || u.getDataValue('uniqueCode') === '')) {
                const generatedCode = await (0, exports.generateResidentUniqueCode)();
                updateData.uniqueCode = generatedCode;
                u.setDataValue('uniqueCode', generatedCode);
                changed = true;
            }
            if (u.getDataValue('villageId') && (!u.getDataValue('familyId') || u.getDataValue('familyId') === '')) {
                const generatedFamId = `FAM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                updateData.familyId = generatedFamId;
                updateData.statusHubungan = u.getDataValue('statusHubungan') || 'KEPALA_KELUARGA';
                u.setDataValue('familyId', generatedFamId);
                u.setDataValue('statusHubungan', updateData.statusHubungan);
                changed = true;
            }
            if (u.getDataValue('villageId') && (!u.getDataValue('alamat') || u.getDataValue('alamat') === '')) {
                if (!villageAddress) {
                    const v = await models_1.Village.findByPk(u.getDataValue('villageId'));
                    villageAddress = v?.getDataValue('address') || '';
                }
                if (villageAddress) {
                    updateData.alamat = villageAddress;
                    u.setDataValue('alamat', villageAddress);
                    changed = true;
                }
            }
            if (changed) {
                await u.update(updateData);
            }
        }
        const nowMs = Date.now();
        const staleOnlineUids = [];
        const formattedUsers = users.map((u) => {
            const userJSON = u.toJSON();
            if (userJSON.roles) {
                userJSON.roles = userJSON.roles.map((r) => r.name).filter((val, idx, arr) => arr.indexOf(val) === idx);
            }
            // Validasi status online: jika isOnline true tapi lastSeen/updatedAt > 2 menit lalu, anggap offline
            if (userJSON.isOnline) {
                const lastActivity = userJSON.lastSeen ? new Date(userJSON.lastSeen).getTime() : (userJSON.updatedAt ? new Date(userJSON.updatedAt).getTime() : 0);
                if (nowMs - lastActivity > 2 * 60 * 1000) {
                    userJSON.isOnline = false;
                    staleOnlineUids.push(userJSON.uid);
                }
            }
            if (!userJSON.familyId && userJSON.villageId) {
                userJSON.familyId = userJSON.uid;
            }
            return userJSON;
        });
        if (staleOnlineUids.length > 0) {
            models_1.User.update({ isOnline: false }, { where: { uid: staleOnlineUids } }).catch(() => { });
        }
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
        const villageId = req.body?.villageId || req.query?.villageId;
        const noKK = req.body?.noKK || req.query?.noKK;
        // 1. Cari data awal untuk mendeteksi nomor KK dan familyId yang berelasi
        const initialUsers = await models_1.User.findAll({
            where: {
                [sequelize_1.Op.or]: [
                    { familyId },
                    { uid: familyId },
                    ...(noKK ? [{ noKK: noKK.trim() }] : [])
                ],
                ...(villageId ? { villageId } : {})
            }
        });
        if (initialUsers.length === 0) {
            res.status(404).json({ success: false, message: 'Data keluarga tidak ditemukan atau bukan milik desa ini' });
            return;
        }
        const foundUids = new Set();
        const foundFamilyIds = new Set();
        const foundNoKKs = new Set();
        initialUsers.forEach((u) => {
            const uid = u.getDataValue('uid');
            const famId = u.getDataValue('familyId');
            const kk = u.getDataValue('noKK');
            if (uid)
                foundUids.add(uid);
            if (famId && famId.trim().length > 0)
                foundFamilyIds.add(famId.trim());
            if (kk && kk.trim().length > 3)
                foundNoKKs.add(kk.trim());
        });
        const orConditions = [
            { uid: Array.from(foundUids) },
            ...(foundFamilyIds.size > 0 ? [{ familyId: Array.from(foundFamilyIds) }] : []),
            ...(foundNoKKs.size > 0 ? [{ noKK: Array.from(foundNoKKs) }] : [])
        ];
        const targetVillageId = villageId || initialUsers[0]?.getDataValue('villageId');
        const whereClause = {
            [sequelize_1.Op.or]: orConditions,
            ...(targetVillageId ? { villageId: targetVillageId } : {})
        };
        const toDelete = await models_1.User.findAll({ where: whereClause });
        console.log(`[deleteUserFamily] Menghapus ${toDelete.length} user (familyId=${familyId}, villageId=${targetVillageId}): ${toDelete.map((u) => `${u.getDataValue('uid')}(${u.getDataValue('name')})`).join(', ')}`);
        const deletedUids = toDelete.map((u) => u.getDataValue('uid'));
        const deletedNames = toDelete.map((u) => u.getDataValue('name')).join(', ');
        if (deletedUids.length > 0) {
            await models_1.Role.destroy({ where: { userId: deletedUids } });
        }
        await models_1.User.destroy({ where: whereClause });
        (0, activityLogger_1.logActivity)({
            villageId: String(targetVillageId || ''),
            action: 'DELETE_FAMILY',
            targetId: String(familyId || ''),
            targetName: deletedNames || String(familyId || ''),
            description: `Penghapusan data keluarga (familyId: ${familyId}, noKK: ${noKK || '-'}) berisi ${toDelete.length} warga: ${deletedNames}`,
            details: { familyId, noKK, deletedUids, villageId: targetVillageId },
            req,
        });
        const firebaseService = require('../services/firebaseService');
        try {
            firebaseService.sendSyncNotification(targetVillageId || 'all', 'REFRESH_USERS');
        }
        catch (e) {
            console.error('Failed to send sync notification:', e);
        }
        res.json({ success: true, message: 'Family or user deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteUserFamily = deleteUserFamily;
const moveUserFamily = async (req, res) => {
    const transaction = await models_1.sequelize.transaction();
    try {
        const { uid } = req.params;
        const { action, // 'JOIN_EXISTING' or 'SPLIT_NEW'
        targetFamilyId, targetUid, statusHubungan, newNoKK, newAddress, newUniqueCode, villageId } = req.body;
        const user = await models_1.User.findByPk(uid, { transaction });
        if (!user) {
            await transaction.rollback();
            res.status(404).json({ success: false, message: 'Warga tidak ditemukan' });
            return;
        }
        const currentVillageId = villageId || user.getDataValue('villageId');
        if (action === 'JOIN_EXISTING') {
            const targetQuery = targetFamilyId || targetUid;
            if (!targetQuery) {
                await transaction.rollback();
                res.status(400).json({ success: false, message: 'Target KK tujuan tidak ditentukan' });
                return;
            }
            const targetUser = await models_1.User.findOne({
                where: {
                    [sequelize_1.Op.or]: [
                        { familyId: targetQuery },
                        { uid: targetQuery }
                    ],
                    ...(currentVillageId ? { villageId: currentVillageId } : {})
                },
                transaction
            });
            if (!targetUser) {
                await transaction.rollback();
                res.status(404).json({ success: false, message: 'KK tujuan tidak ditemukan' });
                return;
            }
            const finalFamilyId = targetUser.getDataValue('familyId') || targetUser.getDataValue('uid');
            const finalNoKK = targetUser.getDataValue('noKK') || '';
            const finalAlamat = targetUser.getDataValue('alamat') || targetUser.getDataValue('address') || '';
            const finalUniqueCode = targetUser.getDataValue('uniqueCode') || '';
            await user.update({
                familyId: finalFamilyId,
                noKK: finalNoKK,
                alamat: finalAlamat,
                uniqueCode: finalUniqueCode,
                statusHubungan: statusHubungan || 'Anggota Keluarga'
            }, { transaction });
        }
        else if (action === 'SPLIT_NEW') {
            const newFamilyId = `FAM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            let finalCode = newUniqueCode ? newUniqueCode.trim().toUpperCase() : '';
            if (!finalCode) {
                finalCode = await (0, exports.generateResidentUniqueCode)(transaction);
            }
            else {
                const existingWithCode = await models_1.User.findOne({
                    where: {
                        uniqueCode: finalCode,
                        uid: { [sequelize_1.Op.ne]: uid }
                    },
                    transaction
                });
                if (existingWithCode) {
                    await transaction.rollback();
                    res.status(400).json({
                        success: false,
                        message: `Kode unik ${finalCode} sudah digunakan oleh warga lain.`
                    });
                    return;
                }
            }
            await user.update({
                familyId: newFamilyId,
                noKK: newNoKK ? newNoKK.trim() : (user.getDataValue('noKK') || ''),
                alamat: newAddress ? newAddress.trim() : (user.getDataValue('alamat') || user.getDataValue('address') || ''),
                uniqueCode: finalCode,
                statusHubungan: statusHubungan || 'Kepala Keluarga'
            }, { transaction });
        }
        else {
            await transaction.rollback();
            res.status(400).json({ success: false, message: 'Aksi pindah KK tidak valid' });
            return;
        }
        await transaction.commit();
        try {
            const firebaseService = require('../services/firebaseService');
            firebaseService.sendSyncNotification(currentVillageId || 'all', 'REFRESH_USERS');
        }
        catch (e) {
            console.error('Failed to send sync notification:', e);
        }
        res.json({ success: true, message: 'Berhasil memproses mutasi / pindah KK warga' });
    }
    catch (error) {
        await transaction.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.moveUserFamily = moveUserFamily;
const saveUserFamily = async (req, res) => {
    const transaction = await models_1.sequelize.transaction();
    try {
        const { familyId, uniqueCode, villageId, noKK, alamat, address, phone, phoneNumber, familyMembers, deletedDocIds } = req.body;
        // Process deletes
        if (deletedDocIds && Array.isArray(deletedDocIds) && deletedDocIds.length > 0) {
            const validDeletes = deletedDocIds.filter(Boolean);
            if (validDeletes.length > 0) {
                // SECURITY FIX: Pastikan hanya hapus user yang memang milik villageId yang sama
                // Mencegah penghapusan warga dari desa lain jika ada bug di sisi klien (Flutter)
                const deleteWhere = { uid: validDeletes };
                if (villageId) {
                    deleteWhere.villageId = villageId;
                }
                const toDelete = await models_1.User.findAll({ where: deleteWhere, transaction });
                console.log(`[saveUserFamily] Akan menghapus ${toDelete.length} user: ${toDelete.map((u) => u.getDataValue('uid')).join(', ')}`);
                if (toDelete.length > 0) {
                    await models_1.User.destroy({ where: deleteWhere, transaction });
                }
            }
        }
        const familyNoKK = (noKK ?? '').toString().trim();
        const familyAlamat = alamat ?? address ?? '';
        const familyPhone = phone ?? phoneNumber ?? '';
        // Cari apakah sudah ada familyId di desa ini yang menggunakan noKK yang sama agar otomatis bergabung
        let resolvedFamilyId = familyId;
        let resolvedUniqueCode = uniqueCode;
        if (familyNoKK && familyNoKK.length >= 4) {
            const existingKkUser = await models_1.User.findOne({
                where: {
                    noKK: familyNoKK,
                    ...(villageId ? { villageId } : {})
                },
                transaction
            });
            if (existingKkUser) {
                if (existingKkUser.getDataValue('familyId')) {
                    resolvedFamilyId = existingKkUser.getDataValue('familyId');
                }
                if (existingKkUser.getDataValue('uniqueCode')) {
                    resolvedUniqueCode = existingKkUser.getDataValue('uniqueCode');
                }
            }
        }
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
                let rawEmail = (typeof email === 'string') ? email.trim() : '';
                if (rawEmail === '-' || rawEmail.toLowerCase() === 'kosong' || rawEmail === '.' || rawEmail === 'null') {
                    rawEmail = '';
                }
                // Sanitize email: convert invalid email or empty string to null so MySQL unique index won't fail
                let sanitizedEmail = (rawEmail.length > 0 && rawEmail.includes('@'))
                    ? rawEmail
                    : null;
                // Cegah crash jika email sudah digunakan oleh user lain (dengan uid berbeda)
                if (sanitizedEmail) {
                    const existingUserWithEmail = await models_1.User.findOne({
                        where: {
                            email: sanitizedEmail,
                            uid: { [sequelize_1.Op.ne]: targetDocId }
                        },
                        transaction
                    });
                    if (existingUserWithEmail) {
                        // Email sudah dipakai oleh user lain, abaikan penimpaan email agar transaksi tidak crash
                        sanitizedEmail = null;
                    }
                }
                const sanitizedMemberData = {
                    ...userData,
                    name: memberName,
                    email: sanitizedEmail,
                    noKK: memberNoKK,
                    alamat: memberAlamat,
                    phoneNumber: memberPhone,
                };
                const targetFamilyId = resolvedFamilyId || targetDocId;
                const finalResidentCode = resolvedUniqueCode || uniqueCode || await (0, exports.generateResidentUniqueCode)(transaction);
                const [user, created] = await models_1.User.findOrCreate({
                    where: { uid: targetDocId },
                    defaults: {
                        uid: targetDocId,
                        familyId: targetFamilyId,
                        uniqueCode: finalResidentCode,
                        villageId: villageId || '',
                        status: 'ACTIVE',
                        ...sanitizedMemberData
                    },
                    transaction
                });
                if (!created) {
                    await user.update({
                        familyId: targetFamilyId,
                        uniqueCode: user.getDataValue('uniqueCode') || finalResidentCode,
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
        (0, activityLogger_1.logActivity)({
            villageId: villageId || '',
            action: 'SAVE_FAMILY',
            targetId: resolvedFamilyId || familyId || '',
            targetName: `KK ${familyNoKK}`,
            description: `Penyimpanan data keluarga KK ${familyNoKK} (${Array.isArray(familyMembers) ? familyMembers.length : 0} anggota keluarga, ${deletedDocIds?.length || 0} dihapus)`,
            details: { familyId: resolvedFamilyId, noKK: familyNoKK, memberCount: familyMembers?.length, deletedDocIds },
            req,
        });
        res.json({ success: true, message: 'Family saved successfully' });
    }
    catch (error) {
        await transaction.rollback();
        let errorMessage = error.message;
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            if (error.errors && Array.isArray(error.errors)) {
                errorMessage = error.errors.map((e) => {
                    if (e.path === 'email' || e.message?.includes('email')) {
                        return `Email '${e.value || ''}' sudah digunakan oleh pengguna lain. Silakan kosongkan atau gunakan email lain.`;
                    }
                    return e.message;
                }).join(', ');
            }
        }
        const fs = require('fs');
        try {
            fs.writeFileSync('save_error.log', JSON.stringify({ message: errorMessage, stack: error.stack, type: error.name }, null, 2));
        }
        catch (e) {
            console.error('Failed to write save_error.log', e);
        }
        console.error('SAVE ERROR:', error);
        res.status(400).json({ success: false, message: errorMessage });
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
        // Auto-heal: Jika user memiliki villageId namun familyId atau uniqueCode masih kosong, otomatis lengkapi
        if (user.getDataValue('villageId')) {
            let needsUpdate = false;
            const updateData = {};
            if (!user.getDataValue('familyId') || user.getDataValue('familyId') === '') {
                const fallbackFamilyId = `FAM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                const fallbackStatus = user.getDataValue('statusHubungan') || 'KEPALA_KELUARGA';
                updateData.familyId = fallbackFamilyId;
                updateData.statusHubungan = fallbackStatus;
                user.setDataValue('familyId', fallbackFamilyId);
                user.setDataValue('statusHubungan', fallbackStatus);
                needsUpdate = true;
            }
            if (!user.getDataValue('uniqueCode') || user.getDataValue('uniqueCode') === '') {
                const generatedCode = await (0, exports.generateResidentUniqueCode)();
                updateData.uniqueCode = generatedCode;
                user.setDataValue('uniqueCode', generatedCode);
                needsUpdate = true;
            }
            if (!user.getDataValue('alamat') || user.getDataValue('alamat') === '') {
                const v = await models_1.Village.findByPk(user.getDataValue('villageId'));
                if (v && v.getDataValue('address')) {
                    updateData.alamat = v.getDataValue('address');
                    user.setDataValue('alamat', v.getDataValue('address'));
                    needsUpdate = true;
                }
            }
            if (needsUpdate) {
                await user.update(updateData);
            }
            // Pastikan juga role WARGA ada untuk keperluan iuran/tagihan
            const hasWarga = user.roles?.some((r) => r.name === 'WARGA');
            if (!hasWarga) {
                try {
                    await models_1.Role.create({
                        id: `role_${uid}_WARGA_${Date.now()}`,
                        name: 'WARGA',
                        userId: uid,
                        villageId: user.getDataValue('villageId')
                    });
                    if (user.roles) {
                        user.roles.push({ id: `role_${uid}_WARGA_${Date.now()}`, name: 'WARGA', villageId: user.getDataValue('villageId') });
                    }
                }
                catch (_) { }
            }
        }
        const userJSON = user.toJSON();
        if (userJSON.roles) {
            userJSON.roles = userJSON.roles.map((r) => r.name).filter((val, idx, arr) => arr.indexOf(val) === idx);
        }
        if (!userJSON.familyId && userJSON.villageId) {
            userJSON.familyId = userJSON.uid;
        }
        res.json({ success: true, data: userJSON });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getUserById = getUserById;
const cleanupIncompleteUsers = async (req, res) => {
    try {
        const orphanUsers = await models_1.User.findAll({
            where: {
                status: 'INCOMPLETE',
                [sequelize_1.Op.or]: [
                    { villageId: null },
                    { villageId: '' },
                    { villageId: '-' },
                ]
            },
            attributes: ['uid']
        });
        const uids = orphanUsers.map(u => u.getDataValue('uid'));
        if (uids.length === 0) {
            res.json({ success: true, message: 'Tidak ada akun incomplete yang perlu dibersihkan', count: 0 });
            return;
        }
        await models_1.Role.destroy({ where: { userId: uids } });
        const deletedCount = await models_1.User.destroy({ where: { uid: uids } });
        (0, activityLogger_1.logActivity)({
            villageId: null,
            action: 'CLEANUP_USERS',
            description: `Membersihkan ${deletedCount} akun berstatus INCOMPLETE tanpa desa`,
            details: { deletedUids: uids, count: deletedCount },
            req,
        });
        res.json({
            success: true,
            message: `Berhasil membersihkan ${deletedCount} akun incomplete`,
            count: deletedCount,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.cleanupIncompleteUsers = cleanupIncompleteUsers;
const deleteUser = async (req, res) => {
    try {
        const { uid } = req.params;
        const user = await models_1.User.findByPk(uid);
        if (!user) {
            res.status(404).json({ success: false, message: 'User tidak ditemukan' });
            return;
        }
        const email = user.getDataValue('email');
        if (email === (process.env.SUPERADMIN_EMAIL || 'appsbeem@gmail.com')) {
            res.status(403).json({ success: false, message: 'Tidak dapat menghapus akun Super Admin' });
            return;
        }
        const userName = user.getDataValue('name') || user.getDataValue('email');
        const userVillageId = user.getDataValue('villageId');
        await models_1.Role.destroy({ where: { userId: uid } });
        await models_1.User.destroy({ where: { uid } });
        (0, activityLogger_1.logActivity)({
            villageId: userVillageId,
            action: 'DELETE_USER',
            targetId: uid,
            targetName: userName,
            description: `Penghapusan data pengguna "${userName}" (UID: ${uid})`,
            details: { uid, name: userName, email },
            req,
        });
        res.json({ success: true, message: 'User berhasil dihapus' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteUser = deleteUser;
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
        // Jika status diubah menjadi ACTIVE (misal disetujui sebagai KK Baru)
        if (status === 'ACTIVE') {
            for (const u of users) {
                if (!u.getDataValue('uniqueCode') || u.getDataValue('uniqueCode') === '') {
                    const generatedCode = await (0, exports.generateResidentUniqueCode)();
                    updateData.uniqueCode = generatedCode;
                    u.setDataValue('uniqueCode', generatedCode);
                }
                if (!u.getDataValue('familyId') || u.getDataValue('familyId') === '') {
                    const generatedFamId = `FAM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    updateData.familyId = generatedFamId;
                    updateData.statusHubungan = u.getDataValue('statusHubungan') || 'Kepala Keluarga';
                    u.setDataValue('familyId', generatedFamId);
                    u.setDataValue('statusHubungan', updateData.statusHubungan);
                }
            }
        }
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
        (0, activityLogger_1.logActivity)({
            villageId: villageId || users[0]?.getDataValue('villageId'),
            action: 'UPDATE_STATUS',
            targetId: uid,
            targetName: users[0]?.getDataValue('name') || uid,
            description: `Status pengguna "${users[0]?.getDataValue('name') || uid}" diubah menjadi "${status}"`,
            details: { uid, status, villageId, updatedUserCount: users.length },
            req,
        });
        const targetVillageId = villageId || users[0].getDataValue('villageId') || 'all';
        try {
            const firebaseService = require('../services/firebaseService');
            firebaseService.sendSyncNotification(targetVillageId, 'REFRESH_USERS');
        }
        catch (e) {
            console.error('Failed to send sync notification:', e);
        }
        res.json({ success: true, message: 'User status updated successfully', data: updateData });
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
            const firebaseService = require('../services/firebaseService');
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
        (0, activityLogger_1.logActivity)({
            villageId: villageIdVal,
            action: 'LINK_ACCOUNT',
            targetId: pendingUid,
            targetName: name,
            description: `Menautkan akun pendaftar "${pendingUser.getDataValue('name') || email}" ke data warga lama "${targetUser.getDataValue('name')}" (NIK: ${nik || '-'}). Record offline lama digantikan dengan akun pendaftar.`,
            details: { pendingUid, targetUid, email, nik, noKK, name },
            req,
        });
        try {
            const firebaseService = require('../services/firebaseService');
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
        const now = new Date();
        const updateData = {
            isOnline: !!isOnline,
            lastSeen: now
        };
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
        (0, activityLogger_1.logActivity)({
            villageId: villageId || '',
            action: 'IMPORT_USERS',
            description: `Import data warga sebanyak ${Array.isArray(users) ? users.length : 0} orang ke desa ${villageId || ''}`,
            details: { count: Array.isArray(users) ? users.length : 0, villageId },
            req,
        });
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
/**
 * Mengambil Riwayat Log Aktivitas Pengguna (Audit Trail)
 * GET /api/master/activity-logs
 */
const getActivityLogs = async (req, res) => {
    try {
        const { villageId, action, search, limit = '50', page = '1' } = req.query;
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const offset = (pageNum - 1) * limitNum;
        const whereClause = {};
        if (villageId && villageId !== 'ALL') {
            whereClause.villageId = villageId;
        }
        if (action && action !== 'ALL') {
            whereClause.action = action;
        }
        if (search) {
            const q = `%${search}%`;
            whereClause[sequelize_1.Op.or] = [
                { userName: { [sequelize_1.Op.like]: q } },
                { userEmail: { [sequelize_1.Op.like]: q } },
                { targetName: { [sequelize_1.Op.like]: q } },
                { description: { [sequelize_1.Op.like]: q } },
                { action: { [sequelize_1.Op.like]: q } },
            ];
        }
        const { count, rows } = await models_1.ActivityLog.findAndCountAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            limit: limitNum,
            offset,
            include: [
                { model: models_1.Village, attributes: ['id', 'name', 'uniqueCode'], required: false }
            ]
        });
        res.json({
            success: true,
            data: rows,
            total: count,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(count / limitNum),
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getActivityLogs = getActivityLogs;
