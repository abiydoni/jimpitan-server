"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendChatNotification = exports.sendSyncNotification = void 0;
const app_1 = require("firebase-admin/app");
const messaging_1 = require("firebase-admin/messaging");
const path_1 = __importDefault(require("path"));
const startupLogs_1 = require("../utils/startupLogs");
// Pastikan Anda sudah menaruh file serviceAccountKey.json di root folder project
const serviceAccountPath = path_1.default.resolve(__dirname, '../../serviceAccountKey.json');
try {
    (0, app_1.initializeApp)({
        credential: (0, app_1.cert)(serviceAccountPath),
    });
    (0, startupLogs_1.addStartupLog)('✅ Firebase Admin SDK berhasil diinisialisasi.');
}
catch (error) {
    console.error('❌ Gagal menginisialisasi Firebase Admin SDK:', error);
    console.warn('⚠️  Pastikan file serviceAccountKey.json sudah ada di root folder.');
}
let messagingInstance;
try {
    messagingInstance = (0, messaging_1.getMessaging)();
}
catch (e) {
    console.error('❌ Gagal mendapatkan instance FCM Messaging.');
}
/**
 * Mengirimkan Notifikasi Senyap (Silent Notification) ke Flutter via FCM Topic.
 * Digunakan untuk sinkronisasi data (refresh inventory, dues, dll) di background.
 */
const sendSyncNotification = async (villageId, action) => {
    try {
        const topic = `sync_${villageId}`;
        const message = {
            topic: topic,
            data: {
                action: action,
                timestamp: Date.now().toString(),
            },
            android: {
                priority: 'high',
            },
            apns: {
                payload: {
                    aps: {
                        contentAvailable: true,
                    },
                },
                headers: {
                    'apns-priority': '5', // Priority 5 = background (silent)
                },
            },
        };
        const response = await messagingInstance.send(message);
        console.log(`📡 FCM Sync [${action}] berhasil dikirim ke topic ${topic} (Message ID: ${response})`);
    }
    catch (error) {
        console.error('❌ Gagal mengirim FCM Sync:', error);
    }
};
exports.sendSyncNotification = sendSyncNotification;
/**
 * Mengirimkan Notifikasi Chat VISIBLE (popup) ke token FCM spesifik penerima.
 * Notifikasi ini muncul di status bar dan bila diklik langsung membuka
 * chat room dengan pengirim.
 *
 * @param receiverToken  FCM token perangkat penerima
 * @param senderName     Nama pengirim pesan
 * @param messageText    Isi pesan (dipotong bila terlalu panjang)
 * @param senderUid      UID pengirim (untuk navigasi Flutter ke chat room)
 * @param villageId      ID desa
 * @param roomId         Room ID jika group chat (opsional, kosong untuk private)
 */
const sendChatNotification = async (receiverToken, senderName, messageText, senderUid, villageId, roomId) => {
    try {
        const bodyText = messageText.length > 100 ? messageText.substring(0, 97) + '...' : messageText;
        const message = {
            token: receiverToken,
            // notification payload → muncul sebagai popup di status bar HP
            notification: {
                title: senderName,
                body: bodyText,
            },
            // data payload → dibaca Flutter untuk navigasi ke chat room yang tepat
            data: {
                action: 'OPEN_CHAT',
                senderUid: senderUid,
                sender_uid: senderUid, // snake_case fallback
                senderName: senderName,
                sender_name: senderName, // snake_case fallback
                uid: senderUid, // Ditambahkan agar Flutter User.fromJson tidak crash
                name: senderName, // Ditambahkan agar Flutter User.fromJson tidak crash
                type: 'chat', // Beberapa implementasi Flutter memeriksa `type`
                villageId: villageId,
                village_id: villageId, // snake_case fallback
                roomId: roomId ?? '',
                room_id: roomId ?? '', // snake_case fallback
                id: roomId ?? '', // fallback if they use 'id' for roomId
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'high_importance_channel', // sama dengan channel ID di Flutter
                    sound: 'default',
                    priority: 'high',
                    defaultVibrateTimings: true
                },
            },
            apns: {
                payload: {
                    aps: {
                        alert: {
                            title: senderName,
                            body: bodyText,
                        },
                        sound: 'default',
                        badge: 1,
                    },
                },
                headers: {
                    'apns-priority': '10', // 10 = immediate (visible)
                },
            },
        };
        const response = await messagingInstance.send(message);
        console.log(`💬 FCM Chat [${senderName}] → penerima (Message ID: ${response})`);
    }
    catch (error) {
        // Token tidak valid (user logout/ganti HP) → abaikan
        if (error?.errorInfo?.code === 'messaging/registration-token-not-registered') {
            console.warn('⚠️  FCM token penerima sudah tidak valid, notifikasi diabaikan.');
        }
        else {
            console.error('❌ Gagal mengirim FCM Chat notification:', error);
        }
    }
};
exports.sendChatNotification = sendChatNotification;
