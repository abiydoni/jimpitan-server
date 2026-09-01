"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markMessagesRead = exports.getUnreadCounts = exports.updateMessage = exports.getMessages = exports.getChatContacts = exports.sendMessage = void 0;
const models_1 = require("../models");
const sequelize_1 = require("sequelize");
const firebaseService_1 = require("../services/firebaseService");
const uuid_1 = require("uuid");
const sendMessage = async (req, res) => {
    const { villageId } = req.params;
    const { senderUid, receiverUid, roomId, senderName, message, replyToId, replyToMessage, replyToSenderName, isForwarded } = req.body;
    const firebaseUser = req.firebaseUser;
    // Validasi: pengirim harus memiliki Firebase token yang valid dan sesuai
    if (!firebaseUser || firebaseUser.uid !== senderUid) {
        res.status(403).json({ success: false, message: 'Akses ditolak: token tidak valid atau tidak sesuai' });
        return;
    }
    if (!message || !senderName) {
        res.status(400).json({ success: false, message: 'Parameter tidak lengkap' });
        return;
    }
    try {
        let actualVillageId = villageId === 'ALL' ? null : villageId;
        // Jika Super Admin mengirim pesan personal, ambil villageId dari receiver agar pesan tercatat di desa yang benar
        if (!actualVillageId && receiverUid) {
            const receiver = await models_1.User.findOne({ where: { uid: receiverUid } });
            if (receiver) {
                actualVillageId = receiver.getDataValue('villageId') || null;
            }
        }
        // 1. Simpan pesan ke database
        await models_1.ChatMessage.create({
            id: `msg_${(0, uuid_1.v4)()}`,
            villageId: actualVillageId, // null jika lintas desa (Super Admin global)
            senderUid,
            receiverUid,
            roomId,
            message,
            senderName,
            replyToId,
            replyToMessage,
            replyToSenderName,
            isForwarded: isForwarded || false,
        });
        // Respon ke client secepatnya, jangan tunggu notifikasi terkirim
        res.status(201).json({ success: true, message: 'Pesan terkirim' });
        // 2. Kirim notifikasi di background (setelah merespon client)
        process.nextTick(async () => {
            try {
                if (receiverUid) {
                    // --- PERSONAL CHAT: kirim notifikasi ke penerima spesifik ---
                    const receiver = await models_1.User.findOne({ where: { uid: receiverUid } });
                    const receiverToken = receiver?.getDataValue('fcmToken');
                    if (receiverToken && typeof roomId === 'string') {
                        await (0, firebaseService_1.sendChatNotification)(receiverToken, senderName, message, senderUid, actualVillageId || '', // FCM data harus string, gunakan '' jika null
                        roomId);
                    }
                }
                else if (roomId && typeof roomId === 'string' && roomId.startsWith('GROUP_')) {
                    // --- GROUP CHAT: kirim notifikasi ke semua user yang relevan ---
                    // Jika villageId = 'ALL' (Super Admin), kirim ke SEMUA user aktif lintas desa
                    // Jika villageId spesifik, kirim ke user dalam desa tersebut saja
                    const whereClause = {
                        uid: { [sequelize_1.Op.ne]: senderUid }, // Jangan kirim notif ke diri sendiri
                        status: 'ACTIVE',
                    };
                    if (villageId !== 'ALL') {
                        whereClause.villageId = villageId;
                    }
                    const recipients = await models_1.User.findAll({ where: whereClause });
                    const tokens = recipients
                        .map((user) => user.getDataValue('fcmToken'))
                        .filter((token) => !!token);
                    if (tokens.length > 0) {
                        for (const token of tokens) {
                            await (0, firebaseService_1.sendChatNotification)(token, senderName, `${senderName}: ${message}`, senderUid, villageId !== 'ALL' ? villageId : '', // Jangan kirim 'ALL' ke Flutter
                            roomId);
                        }
                    }
                }
            }
            catch (notifError) {
                console.error('Gagal mengirim notifikasi di background:', notifError);
            }
        });
    }
    catch (error) {
        console.error('Error in sendMessage:', error);
        // Pastikan tidak mengirim respon lagi jika sudah terkirim
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};
exports.sendMessage = sendMessage;
const getChatContacts = async (req, res) => {
    try {
        const { villageId } = req.params;
        // Jika villageId = 'ALL', ambil semua user di sistem (fitur khusus Super Admin)
        const whereClause = {};
        if (villageId === 'ALL') {
            whereClause.uid = { [sequelize_1.Op.ne]: 'SUPER_ADMIN' }; // Jangan tampilkan Super Admin di daftar kontaknya sendiri
        }
        else {
            whereClause.villageId = villageId;
            // Untuk Flutter, kita HARUS mengirimkan Super Admin (Appsbee Support) agar Flutter mengenalinya di daftar kontak!
            // Karena Flutter butuh data kontak ini saat membuka notifikasi atau chat.
        }
        const users = await models_1.User.findAll({
            where: whereClause,
            attributes: ['uid', 'name', 'foto', 'isOnline', 'lastSeen'],
            order: [
                ['isOnline', 'DESC'], // Online di atas
                ['lastSeen', 'DESC'] // Yang paling baru aktif di atas
            ]
        });
        let groups = [];
        if (villageId === 'ALL') {
            // Grup untuk koordinasi antar admin desa (cocok dengan Flutter: GROUP_ADMINS)
            groups.push({
                uid: 'GROUP_ADMINS',
                name: 'Grup Admin Pusat',
                isGroup: true,
                isOnline: false,
            });
            // Super admin harus bisa melihat semua grup desa
            const { Village } = require('../models');
            const allVillages = await Village.findAll();
            allVillages.forEach((v) => {
                groups.push({
                    uid: `GROUP_${v.id}`,
                    name: `Grup Warga - ${v.name}`,
                    isGroup: true,
                    isOnline: false,
                });
            });
        }
        else {
            // Jika di desa tertentu, tampilkan grup RT desa tersebut
            const { Village } = require('../models');
            const village = await Village.findByPk(villageId);
            if (village) {
                groups.push({
                    uid: `GROUP_${village.id}`,
                    name: `Grup Warga - ${village.name}`,
                    isGroup: true,
                    isOnline: false,
                });
            }
        }
        // Gabungkan Grup di paling atas, disusul users
        res.json({ success: true, data: [...groups, ...users] });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getChatContacts = getChatContacts;
const getMessages = async (req, res) => {
    try {
        const { villageId, targetUid } = req.params;
        const { uid, roomId } = req.query;
        if (!uid) {
            res.status(400).json({ success: false, message: 'UID pengguna diperlukan' });
            return;
        }
        let whereClause;
        if (roomId && typeof roomId === 'string' && roomId.startsWith('GROUP_')) {
            // Logika untuk mengambil pesan grup
            whereClause = { roomId };
            if (villageId !== 'ALL') {
                whereClause.villageId = {
                    [sequelize_1.Op.or]: [villageId, null]
                };
            }
        }
        else {
            // Logika untuk mengambil pesan personal
            // Cari berdasarkan pasangan senderUid <-> receiverUid saja (tanpa filter roomId)
            // agar kompatibel dengan pesan lama yang mungkin roomId-nya berbeda format
            whereClause = {
                [sequelize_1.Op.or]: [
                    { senderUid: uid, receiverUid: targetUid },
                    { senderUid: targetUid, receiverUid: uid },
                ],
            };
            if (villageId !== 'ALL') {
                whereClause.villageId = {
                    [sequelize_1.Op.or]: [villageId, null]
                };
            }
        }
        const messages = await models_1.ChatMessage.findAll({
            where: whereClause,
            order: [['createdAt', 'ASC']],
            limit: 100, // Batasi jumlah pesan yang diambil
        });
        res.json({ success: true, data: messages });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMessages = getMessages;
const updateMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { message, isDeleted, isEdited } = req.body;
        const firebaseUser = req.firebaseUser;
        const msg = await models_1.ChatMessage.findByPk(messageId);
        if (!msg) {
            res.status(404).json({ success: false, message: 'Pesan tidak ditemukan' });
            return;
        }
        if (msg.getDataValue('senderUid') !== firebaseUser?.uid) {
            res.status(403).json({ success: false, message: 'Anda tidak bisa mengubah pesan ini' });
            return;
        }
        const updateData = {};
        if (message)
            updateData.message = message;
        if (isDeleted !== undefined)
            updateData.isDeleted = isDeleted;
        if (isEdited !== undefined)
            updateData.isEdited = isEdited;
        await msg.update(updateData);
        res.json({ success: true, data: msg });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateMessage = updateMessage;
const getUnreadCounts = async (req, res) => {
    try {
        const { uid } = req.query;
        if (!uid || typeof uid !== 'string') {
            res.status(400).json({ success: false, message: 'UID diperlukan' });
            return;
        }
        const counts = {};
        // 1. Pesan Personal Unread
        const unreadPersonalMessages = await models_1.ChatMessage.findAll({
            where: {
                receiverUid: uid,
                isRead: false,
                senderUid: { [sequelize_1.Op.ne]: uid },
            },
            attributes: ['senderUid', 'roomId'],
        });
        unreadPersonalMessages.forEach((msg) => {
            const key = msg.getDataValue('roomId') || msg.getDataValue('senderUid');
            if (key) {
                counts[key] = (counts[key] || 0) + 1;
            }
        });
        // 2. Pesan Grup Unread (berdasarkan GroupReadState per user)
        const currentUser = await models_1.User.findOne({ where: { uid }, attributes: ['villageId'] });
        const userVillageId = currentUser?.getDataValue('villageId');
        const userGroupRooms = ['GROUP_ADMINS'];
        if (userVillageId) {
            userGroupRooms.push(`GROUP_${userVillageId}`);
        }
        const readStates = await models_1.GroupReadState.findAll({
            where: {
                userId: uid,
                roomId: userGroupRooms,
            },
        });
        const readStateMap = {};
        readStates.forEach((rs) => {
            readStateMap[rs.getDataValue('roomId')] = new Date(rs.getDataValue('lastReadAt'));
        });
        for (const roomId of userGroupRooms) {
            const lastReadAt = readStateMap[roomId] || new Date(0);
            const unreadCount = await models_1.ChatMessage.count({
                where: {
                    roomId,
                    senderUid: { [sequelize_1.Op.ne]: uid },
                    createdAt: { [sequelize_1.Op.gt]: lastReadAt },
                },
            });
            if (unreadCount > 0) {
                counts[roomId] = unreadCount;
            }
        }
        res.json({ success: true, data: counts });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getUnreadCounts = getUnreadCounts;
const markMessagesRead = async (req, res) => {
    try {
        const { uid, roomId, senderUid } = req.body;
        if (!uid) {
            res.status(400).json({ success: false, message: 'UID diperlukan' });
            return;
        }
        if (roomId && typeof roomId === 'string' && roomId.startsWith('GROUP_')) {
            // Group chat: perbarui lastReadAt khusus untuk user ini di room ini
            const id = `grs_${uid}_${roomId}`;
            await models_1.GroupReadState.upsert({
                id,
                userId: uid,
                roomId,
                lastReadAt: new Date(),
            });
            res.json({ success: true, message: 'Pesan grup ditandai terbaca' });
            return;
        }
        // Personal chat: tandai pesan dari senderUid yang ditujukan ke receiverUid (uid)
        if (senderUid) {
            await models_1.ChatMessage.update({ isRead: true }, { where: { senderUid, receiverUid: uid, isRead: false } });
        }
        else if (roomId) {
            await models_1.ChatMessage.update({ isRead: true }, { where: { roomId, senderUid: { [sequelize_1.Op.ne]: uid }, isRead: false } });
        }
        res.json({ success: true, message: 'Pesan ditandai terbaca' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.markMessagesRead = markMessagesRead;
