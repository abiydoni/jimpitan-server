import { Request, Response } from 'express';
import { Village, User, DuesJournal, sequelize, VillageSubscription, SubscriptionPlan } from '../models';
import os from 'os';
import { startupLogs } from '../utils/startupLogs';

export const getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalVillages = await Village.count();
    const totalUsers = await User.count({ where: { status: 'ACTIVE' } });
    
    // Calculate total income across all villages (type IN)
    const incomeResult = await DuesJournal.sum('amount', { where: { type: 'IN' } });
    const totalIncome = incomeResult || 0;

    res.json({
      success: true,
      data: {
        totalVillages,
        totalUsers,
        totalIncome
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getChatContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const villages = await Village.findAll();
    const users = await User.findAll({ where: { status: 'ACTIVE' } });
    
    res.json({
      success: true,
      data: {
        villages,
        users
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFcmToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    // Simpan token superadmin ke tabel User dengan uid khusus
    let superadmin = await User.findByPk('SUPER_ADMIN');
    if (!superadmin) {
      superadmin = await User.create({
        uid: 'SUPER_ADMIN',
        name: 'Appsbee Support',
        email: 'superadmin@jimpitan.local',
        status: 'ACTIVE'
      });
    }
    
    superadmin.fcmToken = token;
    await superadmin.save();
    
    res.json({ success: true, message: 'FCM Token updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getVillages = async (req: Request, res: Response): Promise<void> => {
  try {
    const villages = await Village.findAll({
      include: [{
        model: VillageSubscription,
        as: 'subscriptions',
        include: [{ model: SubscriptionPlan, as: 'plan' }]
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: villages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateVillageConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { config } = req.body;

    const village = await Village.findByPk(id as string);
    if (!village) {
      res.status(404).json({ success: false, message: 'Village not found' });
      return;
    }

    // Merge existing config with new config
    const currentConfig = village.getDataValue('config') || {};
    const updatedConfig = { ...currentConfig, ...config };

    await village.update({ config: updatedConfig });

    res.json({ success: true, data: village });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSystemStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // Memeriksa koneksi database MySQL
    let dbStatus = 'Disconnected';
    try {
      await sequelize.authenticate();
      dbStatus = 'Connected';
    } catch (e) {
      dbStatus = 'Error';
    }

    const uptimeSeconds = process.uptime();
    const osUptime = os.uptime();
    const memoryUsage = process.memoryUsage();
    
    // Konversi byte ke MB
    const formatMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(2) + ' MB';
    
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercentage = ((usedMem / totalMem) * 100).toFixed(1);

    // CPU Load Averages (1, 5, 15 minutes) - loadavg() selalu 0 di Windows
    const isWindows = os.platform() === 'win32';
    const loadAvg = isWindows ? ['N/A', 'N/A', 'N/A'] : os.loadavg().map(load => load.toFixed(2));

    res.json({
      success: true,
      data: {
        serverTime: new Date().toISOString(),
        nodeUptime: Math.floor(uptimeSeconds),
        osUptime: Math.floor(osUptime),
        databaseStatus: dbStatus,
        nodeInfo: {
          version: process.version,
          rss: formatMB(memoryUsage.rss),
          heapTotal: formatMB(memoryUsage.heapTotal),
          heapUsed: formatMB(memoryUsage.heapUsed),
          external: formatMB(memoryUsage.external)
        },
        osInfo: {
          platform: os.platform(),
          type: os.type(),
          release: os.release(),
          arch: os.arch(),
          cpus: os.cpus().length,
          cpuModel: os.cpus()[0]?.model || 'Unknown',
          loadAvg: loadAvg,
          totalMemory: formatMB(totalMem),
          freeMemory: formatMB(freeMem),
          usedMemoryPercentage: memPercentage + '%'
        },
        startupLogs: startupLogs
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
