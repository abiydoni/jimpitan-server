import { Request, Response } from 'express';
import { DuesJournal, Tariff, Exemption, JimpitanHistory } from '../models';
import { sendSyncNotification } from '../services/firebaseService';

// ==========================================
// DUES JOURNALS (Iuran & Kas Umum)
// ==========================================

export const getDuesJournals = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;
    const { kkId } = req.query;

    const whereClause: any = { villageId };
    if (kkId) whereClause.kkId = kkId;

    const journals = await DuesJournal.findAll({ where: whereClause, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: journals });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createDuesJournal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, villageId, kkId, amount, journalType, type, description, tariffId, recordedBy, date, period, timestamp, paidDates } = req.body;

    const journal = await DuesJournal.create({
      id: id || `journal_${Date.now()}`,
      villageId,
      kkId: kkId || null,
      amount,
      journalType: journalType || 'UMUM',
      type: type || 'Pemasukan',
      description,
      tariffId: tariffId || null,
      recordedBy,
      date: date || new Date(),
      period: period || null,
      timestamp: timestamp || null,
      paidDates: paidDates || null
    });

    // Trigger FCM Sync
    await sendSyncNotification(villageId, 'REFRESH_DUES');

    res.status(201).json({ success: true, data: journal });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDuesJournal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const journal = await DuesJournal.findByPk(id as string);
    if (!journal) {
      res.status(404).json({ success: false, message: 'Journal not found' });
      return;
    }
    const villageId = (journal as any).villageId;
    await journal.destroy();
    
    // Trigger FCM Sync
    await sendSyncNotification(villageId, 'REFRESH_DUES');
    
    res.json({ success: true, message: 'Journal deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// TARIFFS (Daftar Iuran Aktif)
// ==========================================

export const getTariffs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;
    // For admin, they need to see all. If you want only active, you could pass a query param.
    // For now we will return all so the admin panel can show them.
    const tariffs = await Tariff.findAll({ 
      where: { villageId } 
    });
    res.json({ success: true, data: tariffs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTariff = async (req: Request, res: Response): Promise<void> => {
  try {
    const tariff = await Tariff.create(req.body);
    if (req.body.createdAt) {
      (tariff as any).setDataValue('createdAt', new Date(req.body.createdAt));
      (tariff as any).changed('createdAt', true);
      await tariff.save();
    }
    await sendSyncNotification(req.body.villageId, 'REFRESH_TARIFFS');
    res.status(201).json({ success: true, data: tariff });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTariff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tariff = await Tariff.findByPk(id as string);
    if (!tariff) {
      res.status(404).json({ success: false, message: 'Tariff not found' });
      return;
    }

    if (req.body.createdAt) {
      (tariff as any).setDataValue('createdAt', new Date(req.body.createdAt));
      (tariff as any).changed('createdAt', true);
    }

    await tariff.update(req.body);
    await sendSyncNotification((tariff as any).villageId, 'REFRESH_TARIFFS');
    res.json({ success: true, data: tariff });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTariff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tariff = await Tariff.findByPk(id as string);
    if (!tariff) {
      res.status(404).json({ success: false, message: 'Tariff not found' });
      return;
    }
    const villageId = (tariff as any).villageId;
    await tariff.destroy();
    await sendSyncNotification(villageId, 'REFRESH_TARIFFS');
    res.json({ success: true, message: 'Tariff deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// EXEMPTIONS (Pembebasan Iuran)
// ==========================================

export const getExemptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;
    const { tariffId } = req.query;
    
    const whereClause: any = { villageId };
    if (tariffId) whereClause.tariffId = tariffId;

    const exemptions = await Exemption.findAll({ 
      where: whereClause 
    });
    res.json({ success: true, data: exemptions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createExemption = async (req: Request, res: Response): Promise<void> => {
  try {
    const exemption = await Exemption.create(req.body);
    await sendSyncNotification(req.body.villageId, 'REFRESH_EXEMPTIONS');
    res.status(201).json({ success: true, data: exemption });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateExemption = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const exemption = await Exemption.findByPk(id as string);
    if (!exemption) {
      res.status(404).json({ success: false, message: 'Exemption not found' });
      return;
    }
    await exemption.update(req.body);
    await sendSyncNotification((exemption as any).villageId, 'REFRESH_EXEMPTIONS');
    res.json({ success: true, data: exemption });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteExemption = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const exemption = await Exemption.findByPk(id as string);
    if (!exemption) {
      res.status(404).json({ success: false, message: 'Exemption not found' });
      return;
    }
    const villageId = (exemption as any).villageId;
    await exemption.destroy();
    await sendSyncNotification(villageId, 'REFRESH_EXEMPTIONS');
    res.json({ success: true, message: 'Exemption deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// JIMPITAN HISTORY (Riwayat Jimpitan)
// ==========================================

export const getJimpitanHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;
    const { kkId } = req.query; // optional filter by kkId
    const whereClause: any = { villageId };
    if (kkId) whereClause.kkId = kkId;
    
    const histories = await JimpitanHistory.findAll({ 
      where: whereClause,
      order: [['timestamp', 'DESC']]
    });
    res.json({ success: true, data: histories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createJimpitanHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = {
      id: req.body.id || `jimpitan_${Date.now()}`,
      ...req.body
    };
    const history = await JimpitanHistory.create(payload);
    await sendSyncNotification(req.body.villageId, 'REFRESH_JIMPITAN');
    res.status(201).json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteJimpitanHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const history = await JimpitanHistory.findByPk(id as string);
    if (!history) {
      res.status(404).json({ success: false, message: 'History not found' });
      return;
    }
    const villageId = (history as any).villageId;
    await history.destroy();
    await sendSyncNotification(villageId, 'REFRESH_JIMPITAN');
    res.json({ success: true, message: 'History deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
