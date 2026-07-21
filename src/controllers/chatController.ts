import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { User, sequelize, ChatMessage as Message } from '../models'; // Impor ChatMessage sebagai Message
import { Op } from 'sequelize';
import { sendChatNotification } from '../services/firebaseService';
import { v4 as uuidv4 } from 'uuid';

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const { villageId } = req.params;
  const { senderUid, receiverUid, roomId, senderName, message } = req.body;
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
    let actualVillageId: string | null = (villageId as string) === 'ALL' ? null : (villageId as string);
    
    // Jika Super Admin mengirim pesan personal, ambil villageId dari receiver agar pesan tercatat di desa yang benar
    if (!actualVillageId && receiverUid) {
      const receiver = await User.findOne({ where: { uid: receiverUid } });
      if (receiver) {
        actualVillageId = receiver.getDataValue('villageId') || null;
      }
    }

    // 1. Simpan pesan ke database
    await Message.create({
      id: `msg_${uuidv4()}`,
      villageId: actualVillageId, // null jika lintas desa (Super Admin global)
      senderUid,
      receiverUid,
      roomId,
      message,
      senderName,
    });

    // Respon ke client secepatnya, jangan tunggu notifikasi terkirim
    res.status(201).json({ success: true, message: 'Pesan terkirim' });

    // 2. Kirim notifikasi di background (setelah merespon client)
    process.nextTick(async () => {
      try {
        if (receiverUid) {
          // --- PERSONAL CHAT: kirim notifikasi ke penerima spesifik ---
          const receiver = await User.findOne({ where: { uid: receiverUid } });
          const receiverToken = receiver?.getDataValue('fcmToken');

          if (receiverToken && typeof roomId === 'string') {
            await sendChatNotification(
              receiverToken,
              senderName,
              message,
              senderUid,
              actualVillageId || '', // FCM data harus string, gunakan '' jika null
              roomId
            );
          }
        } else if (roomId && typeof roomId === 'string' && roomId.startsWith('GROUP_')) {
          // --- GROUP CHAT: kirim notifikasi ke semua user yang relevan ---
          // Jika villageId = 'ALL' (Super Admin), kirim ke SEMUA user aktif lintas desa
          // Jika villageId spesifik, kirim ke user dalam desa tersebut saja
          const whereClause: any = {
            uid: { [Op.ne]: senderUid }, // Jangan kirim notif ke diri sendiri
            status: 'ACTIVE',
          };
          if ((villageId as string) !== 'ALL') {
            whereClause.villageId = villageId;
          }

          const recipients = await User.findAll({ where: whereClause });

          const tokens: string[] = recipients
            .map((user: any) => user.getDataValue('fcmToken'))
            .filter((token: any): token is string => !!token);

          if (tokens.length > 0) {
            for (const token of tokens) {
              await sendChatNotification(
                token,
                senderName,
                `${senderName}: ${message}`,
                senderUid,
                (villageId as string) !== 'ALL' ? (villageId as string) : '', // Jangan kirim 'ALL' ke Flutter
                roomId
              );
            }
          }
        }
      } catch (notifError) {
        console.error('Gagal mengirim notifikasi di background:', notifError);
      }
    });

  } catch (error: any) {
    console.error('Error in sendMessage:', error);
    // Pastikan tidak mengirim respon lagi jika sudah terkirim
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

export const getChatContacts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;
    
    // Jika villageId = 'ALL', ambil semua user di sistem (fitur khusus Super Admin)
    const whereClause: any = { 
      status: 'ACTIVE'
    };
    
    if (villageId === 'ALL') {
      whereClause.uid = { [Op.ne]: 'SUPER_ADMIN' }; // Jangan tampilkan Super Admin di daftar kontaknya sendiri
    } else {
      whereClause.villageId = villageId;
      // Untuk Flutter, kita HARUS mengirimkan Super Admin (Appsbee Support) agar Flutter mengenalinya di daftar kontak!
      // Karena Flutter butuh data kontak ini saat membuka notifikasi atau chat.
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: ['uid', 'name', 'foto', 'isOnline', 'lastSeen'],
      order: [
        ['isOnline', 'DESC'], // Online di atas
        ['lastSeen', 'DESC'] // Yang paling baru aktif di atas
      ]
    });

    let groups: any[] = [];
    if (villageId === 'ALL') {
      // Grup untuk koordinasi antar admin desa (cocok dengan Flutter: GROUP_ADMINS)
      groups.push({
        uid: 'GROUP_ADMINS',
        name: 'Grup Admin Pusat',
        isGroup: true,
        isOnline: false,
      });
      // Grup semua admin desa (legacy / web admin)
      groups.push({
        uid: 'GROUP_ADMIN_DESA',
        name: 'Grup Semua Admin Desa',
        isGroup: true,
        isOnline: false,
      });

      // Super admin harus bisa melihat semua grup desa
      const { Village } = require('../models');
      const allVillages = await Village.findAll({ where: { status: 'ACTIVE' } });
      allVillages.forEach((v: any) => {
        groups.push({
          uid: `GROUP_${v.id}`,
          name: `Grup Warga - ${v.name}`,
          isGroup: true,
          isOnline: false,
        });
      });
    } else {
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { villageId, targetUid } = req.params;
    const { uid, roomId } = req.query;

    if (!uid) {
      res.status(400).json({ success: false, message: 'UID pengguna diperlukan' });
      return;
    }

    let whereClause: any;

    if (roomId && typeof roomId === 'string' && roomId.startsWith('GROUP_')) {
      // Logika untuk mengambil pesan grup
      whereClause = { roomId };
      if (villageId !== 'ALL') whereClause.villageId = villageId;
    } else {
      // Logika untuk mengambil pesan personal
      // Cari berdasarkan pasangan senderUid <-> receiverUid saja (tanpa filter roomId)
      // agar kompatibel dengan pesan lama yang mungkin roomId-nya berbeda format
      whereClause = {
        [Op.or]: [
          { senderUid: uid as string, receiverUid: targetUid },
          { senderUid: targetUid, receiverUid: uid as string },
        ],
      };
      if (villageId !== 'ALL') whereClause.villageId = villageId;
    }

    const messages = await Message.findAll({
      where: whereClause,
      order: [['createdAt', 'ASC']],
      limit: 100, // Batasi jumlah pesan yang diambil
    });

    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { message, isDeleted, isEdited } = req.body;
    const firebaseUser = req.firebaseUser;

    const msg = await Message.findByPk(messageId as string);

    if (!msg) {
      res.status(404).json({ success: false, message: 'Pesan tidak ditemukan' });
      return;
    }

    if (msg.getDataValue('senderUid') !== firebaseUser?.uid) {
      res.status(403).json({ success: false, message: 'Anda tidak bisa mengubah pesan ini' });
      return;
    }

    const updateData: any = {};
    if (message) updateData.message = message;
    if (isDeleted !== undefined) updateData.isDeleted = isDeleted;
    if (isEdited !== undefined) updateData.isEdited = isEdited;

    await msg.update(updateData);

    res.json({ success: true, data: msg });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUnreadCounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { uid } = req.query;
    if (!uid || typeof uid !== 'string') {
      res.status(400).json({ success: false, message: 'UID diperlukan' });
      return;
    }

    // Cari desa user ini untuk membatasi grup yang terlihat
    const currentUser = await User.findOne({ where: { uid }, attributes: ['villageId'] });
    const userVillageId = currentUser?.getDataValue('villageId');

    // Buat kondisi untuk pesan grup:
    // - Super Admin: lihat semua grup (tidak filter villageId karena pesannya bisa null)
    // - User biasa: hanya grup dari desanya sendiri
    const groupCondition: any = { roomId: { [Op.like]: 'GROUP_%' } };
    if (uid !== 'SUPER_ADMIN') {
      groupCondition.villageId = userVillageId || '__NONE__';
    }

    const unreadMessages = await Message.findAll({
      where: {
        [Op.or]: [
          { receiverUid: uid }, // Pesan personal
          groupCondition,       // Pesan grup sesuai akses
        ],
        isRead: false,
        senderUid: { [Op.ne]: uid }, // Jangan hitung pesan dari diri sendiri
      },
      order: [['createdAt', 'DESC']],
    });

    const counts: Record<string, number> = {};
    const detailsMap: Record<string, any> = {};

    unreadMessages.forEach((msg: any) => {
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markMessagesRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { uid, roomId, senderUid } = req.body;

    if (!uid) {
      res.status(400).json({ success: false, message: 'UID diperlukan' });
      return;
    }

    let whereClause: any = {};
    if (roomId) {
      // Grup: tandai semua pesan di room ini yang bukan dari diri sendiri
      whereClause = { roomId, senderUid: { [Op.ne]: uid } };
    } else if (senderUid) {
      // Personal: tandai pesan dari senderUid yang ditujukan ke uid
      whereClause = { senderUid, receiverUid: uid };
    } else {
      res.status(400).json({ success: false, message: 'roomId atau senderUid diperlukan' });
      return;
    }

    await Message.update({ isRead: true }, { where: whereClause });

    res.json({ success: true, message: 'Pesan ditandai terbaca' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};