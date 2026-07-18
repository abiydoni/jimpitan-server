"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSyncNotification = void 0;
const messaging_1 = require("firebase-admin/messaging");
const sendSyncNotification = async (topic, data) => {
    try {
        const payload = {
            data: {
                action: data.action || 'SYNC',
                ...data
            },
            topic: topic,
        };
        await (0, messaging_1.getMessaging)().send(payload);
        console.log(`FCM sync message sent to topic ${topic} with action ${data.action}`);
    }
    catch (error) {
        console.error('Error sending FCM sync message:', error);
    }
};
exports.sendSyncNotification = sendSyncNotification;
