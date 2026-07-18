"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markMessagesRead = exports.getUnreadCounts = exports.updateMessage = exports.getMessages = exports.getChatContacts = exports.sendMessage = void 0;
const models_1 = require("../models"); // Impor ChatMessage sebagai Message
const sequelize_1 = require("sequelize");
const firebaseService_1 = require("../services/firebaseService");
const uuid_1 = require("uuid");
const sendMessage = async (req, res) => {
    const { villageId } = req.params;
    const { senderUid, receiverUid, roomId, senderName, message } = req.body;
    const firebaseUser = req.firebaseUser;
    console.log('--- DEBUG SEND MESSAGE ---');
    console.log('Headers Auth:', req.headers.authorization ? 'Ada' : 'Tidak Ada');
    console.log('senderUid:', senderUid);
    console.log('firebaseUser:', firebaseUser);
    console.log('--------------------------');
    // Izinkan jika ini adalah Super Admin (dari Web Dashboard) atau jika token valid
    if (senderUid !== 'SUPER_ADMIN' && (!firebaseUser || firebaseUser.uid !== senderUid)) {
        console.log('Ditolak karena tidak cocok UID atau token kosong');
        res.status(403).json({ success: false, message: 'Akses ditolak' });
        return;
    }
    if (!message || !senderName) {
        res.status(400).json({ success: false, message: 'Parameter tidak lengkap' });
        return;
    }
    try {
        let actualVillageId = villageId;
        // Jika Super Admin mengirim pesan global, kita ambil villageId dari receiver
        if (villageId === 'ALL' && receiverUid) {
            const receiver = await models_1.User.findOne({ where: { uid: receiverUid } });
            if (receiver) {
                actualVillageId = receiver.getDataValue('villageId') || 'GLOBAL';
            }
        }
        // 1. Simpan pesan ke database
        await models_1.ChatMessage.create({
            id: `msg_${(0, uuid_1.v4)()}`,
            villageId: actualVillageId,
            senderUid,
            receiverUid,
            roomId,
            message,
            senderName,
        });
        // Respon ke client secepatnya, jangan tunggu notifikasi terkirim
        res.status(201).json({ success: true, message: 'Pesan terkirim' });
        // 2. Kirim notifikasi di background (setelah merespon client)
        // Ini penting agar aplikasi tidak terasa lambat
        process.nextTick(async () => {
            try {
                if (receiverUid) {
                    // --- LOGIKA UNTUK PERSONAL CHAT ---
                    const receiver = await models_1.User.findOne({ where: { uid: receiverUid } });
                    const receiverToken = receiver?.getDataValue('fcmToken');
                    if (receiverToken && typeof roomId === 'string') {
                        await (0, firebaseService_1.sendChatNotification)(receiverToken, senderName, message, senderUid, actualVillageId, 
                        // Untuk personal chat, kita bisa kirim roomId agar di client bisa langsung join
                        roomId);
                    }
                }
                else if (roomId && typeof roomId === 'string' && roomId.startsWith('GROUP_')) {
                    // --- LOGIKA UNTUK GROUP CHAT ---
                    // Dapatkan semua user dalam desa (kecuali pengirim)
                    // NOTE: Ini bisa dioptimalkan dengan tabel relasi user-group
                    const usersInVillage = await models_1.User.findAll({
                        where: {
                            villageId: villageId,
                            uid: { [sequelize_1.Op.ne]: senderUid }, // Gunakan Op yang sudah diimpor
                        },
                    });
                    const tokens = usersInVillage
                        .map(user => user.getDataValue('fcmToken'))
                        .filter((token) => !!token);
                    if (tokens.length > 0) {
                        // Di sini kita bisa mengirim ke banyak token sekaligus (multicast)
                        // atau mengirim satu per satu. Untuk simpelnya, kita loop.
                        for (const token of tokens) {
                            await (0, firebaseService_1.sendChatNotification)(token, senderName, // atau nama grup
                            `${senderName}: ${message}`, // Tambahkan nama pengirim di pesan grup
                            senderUid, villageId, roomId);
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
        const whereClause = {
            status: 'ACTIVE'
        };
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
            groups.push({
                uid: 'GROUP_ADMIN_DESA',
                name: 'Grup Semua Admin Desa',
                isGroup: true,
                isOnline: false,
            });
        }
        else {
            // Jika di desa tertentu, mungkin grup desa tersebut saja
            const { Village } = require('../models');
            const village = await Village.findByPk(villageId);
            if (village) {
                groups.push({
                    uid: `GROUP_${village.id}`,
                    name: `Grup ${village.name}`,
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
            if (villageId !== 'ALL')
                whereClause.villageId = villageId;
        }
        else {
            // Logika untuk mengambil pesan personal
            const personalRoomId = `PERSONAL_${[uid, targetUid].sort().join('_')}`;
            whereClause = {
                [sequelize_1.Op.or]: [
                    { senderUid: uid, receiverUid: targetUid },
                    { senderUid: targetUid, receiverUid: uid },
                ],
                // Filter berdasarkan roomId personal untuk memastikan tidak tercampur
                roomId: personalRoomId,
            };
            if (villageId !== 'ALL')
                whereClause.villageId = villageId;
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
        const unreadMessages = await models_1.ChatMessage.findAll({
            where: {
                [sequelize_1.Op.or]: [{ receiverUid: uid }, { roomId: { [sequelize_1.Op.like]: 'GROUP_%' } }],
                isRead: false,
                senderUid: { [sequelize_1.Op.ne]: uid }, // Jangan hitung pesan dari diri sendiri
            },
            order: [['createdAt', 'DESC']],
        });
        const counts = {};
        const detailsMap = {};
        unreadMessages.forEach((msg) => {
            const key = msg.getDataValue('roomId') || msg.getDataValue('senderUid');
            if (key) {
                counts[key] = (counts[key] || 0) + 1;
                if (!detailsMap[key]) {
                    detailsMap[key] = {
                        senderUid: msg.getDataValue('senderUid'),
                        senderName: msg.getDataValue('senderName'),
                        message: msg.getDataValue('message'),
                        roomId: msg.getDataValue('roomId'),
                        createdAt: msg.getDataValue('createdAt'),
                    };
                }
            }
        });
        const detailsArray = Object.values(detailsMap).slice(0, 5);
        res.json({ success: true, data: counts, details: detailsArray });
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
        let whereClause = {};
        if (roomId) {
            whereClause = { roomId, receiverUid: null }; // Grup
        }
        else if (senderUid) {
            whereClause = { senderUid, receiverUid: uid }; // Personal
        }
        else {
            res.status(400).json({ success: false, message: 'roomId atau senderUid diperlukan' });
            return;
        }
        await models_1.ChatMessage.update({ isRead: true }, { where: whereClause });
        res.json({ success: true, message: 'Pesan ditandai terbaca' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.markMessagesRead = markMessagesRead;
