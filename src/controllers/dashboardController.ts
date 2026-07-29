import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { 
  Village, 
  Menu, 
  Slide, 
  Tariff, 
  Exemption, 
  DuesJournal, 
  JimpitanHistory,
  User
} from '../models';

export const getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;
    const { familyId } = req.query; // kkId for checking bills

    // 1. Get Financial Journals (Pemasukan & Pengeluaran for charting)
    // For simplicity, we just fetch all journals for this village
    const journals = await DuesJournal.findAll({
      where: { villageId },
      attributes: ['date', 'amount', 'type'],
      order: [['date', 'ASC']]
    });

    // 2. Get Jimpitan History
    const jimpitan = await JimpitanHistory.findAll({
      where: { villageId },
      attributes: ['date', 'amountCollected'],
      order: [['date', 'ASC']]
    });

    // 3. Calculate Overall Bill for family
    let totalBill = 0;
    if (familyId) {
      const activeTariffs = await Tariff.findAll({
        where: { villageId, isActive: true }
      });

      const exemptions = await Exemption.findAll({
        where: { villageId, kkId: familyId as string }
      });

      const payments = await DuesJournal.findAll({
        where: { villageId, kkId: familyId as string }
      });

      const now = new Date();
      
      for (const t of activeTariffs) {
        // Check if exempted
        let isExempt = false;
        for (const ex of exemptions) {
          if (ex.dataValues.tariffId === t.dataValues.id) {
            const start = ex.dataValues.startDate ? new Date(ex.dataValues.startDate) : null;
            const end = ex.dataValues.endDate ? new Date(ex.dataValues.endDate) : null;
            if (start && start <= now) {
              if (!end || end >= now) {
                isExempt = true;
                break;
              }
            }
          }
        }
        
        if (!isExempt) {
          // Find total paid for this tariff
          const paid = payments
            .filter(p => p.dataValues.tariffId === t.dataValues.id)
            .reduce((sum, p) => sum + Number(p.dataValues.amount), 0);
          
          // Simplified bill calculation: total expected vs paid
          // We assume a simple single charge for now to mock the old logic
          const expected = t.dataValues.amount; // In reality this might be monthly
          if (paid < expected) {
            totalBill += (expected - paid);
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        journals,
        jimpitan,
        totalBill
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSlides = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;
    const slides = await Slide.findAll({
      where: { villageId, isActive: true }
    });
    res.json({ success: true, data: slides });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMenus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;
    // We can also fetch generic menus if villageId is not found, or merge
    const menus = await Menu.findAll({
      where: { villageId },
      order: [['order', 'ASC']]
    });
    res.json({ success: true, data: menus });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;

    // 1. Total Warga (Users) di desa ini
    const totalUsers = await User.count({
      where: { villageId }
    });

    // 2. Total Jimpitan Bulan Ini
    // Menghitung total amountCollected pada bulan dan tahun berjalan
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const jimpitanThisMonth = await JimpitanHistory.sum('amountCollected', {
      where: {
        villageId,
        date: {
          [Op.between]: [firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]]
        }
      }
    });

    // 3. Laporan Menunggu (Dues Pending/Unpaid)
    // Untuk saat ini kita buat dummy count atau ambil jumlah iuran (DuesJournal) 
    // dengan type pengeluaran yang butuh approval, dll.
    // Sementara kita hitung jumlah jurnal iuran bulan ini sebagai metrik aktivitas
    const recentActivitiesCount = await DuesJournal.count({
      where: { villageId }
    });

    // 4. Aktivitas Terbaru (5 Jurnal Terakhir)
    const recentActivities = await DuesJournal.findAll({
      where: { villageId },
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'amount', 'type', 'journalType', 'description', 'createdAt']
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalJimpitan: jimpitanThisMonth || 0,
        pendingReports: recentActivitiesCount, // Bisa disesuaikan logikanya nanti
        recentActivities
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSuperAdminSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Total Desa
    const totalVillages = await Village.count();

    // 2. Total Seluruh Warga (Users) di sistem
    const totalUsers = await User.count();

    // 3. Total Jimpitan Keseluruhan (Semua Desa)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const totalJimpitanGlobal = await JimpitanHistory.sum('amountCollected', {
      where: {
        date: {
          [Op.between]: [firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]]
        }
      }
    });

    // 4. Aktivitas Terbaru Global
    const recentActivitiesCount = await DuesJournal.count();
    
    // DuesJournal tidak memiliki relasi desa secara nama di model (tapi punya villageId)
    // Mari kita join secara manual atau ambil mentahannya
    const recentActivities = await DuesJournal.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10,
      attributes: ['id', 'villageId', 'amount', 'type', 'journalType', 'description', 'createdAt']
    });

    // 5. Data Chart (Jimpitan 7 Hari Terakhir)
    const chartData: any[] = [];
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    
    const jimpitanData = await JimpitanHistory.findAll({
      where: {
        date: {
          [Op.between]: [sevenDaysAgo.toISOString().split('T')[0], now.toISOString().split('T')[0]]
        }
      },
      attributes: ['date', 'amountCollected']
    });

    const dailyMap: Record<string, number> = {};
    jimpitanData.forEach(j => {
      const d = j.dataValues.date;
      dailyMap[d] = (dailyMap[d] || 0) + Number(j.dataValues.amountCollected || 0);
    });

    for (let i = 0; i <= 6; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(sevenDaysAgo.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayLabel = d.toLocaleDateString('id-ID', { weekday: 'short' });
      const shortDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      
      chartData.push({
        label: `${dayLabel}, ${shortDate}`,
        value: dailyMap[dateStr] || 0
      });
    }

    res.json({
      success: true,
      data: {
        totalVillages,
        totalUsers,
        totalJimpitan: totalJimpitanGlobal || 0,
        pendingReports: recentActivitiesCount,
        recentActivities,
        chartData
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
