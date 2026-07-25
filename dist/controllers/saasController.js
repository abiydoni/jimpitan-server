"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSaasSettings = exports.getSaasSettings = exports.uploadPaymentProof = exports.orderPlan = exports.getVillageInvoice = exports.approvePayment = exports.getAllInvoices = exports.updateSubscription = exports.assignSubscription = exports.getVillageSubscription = exports.getVillageSubscriptions = exports.deletePlan = exports.updatePlan = exports.createPlan = exports.getPlans = void 0;
const models_1 = require("../models");
const sequelize_1 = require("sequelize");
// ==========================================
// 1. Subscription Plan CRUD
// ==========================================
const getPlans = async (req, res) => {
    try {
        const plans = await models_1.SubscriptionPlan.findAll();
        res.json({ success: true, data: plans });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPlans = getPlans;
const createPlan = async (req, res) => {
    try {
        const { name, basePrice, pricePerKk, maxKk, features, durationMonths, durationUnit } = req.body;
        const plan = await models_1.SubscriptionPlan.create({ name, basePrice, pricePerKk, maxKk, features, durationMonths: durationMonths || 1, durationUnit: durationUnit || 'MONTHLY' });
        res.status(201).json({ success: true, data: plan });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createPlan = createPlan;
const updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await models_1.SubscriptionPlan.findByPk(id);
        if (!plan) {
            res.status(404).json({ success: false, message: 'Plan not found' });
            return;
        }
        await plan.update(req.body);
        res.json({ success: true, data: plan });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updatePlan = updatePlan;
const deletePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await models_1.SubscriptionPlan.findByPk(id);
        if (!plan) {
            res.status(404).json({ success: false, message: 'Plan not found' });
            return;
        }
        await plan.destroy();
        res.json({ success: true, message: 'Plan deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deletePlan = deletePlan;
// ==========================================
// 2. Village Subscription Management
// ==========================================
const getVillageSubscriptions = async (req, res) => {
    try {
        const subs = await models_1.VillageSubscription.findAll({
            include: [
                { model: models_1.Village, as: 'village', attributes: ['name', 'uniqueCode'] },
                { model: models_1.SubscriptionPlan, as: 'plan', attributes: ['name', 'basePrice', 'pricePerKk'] }
            ]
        });
        res.json({ success: true, data: subs });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getVillageSubscriptions = getVillageSubscriptions;
const getVillageSubscription = async (req, res) => {
    try {
        const { villageId } = req.params;
        const sub = await models_1.VillageSubscription.findOne({
            where: { villageId: villageId },
            include: [
                { model: models_1.Village, as: 'village', attributes: ['name', 'uniqueCode'] },
                { model: models_1.SubscriptionPlan, as: 'plan', attributes: ['name', 'basePrice', 'pricePerKk'] }
            ]
        });
        if (!sub) {
            res.status(404).json({ success: false, message: 'Subscription not found' });
            return;
        }
        res.json({ success: true, data: sub });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getVillageSubscription = getVillageSubscription;
const assignSubscription = async (req, res) => {
    try {
        const { villageId, planId, months } = req.body;
        let sub = await models_1.VillageSubscription.findOne({ where: { villageId } });
        if (sub) {
            const currentEndDate = sub.getDataValue('endDate');
            const isStillActive = currentEndDate && new Date(currentEndDate) > new Date();
            const startDate = isStillActive ? sub.getDataValue('startDate') : new Date();
            const baseDate = isStillActive ? new Date(currentEndDate) : new Date();
            const newEndDate = new Date(baseDate);
            newEndDate.setMonth(newEndDate.getMonth() + (months || 1));
            await sub.update({ planId, status: 'ACTIVE', startDate, endDate: newEndDate });
        }
        else {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + (months || 1));
            sub = await models_1.VillageSubscription.create({ villageId, planId, status: 'ACTIVE', startDate, endDate });
        }
        res.json({ success: true, data: sub });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.assignSubscription = assignSubscription;
const updateSubscription = async (req, res) => {
    try {
        const { villageId } = req.params;
        const { planId, status, endDate } = req.body;
        let sub = await models_1.VillageSubscription.findOne({ where: { villageId } });
        if (!sub) {
            sub = await models_1.VillageSubscription.create({ villageId, planId, status, startDate: new Date(), endDate });
        }
        else {
            await sub.update({ planId, status, endDate });
        }
        res.json({ success: true, data: sub });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateSubscription = updateSubscription;
// ==========================================
// 3. Invoices Management
// ==========================================
const getAllInvoices = async (req, res) => {
    try {
        const invoices = await models_1.Invoice.findAll({
            include: [{ model: models_1.Village, as: 'village', attributes: ['name'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, data: invoices });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllInvoices = getAllInvoices;
const approvePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await models_1.Invoice.findByPk(id);
        if (!invoice) {
            res.status(404).json({ success: false, message: 'Invoice not found' });
            return;
        }
        await invoice.update({ status: 'PAID' });
        // Perpanjang langganan desa sesuai durasi paket pada invoice
        const sub = await models_1.VillageSubscription.findOne({ where: { villageId: invoice.getDataValue('villageId') } });
        if (sub) {
            const monthsToAdd = parseInt(invoice.getDataValue('durationMonths')) || 1;
            const newEndDate = new Date(sub.getDataValue('endDate'));
            newEndDate.setMonth(newEndDate.getMonth() + monthsToAdd);
            await sub.update({ status: 'ACTIVE', endDate: newEndDate });
        }
        res.json({ success: true, message: 'Payment approved, subscription extended.' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.approvePayment = approvePayment;
// ==========================================
// 4. API Untuk Pengguna (Warga / RT)
// ==========================================
const getVillageInvoice = async (req, res) => {
    try {
        const { villageId } = req.params;
        let invoices = await models_1.Invoice.findAll({
            where: { villageId },
            order: [['createdAt', 'DESC']]
        });
        const hasActiveInvoice = invoices.some(inv => {
            const st = inv.getDataValue('status');
            return st === 'UNPAID' || st === 'PENDING_VERIFICATION';
        });
        if (!hasActiveInvoice) {
            const sub = await models_1.VillageSubscription.findOne({
                where: { villageId },
                include: [{ model: models_1.SubscriptionPlan, as: 'plan' }]
            });
            if (sub) {
                const plan = sub.getDataValue('plan');
                if (plan) {
                    const basePrice = Number(plan.basePrice || 0);
                    const pricePerKk = Number(plan.pricePerKk || 0);
                    const planName = String(plan.name || '').toLowerCase();
                    const isTrial = planName.includes('trial') || planName.includes('uji') || (basePrice === 0 && pricePerKk === 0);
                    if (!isTrial) {
                        const kkCount = await models_1.User.count({
                            where: { villageId, familyId: { [sequelize_1.Op.ne]: null } },
                            col: 'familyId',
                            distinct: true
                        }) || 0;
                        const baseAmount = basePrice;
                        const kkAmount = pricePerKk * kkCount;
                        const totalAmount = baseAmount + kkAmount;
                        const dueDate = new Date();
                        dueDate.setDate(dueDate.getDate() + 7);
                        const newInvoice = await models_1.Invoice.create({
                            villageId,
                            baseAmount,
                            kkAmount,
                            totalAmount,
                            kkCount,
                            status: 'UNPAID',
                            dueDate,
                            planName: plan.getDataValue('name'),
                            durationMonths: plan.getDataValue('durationMonths') || 1,
                            durationUnit: plan.getDataValue('durationUnit') || 'MONTHLY',
                        });
                        invoices = [newInvoice, ...invoices];
                    }
                }
            }
        }
        res.json({ success: true, data: invoices });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getVillageInvoice = getVillageInvoice;
const orderPlan = async (req, res) => {
    try {
        const { villageId } = req.params;
        const { planId } = req.body;
        const plan = await models_1.SubscriptionPlan.findByPk(planId);
        if (!plan) {
            res.status(404).json({ success: false, message: 'Plan not found' });
            return;
        }
        const village = await models_1.Village.findByPk(villageId);
        if (!village) {
            res.status(404).json({ success: false, message: 'Village not found' });
            return;
        }
        // Count KK based on distinct familyId
        const kkCount = await models_1.User.count({
            where: { villageId, familyId: { [sequelize_1.Op.ne]: null } },
            col: 'familyId',
            distinct: true
        }) || 0;
        const baseAmount = plan.getDataValue('basePrice') || 0;
        const kkAmount = (plan.getDataValue('pricePerKk') || 0) * kkCount;
        const totalAmount = parseFloat(baseAmount.toString()) + parseFloat(kkAmount.toString());
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3); // 3 days to pay
        const invoice = await models_1.Invoice.create({
            villageId,
            baseAmount,
            kkAmount,
            totalAmount,
            kkCount,
            status: 'UNPAID',
            dueDate,
            planName: plan.getDataValue('name'),
            durationMonths: plan.getDataValue('durationMonths') || 1,
            durationUnit: plan.getDataValue('durationUnit') || 'MONTHLY',
        });
        res.json({ success: true, data: invoice });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.orderPlan = orderPlan;
const uploadPaymentProof = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentProof } = req.body;
        const invoice = await models_1.Invoice.findByPk(id);
        if (!invoice) {
            res.status(404).json({ success: false, message: 'Invoice not found' });
            return;
        }
        await invoice.update({ paymentProof, status: 'PENDING_VERIFICATION' });
        res.json({ success: true, data: invoice });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.uploadPaymentProof = uploadPaymentProof;
// ==========================================
// 5. System Settings
// ==========================================
const getSaasSettings = async (req, res) => {
    try {
        const settings = await models_1.SystemSetting.findAll();
        res.json({ success: true, data: settings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSaasSettings = getSaasSettings;
const updateSaasSettings = async (req, res) => {
    try {
        const { bankAccountInfo } = req.body; // e.g. "BCA 12345678 a/n Jimpitan"
        // Upsert
        const [setting, created] = await models_1.SystemSetting.findOrCreate({
            where: { key: 'BANK_ACCOUNT_INFO' },
            defaults: { value: bankAccountInfo }
        });
        if (!created) {
            await setting.update({ value: bankAccountInfo });
        }
        res.json({ success: true, data: setting });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateSaasSettings = updateSaasSettings;
