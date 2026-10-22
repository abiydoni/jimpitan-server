import { User, ChatMessage as Message, Role } from '../models';
import { sendChatNotification } from '../services/firebaseService';
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';

export interface NewVillageNotificationData {
  villageId: string;
  villageName: string;
  uniqueCode?: string | null;
  address?: string | null;
  registrantUid?: string | null;
  registrantName?: string | null;
  registrantPhone?: string | null;
  registrantEmail?: string | null;
}

/**
 * Mengirim 2 pesan notifikasi pendaftaran desa baru secara MURNI PERSONAL:
 * 1. Pesan rincian pendaftaran ke Akun Appsbee (Super Admin) via chat personal & FCM.
 * 2. Pesan sambutan & panduan resmi langsung ke Pendaftar Desa Baru dari Appsbee Support via chat personal & FCM.
 * (Tidak menggunakan ruang GROUP_ADMINS).
 */
export const notifyAdminPusatNewVillage = async (data: NewVillageNotificationData): Promise<void> => {
  try {
    // 1. Pastikan akun SYSTEM_BOT ada di database untuk fallback identitas pengirim sistem
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

    // 2. Cari akun Super Admin resmi (Appsbee)
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
    const appsbeeUid = superadmin ? superadmin.getDataValue('uid') : 'SUPER_ADMIN';

    // 3. Cari pendaftar desa baru (registrantUid atau admin desa terkait)
    let targetRegistrantUid = data.registrantUid;
    if (!targetRegistrantUid) {
      const adminRole = await Role.findOne({
        where: {
          villageId: data.villageId,
          name: 'ADMIN_DESA',
          userId: { [Op.ne]: null }
        }
      });
      if (adminRole && adminRole.getDataValue('userId')) {
        targetRegistrantUid = adminRole.getDataValue('userId');
      }
    }

    const targetPartnerUid = targetRegistrantUid || 'SYSTEM_BOT';
    const partnerSenderName = data.registrantName || (targetRegistrantUid ? 'Admin Desa' : 'Sistem Registrasi');
    const personalRoomId = `PERSONAL_${[appsbeeUid, targetPartnerUid].sort().join('_')}`;

    // =========================================================================
    // PESAN 1: Notifikasi Rincian Pendaftaran ke Akun Appsbee (Super Admin Personal)
    // =========================================================================
    const adminLines = [
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

    const adminMessageText = adminLines.join('\n');

    await Message.create({
      id: `msg_${uuidv4()}`,
      villageId: data.villageId,
      senderUid: targetPartnerUid,
      senderName: partnerSenderName,
      receiverUid: appsbeeUid,
      roomId: personalRoomId, // Murni chat personal, bukan GROUP_ADMINS
      message: adminMessageText,
      isRead: false,
      isDeleted: false,
      isEdited: false,
      isForwarded: false
    });

    // Push notifikasi FCM personal ke perangkat Super Admin
    try {
      const token = superadmin?.getDataValue('fcmToken');
      if (token) {
        await sendChatNotification(
          token,
          partnerSenderName,
          `Pendaftaran Desa Baru: ${data.villageName} (${data.uniqueCode || '-'})`,
          targetPartnerUid,
          data.villageId,
          personalRoomId
        );
      }
    } catch (fcmErr) {
      console.warn('Gagal mengirim FCM notifikasi desa baru ke superadmin:', fcmErr);
    }
    console.log(`✅ [Notification 1/2] Notifikasi pendaftaran terkirim ke Akun Appsbee (Personal Chat) [${personalRoomId}].`);

    // =========================================================================
    // PESAN 2: Sambutan & Panduan Resmi ke Pendaftar Desa Baru (Personal Chat)
    // =========================================================================
    if (targetRegistrantUid) {
      const registrantUser = await User.findByPk(targetRegistrantUid);
      const recipientName = data.registrantName || registrantUser?.getDataValue('name') || 'Admin Desa';

      const welcomeLines = [
        '🎉 *SELAMAT DATANG DI JIMPITAN!*',
        '',
        `Halo *${recipientName}*,`,
        'Selamat! Pendaftaran desa Anda telah berhasil diproses dan kini sudah aktif di sistem Jimpitan.',
        '',
        `🏛️ *Nama Desa*: ${data.villageName}`,
        `🔑 *Kode Unik Desa*: *${data.uniqueCode || '-'}*`,
        `📍 *Alamat*: ${data.address || '-'}`,
        '⭐ *Status Layanan*: Aktif (Free Trial 1 Bulan)',
        '',
        '*Langkah Selanjutnya:*',
        `1. Bagikan *Kode Unik Desa* (*${data.uniqueCode || '-'}*) kepada para pengurus RT/RW dan warga agar dapat bergabung di aplikasi.`,
        '2. Atur tarif jimpitan, jadwal ronda, dan nomor rekening penampung di menu Pengaturan.',
        '3. Tambahkan atau kelola data kartu keluarga (KK) serta warga desa Anda.',
        '',
        'Jika Anda memiliki pertanyaan atau membutuhkan bantuan teknis, Anda dapat langsung membalas pesan ini untuk terhubung dengan tim Appsbee Support.',
        '',
        'Salam hangat,',
        '*Tim Appsbee Support*'
      ];

      const welcomeMessageText = welcomeLines.join('\n');

      await Message.create({
        id: `msg_${uuidv4()}`,
        villageId: data.villageId,
        senderUid: appsbeeUid,
        senderName: 'Appsbee Support',
        receiverUid: targetRegistrantUid,
        roomId: personalRoomId, // Personal chat yang sama
        message: welcomeMessageText,
        isRead: false,
        isDeleted: false,
        isEdited: false,
        isForwarded: false
      });

      // Push notifikasi FCM personal ke HP pendaftar desa baru
      try {
        const registrantToken = registrantUser?.getDataValue('fcmToken');
        if (registrantToken) {
          await sendChatNotification(
            registrantToken,
            'Appsbee Support',
            `Selamat! Pendaftaran desa "${data.villageName}" berhasil. Kode Unik: ${data.uniqueCode || '-'}.`,
            appsbeeUid,
            data.villageId,
            personalRoomId
          );
        }
      } catch (fcmRegErr) {
        console.warn('Gagal mengirim FCM sambutan ke pendaftar desa baru:', fcmRegErr);
      }
      console.log(`✅ [Notification 2/2] Pesan sambutan terkirim ke Pendaftar Desa [${recipientName} (${targetRegistrantUid})].`);
    } else {
      console.log(`ℹ️ [Notification 2/2] UID pendaftar tidak tersedia, pesan sambutan personal dilewati.`);
    }

  } catch (error) {
    console.error('❌ [Notification] Gagal memproses notifikasi registrasi desa:', error);
  }
};
