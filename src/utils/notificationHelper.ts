import { User, ChatMessage as Message, Role } from '../models';
import { sendChatNotification } from '../services/firebaseService';
import { v4 as uuidv4 } from 'uuid';

export interface NewVillageNotificationData {
  villageId: string;
  villageName: string;
  uniqueCode?: string | null;
  address?: string | null;
  registrantName?: string | null;
  registrantPhone?: string | null;
  registrantEmail?: string | null;
}

/**
 * Mengirim pesan notifikasi otomatis ke Chat Admin Pusat (GROUP_ADMINS dan SUPER_ADMIN)
 * setiap kali ada desa baru yang mendaftar atau didaftarkan.
 */
export const notifyAdminPusatNewVillage = async (data: NewVillageNotificationData): Promise<void> => {
  try {
    // 1. Pastikan akun SYSTEM_BOT ada di database untuk identitas pengirim notifikasi sistem
    await User.findOrCreate({
      where: { uid: 'SYSTEM_BOT' },
      defaults: {
        uid: 'SYSTEM_BOT',
        name: 'Sistem Registrasi',
        foto: 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png',
        photoUrl: 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png',
        status: 'ACTIVE'
      }
    });

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const timeFormatted = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const lines = [
      '🏛️ *PENDAFTARAN DESA BARU*',
      '',
      'Telah terdaftar desa baru di sistem Jimpitan:',
      `• *Nama Desa*: ${data.villageName}`,
      `• *Kode Unik*: ${data.uniqueCode || '-'}`,
      `• *Alamat*: ${data.address || '-'}`,
      `• *Pendaftar*: ${data.registrantName || 'Admin Desa'}`,
      `• *No. HP/WA*: ${data.registrantPhone || '-'}`,
      ...(data.registrantEmail ? [`• *Email*: ${data.registrantEmail}`] : []),
      `• *Waktu*: ${dateFormatted}, ${timeFormatted} WIB`,
      '',
      'Data registrasi telah berhasil disimpan dan siap dikelola.'
    ];

    const messageText = lines.join('\n');

    // Cari superadmin penerima (bisa 'SUPER_ADMIN', akun appsbeem@gmail.com, atau via role SUPER_ADMIN)
    let superadmin = await User.findByPk('SUPER_ADMIN');
    if (!superadmin) {
      superadmin = await User.findOne({ where: { email: 'appsbeem@gmail.com' } });
    }
    if (!superadmin) {
      const superAdminRole = await Role.findOne({ where: { name: 'SUPER_ADMIN' } });
      if (superAdminRole && superAdminRole.getDataValue('userId')) {
        superadmin = await User.findByPk(superAdminRole.getDataValue('userId'));
      }
    }
    const targetReceiverUid = superadmin ? superadmin.getDataValue('uid') : 'SUPER_ADMIN';

    // 2. Simpan pesan chat ke database dengan roomId: 'GROUP_ADMINS' (Grup Admin Pusat)
    await Message.create({
      id: `msg_${uuidv4()}`,
      villageId: data.villageId,
      senderUid: 'SYSTEM_BOT',
      senderName: 'Sistem Registrasi',
      receiverUid: targetReceiverUid,
      roomId: 'GROUP_ADMINS',
      message: messageText,
      isRead: false,
      isDeleted: false,
      isEdited: false,
      isForwarded: false
    });

    // 3. Kirim notifikasi FCM ke Super Admin (jika perangkat Android terdaftar dengan token FCM)
    try {
      const token = superadmin?.getDataValue('fcmToken');
      if (token) {
        await sendChatNotification(
          token,
          'Pendaftaran Desa Baru',
          `Desa "${data.villageName}" (${data.uniqueCode || '-'}) baru saja terdaftar oleh ${data.registrantName || 'Admin'}.`,
          'SYSTEM_BOT',
          data.villageId,
          'GROUP_ADMINS'
        );
      }
    } catch (fcmErr) {
      console.warn('Gagal mengirim FCM notifikasi desa baru ke superadmin:', fcmErr);
    }

    console.log(`✅ [Notification] Registrasi desa [${data.villageName}] berhasil dikirim ke Chat Admin Pusat.`);
  } catch (error) {
    console.error('❌ [Notification] Gagal mengirim notifikasi desa baru ke admin pusat:', error);
  }
};
