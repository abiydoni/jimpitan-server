import { Request, Response } from 'express';
import { Village, SubscriptionPlan, VillageSubscription, Invoice, User } from '../models';
import { Op } from 'sequelize';

// ==========================================
// 1. Subscription Plan CRUD
// ==========================================
export const getPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const plans = await SubscriptionPlan.findAll();
    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, basePrice, pricePerKk, maxKk, features } = req.body;
    const plan = await SubscriptionPlan.create({ name, basePrice, pricePerKk, maxKk, features });
    res.status(201).json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findByPk(id as string);
    if (!plan) { res.status(404).json({ success: false, message: 'Plan not found' }); return; }
    
    await plan.update(req.body);
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findByPk(id as string);
    if (!plan) { res.status(404).json({ success: false, message: 'Plan not found' }); return; }
    
    await plan.destroy();
    res.json({ success: true, message: 'Plan deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. Village Subscription Management
// ==========================================
export const getVillageSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const subs = await VillageSubscription.findAll({
      include: [
        { model: Village, as: 'village', attributes: ['name', 'uniqueCode'] },
        { model: SubscriptionPlan, as: 'plan', attributes: ['name', 'basePrice', 'pricePerKk'] }
      ]
    });
    res.json({ success: true, data: subs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const assignSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId, planId, months } = req.body;
    
    // Hitung tanggal
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (months || 1));

    // Cek apakah sudah punya langganan
    let sub = await VillageSubscription.findOne({ where: { villageId } });
    if (sub) {
      await sub.update({ planId, status: 'ACTIVE', startDate, endDate });
    } else {
      sub = await VillageSubscription.create({ villageId, planId, status: 'ACTIVE', startDate, endDate });
    }
    
    res.json({ success: true, data: sub });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 3. Invoices Management
// ==========================================
export const getAllInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const invoices = await Invoice.findAll({
      include: [{ model: Village, as: 'village', attributes: ['name'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: invoices });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approvePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id as string);
    if (!invoice) { res.status(404).json({ success: false, message: 'Invoice not found' }); return; }

    await invoice.update({ status: 'PAID' });

    // Perpanjang langganan desa selama 1 bulan
    const sub = await VillageSubscription.findOne({ where: { villageId: invoice.getDataValue('villageId') } });
    if (sub) {
      const newEndDate = new Date(sub.getDataValue('endDate'));
      newEndDate.setMonth(newEndDate.getMonth() + 1);
      await sub.update({ status: 'ACTIVE', endDate: newEndDate });
    }

    res.json({ success: true, message: 'Payment approved, subscription extended.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 4. API Untuk Pengguna (Warga / RT)
// ==========================================
export const getVillageInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;
    const invoices = await Invoice.findAll({
      where: { villageId },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: invoices });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
