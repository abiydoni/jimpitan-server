"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMenus = exports.getSlides = exports.getDashboardSummary = void 0;
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
