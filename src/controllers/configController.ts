import { Request, Response } from 'express';
import { SystemSetting } from '../models';

/**
 * GET /api/config/version
 * Endpoint publik — tidak perlu auth, dipanggil saat app dibuka.
 */
export const getAppVersion = async (req: Request, res: Response) => {
  try {
    const keys = ['latestVersion', 'minVersion', 'forceUpdate', 'updateUrl', 'releaseNotes', 'showNotification', 'showUpdateNotification'];
    const settings = await SystemSetting.findAll({ where: { key: keys } });
    
    // Convert array to object
    const config: any = {};
    settings.forEach((s: any) => {
      config[s.key] = s.value;
    });

    const showNotif = config.showNotification !== undefined 
      ? (config.showNotification === 'true' || config.showNotification === '1')
      : (config.showUpdateNotification !== undefined 
          ? (config.showUpdateNotification === 'true' || config.showUpdateNotification === '1') 
          : true);

    // Default values if missing
    const data = {
      latestVersion: config.latestVersion || '1.9.4',
      minVersion: config.minVersion || '1.0.0',
      forceUpdate: config.forceUpdate === 'true' || config.forceUpdate === '1',
      updateUrl: config.updateUrl || 'https://play.google.com/store/apps/details?id=com.appsbeem.jimpitan',
      releaseNotes: config.releaseNotes || 'Perbaikan bug dan peningkatan performa.',
      showNotification: showNotif,
      showUpdateNotification: showNotif,
    };

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Error fetching version config:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * PUT /api/config/version
 * Endpoint untuk admin mengupdate versi aplikasi
 */
export const updateAppVersion = async (req: Request, res: Response) => {
  try {
    const { latestVersion, minVersion, forceUpdate, updateUrl, releaseNotes, showNotification, showUpdateNotification } = req.body;
    
    const notifVal = showNotification !== undefined ? showNotification : showUpdateNotification;

    const updates = [
      { key: 'latestVersion', value: latestVersion },
      { key: 'minVersion', value: minVersion },
      { key: 'forceUpdate', value: forceUpdate !== undefined ? (forceUpdate ? 'true' : 'false') : undefined },
      { key: 'updateUrl', value: updateUrl },
      { key: 'releaseNotes', value: releaseNotes },
      { key: 'showNotification', value: notifVal !== undefined ? (notifVal ? 'true' : 'false') : undefined },
      { key: 'showUpdateNotification', value: notifVal !== undefined ? (notifVal ? 'true' : 'false') : undefined },
    ];

    for (const item of updates) {
      if (item.value !== undefined) {
        // Upsert setting
        const [setting, created] = await SystemSetting.findOrCreate({
          where: { key: item.key },
          defaults: { value: String(item.value) }
        });
        
        if (!created) {
          await (setting as any).update({ value: String(item.value) });
        }
      }
    }

    res.json({ success: true, message: 'Konfigurasi versi berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating version config:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
