import { Request, Response } from 'express';
import { InventoryItem, InventoryLoan, DuesJournal } from '../models';
import { sendSyncNotification } from '../services/firebaseService';

// ==========================================
// INVENTORY ITEMS
// ==========================================

export const getInventoryItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;
    const items = await InventoryItem.findAll({ where: { villageId } });
    res.json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, name, stock, fee, villageId } = req.body;
    const item = await InventoryItem.create({ id, name, stock, fee, villageId });
    
    // Trigger FCM Sync
    await sendSyncNotification(villageId, 'REFRESH_INVENTORY');
    
    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, stock, fee } = req.body;
    const item = await InventoryItem.findByPk(id as string);
    
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
    await sendSyncNotification(item.dataValues.villageId, 'REFRESH_INVENTORY');
    
    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteInventoryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await InventoryItem.findByPk(id as string);
    if (!item) {
      res.status(404).json({ success: false, message: 'Item not found' });
      return;
    }

    const villageId = item.dataValues.villageId;
    await item.destroy();

    // Trigger FCM Sync
    await sendSyncNotification(villageId, 'REFRESH_INVENTORY');
    
    res.json({ success: true, message: 'Item deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// INVENTORY LOANS (Peminjaman)
// ==========================================

export const getInventoryLoans = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;
    const loans = await InventoryLoan.findAll({ where: { villageId }, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: loans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const recordLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, itemId, itemName, borrowerName, quantity, days, feeTotal, villageId } = req.body;

    const item = await InventoryItem.findByPk(itemId);
    if (!item || item.dataValues.stock < quantity) {
      res.status(400).json({ success: false, message: 'Stok tidak mencukupi atau item tidak ada' });
      return;
    }

    // Kurangi stok
    await item.update({ stock: item.dataValues.stock - quantity });

    // Catat peminjaman
    const loan = await InventoryLoan.create({
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
    await sendSyncNotification(villageId, 'REFRESH_INVENTORY');
    
    res.status(201).json({ success: true, data: loan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const returnLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { loanId } = req.params;
    const { actualFee, recordedBy } = req.body;
    const loan = await InventoryLoan.findByPk(loanId as string);

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
    const item = await InventoryItem.findByPk(loan.dataValues.itemId);
    if (item) {
      await item.update({ stock: item.dataValues.stock + loan.dataValues.quantity });
    }

    // Catat ke dues_journal jika ada fee (karena bayarnya pas kembali)
    if (actualFee > 0) {
      await DuesJournal.create({
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
    await sendSyncNotification(loan.dataValues.villageId, 'REFRESH_INVENTORY');

    res.json({ success: true, message: 'Barang berhasil dikembalikan' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { loanId } = req.params;
    const loan = await InventoryLoan.findByPk(loanId as string);

    if (!loan) {
      res.status(404).json({ success: false, message: 'Loan not found' });
      return;
    }

    if (loan.dataValues.status === 'KEMBALI') {
      res.status(400).json({ success: false, message: 'Barang sudah dikembalikan sebelumnya, tidak bisa dibatalkan' });
      return;
    }

    // Kembalikan stok
    const item = await InventoryItem.findByPk(loan.dataValues.itemId);
    if (item) {
      await item.update({ stock: item.dataValues.stock + loan.dataValues.quantity });
    }

    // Hapus data peminjaman
    await loan.destroy();

    // Trigger FCM Sync
    await sendSyncNotification(loan.dataValues.villageId, 'REFRESH_INVENTORY');

    res.json({ success: true, message: 'Peminjaman berhasil dibatalkan' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
