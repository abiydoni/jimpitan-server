"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMessage = exports.sendMessage = exports.getMessages = exports.getChatContacts = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const firebaseService_1 = require("../services/firebaseService");
const uuid_1 = require("uuid");
const getChatContacts = async (req, res) => {
    try {
        const { villageId } = req.params;
        // Real logic might fetch users who have chatted with the current user
        // or just all active users/admins in the village
        const users = await models_1.User.findAll({
            where: { villageId, status: 'ACTIVE' }
        });
        res.json({ success: true, data: users });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getChatContacts = getChatContacts;
const getMessages = async (req, res) => {
    try {
        const { villageId, targetUid } = req.params;
        const { uid } = req.query; // current user uid
        if (!uid) {
            res.status(400).json({ success: false, message: 'uid query param is required' });
            return;
        }
        const messages = await models_1.ChatMessage.findAll({
            where: {
                villageId,
                [sequelize_1.Op.or]: [
                    { senderUid: uid, receiverUid: targetUid },
                    { senderUid: targetUid, receiverUid: uid },
                    { roomId: targetUid } // in case targetUid is actually roomId for group chat
                ]
            },
            order: [['createdAt', 'ASC']]
        });
        res.json({ success: true, data: messages });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMessages = getMessages;
const sendMessage = async (req, res) => {
    try {
        const { villageId } = req.params;
        const { senderUid, receiverUid, message, roomId, senderName, isDeleted, isEdited } = req.body;
        const newMsg = await models_1.ChatMessage.create({
            id: req.body.id || (0, uuid_1.v4)(),
            villageId,
            roomId,
            senderUid,
            senderName,
            receiverUid,
            message,
            isDeleted: isDeleted || false,
            isEdited: isEdited || false
        });
        // --- Kirim Push Notification ke penerima ---
        try {
            const isGroupChat = !!roomId && !receiverUid;
            if (!isGroupChat && receiverUid) {
                // PRIVATE CHAT: kirim notifikasi visible ke token FCM spesifik penerima
                const receiver = await models_1.User.findOne({ where: { uid: receiverUid } });
                const receiverToken = receiver?.fcmToken;
                if (receiverToken) {
                    await (0, firebaseService_1.sendChatNotification)(receiverToken, senderName || 'Seseorang', message || '', senderUid, villageId, roomId);
                }
            }
            else {
                // GROUP CHAT: kirim sync silent ke topic desa
                await (0, firebaseService_1.sendSyncNotification)(villageId, 'NEW_MESSAGE');
            }
        }
        catch (notifErr) {
            // Jangan gagalkan request utama bila notifikasi error
            console.error('Error sending chat notification:', notifErr);
        }
        res.json({ success: true, data: newMsg });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.sendMessage = sendMessage;
const updateMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { message, isDeleted, isEdited } = req.body;
        const msg = await models_1.ChatMessage.findByPk(messageId);
        if (!msg) {
            res.status(404).json({ success: false, message: 'Message not found' });
            return;
        }
        if (message !== undefined)
            msg.message = message;
        if (isDeleted !== undefined)
            msg.isDeleted = isDeleted;
        if (isEdited !== undefined)
            msg.isEdited = isEdited;
        await msg.save();
        res.json({ success: true, data: msg });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateMessage = updateMessage;
