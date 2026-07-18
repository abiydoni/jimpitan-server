"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelLoan = exports.returnLoan = exports.recordLoan = exports.getInventoryLoans = exports.deleteInventoryItem = exports.updateInventoryItem = exports.createInventoryItem = exports.getInventoryItems = void 0;
const models_1 = require("../models");
const firebaseService_1 = require("../services/firebaseService");
// ==========================================
// INVENTORY ITEMS
// ==========================================
const getInventoryItems = async (req, res) => {
    try {
        const { villageId } = req.params;
        const items = await models_1.InventoryItem.findAll({ where: { villageId } });
        res.json({ success: true, data: items });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getInventoryItems = getInventoryItems;
const createInventoryItem = async (req, res) => {
    try {
        const { id, name, stock, fee, villageId } = req.body;
        const item = await models_1.InventoryItem.create({ id, name, stock, fee, villageId });
        // Trigger FCM Sync
        await (0, firebaseService_1.sendSyncNotification)(villageId, 'REFRESH_INVENTORY');
        res.status(201).json({ success: true, data: item });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createInventoryItem = createInventoryItem;
const updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, stock, fee } = req.body;
        const item = await models_1.InventoryItem.findByPk(id);
        if (!item) {
            res.status(404).json({ success: false, message: 'Item not found' });
            return;
        }
        await item.update({
            name: name ?? item.dataValues.name,
            stock: stock ?? item.dataValues.stock,
            fee: fee ?? item.dataValues.fee
        });
        // Trigger FCM Sync
        await (0, firebaseService_1.sendSyncNotification)(item.dataValues.villageId, 'REFRESH_INVENTORY');
        res.json({ success: true, data: item });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateInventoryItem = updateInventoryItem;
const deleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await models_1.InventoryItem.findByPk(id);
        if (!item) {
            res.status(404).json({ success: false, message: 'Item not found' });
            return;
        }
        const villageId = item.dataValues.villageId;
        await item.destroy();
        // Trigger FCM Sync
        await (0, firebaseService_1.sendSyncNotification)(villageId, 'REFRESH_INVENTORY');
        res.json({ success: true, message: 'Item deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteInventoryItem = deleteInventoryItem;
// ==========================================
// INVENTORY LOANS (Peminjaman)
// ==========================================
const getInventoryLoans = async (req, res) => {
    try {
        const { villageId } = req.params;
        const loans = await models_1.InventoryLoan.findAll({ where: { villageId }, order: [['createdAt', 'DESC']] });
        res.json({ success: true, data: loans });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getInventoryLoans = getInventoryLoans;
const recordLoan = async (req, res) => {
    try {
        const { id, itemId, itemName, borrowerName, quantity, days, feeTotal, villageId } = req.body;
        const item = await models_1.InventoryItem.findByPk(itemId);
        if (!item || item.dataValues.stock < quantity) {
            res.status(400).json({ success: false, message: 'Stok tidak mencukupi atau item tidak ada' });
            return;
        }
        // Kurangi stok
        await item.update({ stock: item.dataValues.stock - quantity });
        // Catat peminjaman
        const loan = await models_1.InventoryLoan.create({
            id,
            itemId,
            itemName,
            borrowerName,
            quantity,
            days,
            feeTotal,
            villageId,
            status: 'DIPINJAM'
        });
        // Biaya dibayar saat pengembalian, tidak dicatat ke jurnal saat peminjaman.
        // Trigger FCM Sync
        await (0, firebaseService_1.sendSyncNotification)(villageId, 'REFRESH_INVENTORY');
        res.status(201).json({ success: true, data: loan });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.recordLoan = recordLoan;
const returnLoan = async (req, res) => {
    try {
        const { loanId } = req.params;
        const { actualFee, recordedBy } = req.body;
        const loan = await models_1.InventoryLoan.findByPk(loanId);
        if (!loan) {
            res.status(404).json({ success: false, message: 'Loan not found' });
            return;
        }
        if (loan.dataValues.status === 'KEMBALI') {
            res.status(400).json({ success: false, message: 'Barang sudah dikembalikan sebelumnya' });
            return;
        }
        // Ubah status dan feeTotal
        await loan.update({
            status: 'KEMBALI',
            feeTotal: actualFee !== undefined ? actualFee : loan.dataValues.feeTotal
        });
        // Kembalikan stok
        const item = await models_1.InventoryItem.findByPk(loan.dataValues.itemId);
        if (item) {
            await item.update({ stock: item.dataValues.stock + loan.dataValues.quantity });
        }
        // Catat ke dues_journal jika ada fee (karena bayarnya pas kembali)
        if (actualFee > 0) {
            await models_1.DuesJournal.create({
                id: `journal_return_${Date.now()}`,
                villageId: loan.dataValues.villageId,
                amount: actualFee,
                journalType: 'SEWA_INVENTARIS',
                type: 'Pemasukan',
                description: `Sewa inventaris ${loan.dataValues.itemName} oleh ${loan.dataValues.borrowerName}`,
                date: new Date()
            });
        }
        // Trigger FCM Sync
        await (0, firebaseService_1.sendSyncNotification)(loan.dataValues.villageId, 'REFRESH_INVENTORY');
        res.json({ success: true, message: 'Barang berhasil dikembalikan' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.returnLoan = returnLoan;
const cancelLoan = async (req, res) => {
    try {
        const { loanId } = req.params;
        const loan = await models_1.InventoryLoan.findByPk(loanId);
        if (!loan) {
            res.status(404).json({ success: false, message: 'Loan not found' });
            return;
        }
        if (loan.dataValues.status === 'KEMBALI') {
            res.status(400).json({ success: false, message: 'Barang sudah dikembalikan sebelumnya, tidak bisa dibatalkan' });
            return;
        }
        // Kembalikan stok
        const item = await models_1.InventoryItem.findByPk(loan.dataValues.itemId);
        if (item) {
            await item.update({ stock: item.dataValues.stock + loan.dataValues.quantity });
        }
        // Hapus data peminjaman
        await loan.destroy();
        // Trigger FCM Sync
        await (0, firebaseService_1.sendSyncNotification)(loan.dataValues.villageId, 'REFRESH_INVENTORY');
        res.json({ success: true, message: 'Peminjaman berhasil dibatalkan' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.cancelLoan = cancelLoan;
