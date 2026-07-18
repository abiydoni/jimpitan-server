"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVillageInvoice = exports.approvePayment = exports.getAllInvoices = exports.assignSubscription = exports.getVillageSubscriptions = exports.deletePlan = exports.updatePlan = exports.createPlan = exports.getPlans = void 0;
const models_1 = require("../models");
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
        const { name, basePrice, pricePerKk, maxKk, features } = req.body;
        const plan = await models_1.SubscriptionPlan.create({ name, basePrice, pricePerKk, maxKk, features });
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
const assignSubscription = async (req, res) => {
    try {
        const { villageId, planId, months } = req.body;
        // Hitung tanggal
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + (months || 1));
        // Cek apakah sudah punya langganan
        let sub = await models_1.VillageSubscription.findOne({ where: { villageId } });
        if (sub) {
            await sub.update({ planId, status: 'ACTIVE', startDate, endDate });
        }
        else {
            sub = await models_1.VillageSubscription.create({ villageId, planId, status: 'ACTIVE', startDate, endDate });
        }
        res.json({ success: true, data: sub });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.assignSubscription = assignSubscription;
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
        // Perpanjang langganan desa selama 1 bulan
        const sub = await models_1.VillageSubscription.findOne({ where: { villageId: invoice.getDataValue('villageId') } });
        if (sub) {
            const newEndDate = new Date(sub.getDataValue('endDate'));
            newEndDate.setMonth(newEndDate.getMonth() + 1);
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
        const invoices = await models_1.Invoice.findAll({
            where: { villageId },
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, data: invoices });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getVillageInvoice = getVillageInvoice;
