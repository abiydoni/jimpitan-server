"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuperAdminSummary = exports.getAdminSummary = exports.getMenus = exports.getSlides = exports.getDashboardSummary = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const getDashboardSummary = async (req, res) => {
    try {
        const { villageId } = req.params;
        const { familyId } = req.query; // kkId for checking bills
        // 1. Get Financial Journals (Pemasukan & Pengeluaran for charting)
        // For simplicity, we just fetch all journals for this village
        const journals = await models_1.DuesJournal.findAll({
            where: { villageId },
            attributes: ['date', 'amount', 'type'],
            order: [['date', 'ASC']]
        });
        // 2. Get Jimpitan History
        const jimpitan = await models_1.JimpitanHistory.findAll({
            where: { villageId },
            attributes: ['date', 'amountCollected'],
            order: [['date', 'ASC']]
        });
        // 3. Calculate Overall Bill for family
        let totalBill = 0;
        if (familyId) {
            const activeTariffs = await models_1.Tariff.findAll({
                where: { villageId, isActive: true }
            });
            const exemptions = await models_1.Exemption.findAll({
                where: { villageId, kkId: familyId }
            });
            const payments = await models_1.DuesJournal.findAll({
                where: { villageId, kkId: familyId }
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getDashboardSummary = getDashboardSummary;
const getSlides = async (req, res) => {
    try {
        const { villageId } = req.params;
        const slides = await models_1.Slide.findAll({
            where: { villageId, isActive: true }
        });
        res.json({ success: true, data: slides });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSlides = getSlides;
const getMenus = async (req, res) => {
    try {
        const { villageId } = req.params;
        // We can also fetch generic menus if villageId is not found, or merge
        const menus = await models_1.Menu.findAll({
            where: { villageId },
            order: [['order', 'ASC']]
        });
        res.json({ success: true, data: menus });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMenus = getMenus;
const getAdminSummary = async (req, res) => {
    try {
        const { villageId } = req.params;
        // 1. Total Warga (Users) di desa ini
        const totalUsers = await models_1.User.count({
            where: { villageId }
        });
        // 2. Total Jimpitan Bulan Ini
        // Menghitung total amountCollected pada bulan dan tahun berjalan
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const jimpitanThisMonth = await models_1.JimpitanHistory.sum('amountCollected', {
            where: {
                villageId,
                date: {
                    [sequelize_1.Op.between]: [firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]]
                }
            }
        });
        // 3. Laporan Menunggu (Dues Pending/Unpaid)
        // Untuk saat ini kita buat dummy count atau ambil jumlah iuran (DuesJournal) 
        // dengan type pengeluaran yang butuh approval, dll.
        // Sementara kita hitung jumlah jurnal iuran bulan ini sebagai metrik aktivitas
        const recentActivitiesCount = await models_1.DuesJournal.count({
            where: { villageId }
        });
        // 4. Aktivitas Terbaru (5 Jurnal Terakhir)
        const recentActivities = await models_1.DuesJournal.findAll({
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAdminSummary = getAdminSummary;
const getSuperAdminSummary = async (req, res) => {
    try {
        // 1. Total Desa
        const totalVillages = await models_1.Village.count();
        // 2. Total Seluruh Warga (Users) di sistem
        const totalUsers = await models_1.User.count();
        // 3. Total Jimpitan Keseluruhan (Semua Desa)
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const totalJimpitanGlobal = await models_1.JimpitanHistory.sum('amountCollected', {
            where: {
                date: {
                    [sequelize_1.Op.between]: [firstDay.toISOString().split('T')[0], lastDay.toISOString().split('T')[0]]
                }
            }
        });
        // 4. Aktivitas Terbaru Global
        const recentActivitiesCount = await models_1.DuesJournal.count();
        // DuesJournal tidak memiliki relasi desa secara nama di model (tapi punya villageId)
        // Mari kita join secara manual atau ambil mentahannya
        const recentActivities = await models_1.DuesJournal.findAll({
            order: [['createdAt', 'DESC']],
            limit: 10,
            attributes: ['id', 'villageId', 'amount', 'type', 'journalType', 'description', 'createdAt']
        });
        res.json({
            success: true,
            data: {
                totalVillages,
                totalUsers,
                totalJimpitan: totalJimpitanGlobal || 0,
                pendingReports: recentActivitiesCount,
                recentActivities
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSuperAdminSummary = getSuperAdminSummary;
