"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteJimpitanHistory = exports.createJimpitanHistory = exports.getJimpitanHistory = exports.deleteExemption = exports.updateExemption = exports.createExemption = exports.getExemptions = exports.deleteTariff = exports.updateTariff = exports.createTariff = exports.getTariffs = exports.deleteDuesJournal = exports.createDuesJournal = exports.getDuesJournals = void 0;
const models_1 = require("../models");
const firebaseService_1 = require("../services/firebaseService");
// ==========================================
// DUES JOURNALS (Iuran & Kas Umum)
// ==========================================
const getDuesJournals = async (req, res) => {
    try {
        const { villageId } = req.params;
        const { kkId } = req.query;
        const whereClause = { villageId };
        if (kkId)
            whereClause.kkId = kkId;
        const journals = await models_1.DuesJournal.findAll({ where: whereClause, order: [['createdAt', 'DESC']] });
        res.json({ success: true, data: journals });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getDuesJournals = getDuesJournals;
const createDuesJournal = async (req, res) => {
    try {
        const { id, villageId, kkId, amount, journalType, type, description, tariffId, recordedBy, date } = req.body;
        const journal = await models_1.DuesJournal.create({
            id: id || `journal_${Date.now()}`,
            villageId,
            kkId: kkId || null,
            amount,
            journalType: journalType || 'UMUM',
            type: type || 'Pemasukan',
            description,
            tariffId: tariffId || null,
            recordedBy,
            date: date || new Date()
        });
        // Trigger FCM Sync
        await (0, firebaseService_1.sendSyncNotification)(villageId, 'REFRESH_DUES');
        res.status(201).json({ success: true, data: journal });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createDuesJournal = createDuesJournal;
const deleteDuesJournal = async (req, res) => {
    try {
        const { id } = req.params;
        const journal = await models_1.DuesJournal.findByPk(id);
        if (!journal) {
            res.status(404).json({ success: false, message: 'Journal not found' });
            return;
        }
        const villageId = journal.villageId;
        await journal.destroy();
        // Trigger FCM Sync
        await (0, firebaseService_1.sendSyncNotification)(villageId, 'REFRESH_DUES');
        res.json({ success: true, message: 'Journal deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteDuesJournal = deleteDuesJournal;
// ==========================================
// TARIFFS (Daftar Iuran Aktif)
// ==========================================
const getTariffs = async (req, res) => {
    try {
        const { villageId } = req.params;
        // For admin, they need to see all. If you want only active, you could pass a query param.
        // For now we will return all so the admin panel can show them.
        const tariffs = await models_1.Tariff.findAll({
            where: { villageId }
        });
        res.json({ success: true, data: tariffs });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTariffs = getTariffs;
const createTariff = async (req, res) => {
    try {
        const tariff = await models_1.Tariff.create(req.body);
        await (0, firebaseService_1.sendSyncNotification)(req.body.villageId, 'REFRESH_TARIFFS');
        res.status(201).json({ success: true, data: tariff });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createTariff = createTariff;
const updateTariff = async (req, res) => {
    try {
        const { id } = req.params;
        const tariff = await models_1.Tariff.findByPk(id);
        if (!tariff) {
            res.status(404).json({ success: false, message: 'Tariff not found' });
            return;
        }
        await tariff.update(req.body);
        await (0, firebaseService_1.sendSyncNotification)(tariff.villageId, 'REFRESH_TARIFFS');
        res.json({ success: true, data: tariff });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateTariff = updateTariff;
const deleteTariff = async (req, res) => {
    try {
        const { id } = req.params;
        const tariff = await models_1.Tariff.findByPk(id);
        if (!tariff) {
            res.status(404).json({ success: false, message: 'Tariff not found' });
            return;
        }
        const villageId = tariff.villageId;
        await tariff.destroy();
        await (0, firebaseService_1.sendSyncNotification)(villageId, 'REFRESH_TARIFFS');
        res.json({ success: true, message: 'Tariff deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteTariff = deleteTariff;
// ==========================================
// EXEMPTIONS (Pembebasan Iuran)
// ==========================================
const getExemptions = async (req, res) => {
    try {
        const { villageId } = req.params;
        const { tariffId } = req.query;
        const whereClause = { villageId };
        if (tariffId)
            whereClause.tariffId = tariffId;
        const exemptions = await models_1.Exemption.findAll({
            where: whereClause
        });
        res.json({ success: true, data: exemptions });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getExemptions = getExemptions;
const createExemption = async (req, res) => {
    try {
        const exemption = await models_1.Exemption.create(req.body);
        await (0, firebaseService_1.sendSyncNotification)(req.body.villageId, 'REFRESH_EXEMPTIONS');
        res.status(201).json({ success: true, data: exemption });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createExemption = createExemption;
const updateExemption = async (req, res) => {
    try {
        const { id } = req.params;
        const exemption = await models_1.Exemption.findByPk(id);
        if (!exemption) {
            res.status(404).json({ success: false, message: 'Exemption not found' });
            return;
        }
        await exemption.update(req.body);
        await (0, firebaseService_1.sendSyncNotification)(exemption.villageId, 'REFRESH_EXEMPTIONS');
        res.json({ success: true, data: exemption });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateExemption = updateExemption;
const deleteExemption = async (req, res) => {
    try {
        const { id } = req.params;
        const exemption = await models_1.Exemption.findByPk(id);
        if (!exemption) {
            res.status(404).json({ success: false, message: 'Exemption not found' });
            return;
        }
        const villageId = exemption.villageId;
        await exemption.destroy();
        await (0, firebaseService_1.sendSyncNotification)(villageId, 'REFRESH_EXEMPTIONS');
        res.json({ success: true, message: 'Exemption deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteExemption = deleteExemption;
// ==========================================
// JIMPITAN HISTORY (Riwayat Jimpitan)
// ==========================================
const getJimpitanHistory = async (req, res) => {
    try {
        const { villageId } = req.params;
        const { kkId } = req.query; // optional filter by kkId
        const whereClause = { villageId };
        if (kkId)
            whereClause.kkId = kkId;
        const histories = await models_1.JimpitanHistory.findAll({
            where: whereClause,
            order: [['timestamp', 'DESC']]
        });
        res.json({ success: true, data: histories });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getJimpitanHistory = getJimpitanHistory;
const createJimpitanHistory = async (req, res) => {
    try {
        const history = await models_1.JimpitanHistory.create(req.body);
        await (0, firebaseService_1.sendSyncNotification)(req.body.villageId, 'REFRESH_JIMPITAN');
        res.status(201).json({ success: true, data: history });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createJimpitanHistory = createJimpitanHistory;
const deleteJimpitanHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const history = await models_1.JimpitanHistory.findByPk(id);
        if (!history) {
            res.status(404).json({ success: false, message: 'History not found' });
            return;
        }
        const villageId = history.villageId;
        await history.destroy();
        await (0, firebaseService_1.sendSyncNotification)(villageId, 'REFRESH_JIMPITAN');
        res.json({ success: true, message: 'History deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteJimpitanHistory = deleteJimpitanHistory;
