import { Request, Response } from 'express';
import { Village, SubscriptionPlan, VillageSubscription, Invoice, User, SystemSetting } from '../models';
import { Op } from 'sequelize';
import { addJakartaDays, addJakartaMonths } from '../utils/jakartaTime';

// ==========================================
// 1. Subscription Plan CRUD
// ==========================================
export const getPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const plans = await SubscriptionPlan.findAll();
    // Urutkan dari masa paket terendah (ascending)
    plans.sort((a, b) => {
      const getMonths = (p: any) => {
        const m = Number(p.getDataValue('durationMonths')) || 1;
        const u = String(p.getDataValue('durationUnit')).toUpperCase();
        if (u.includes('YEAR') || u.includes('TAHUN')) return m * 12;
        if (u.includes('WEEK') || u.includes('MINGGU')) return m * 0.25;
        return m;
      };
      return getMonths(a) - getMonths(b);
    });
    let taxPercentage = 10;
    try {
      const taxSetting = await SystemSetting.findOne({ where: { key: 'TAX_PERCENTAGE' } });
      if (taxSetting) taxPercentage = parseFloat(taxSetting.getDataValue('value') || '10');
    } catch (err) {
      console.error('Failed to fetch TAX_PERCENTAGE setting:', err);
    }
    res.json({ success: true, data: plans, taxPercentage });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, basePrice, pricePerKk, maxKk, features, durationMonths, durationUnit } = req.body;
    const plan = await SubscriptionPlan.create({ name, basePrice, pricePerKk: pricePerKk || 0, maxKk, features, durationMonths: durationMonths || 1, durationUnit: durationUnit || 'MONTHLY' });
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

export const getVillageSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;
    const sub = await VillageSubscription.findOne({
      where: { villageId: villageId as string },
      include: [
        { model: Village, as: 'village', attributes: ['name', 'uniqueCode'] },
        { model: SubscriptionPlan, as: 'plan', attributes: ['name', 'basePrice', 'pricePerKk'] }
      ]
    });
    if (!sub) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }
    res.json({ success: true, data: sub });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const assignSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId, planId, months } = req.body;
    
    let sub = await VillageSubscription.findOne({ where: { villageId } });
    if (sub) {
      const currentEndDate = sub.getDataValue('endDate');
      const isStillActive = currentEndDate && new Date(currentEndDate) > new Date();
      
      const startDate = isStillActive ? sub.getDataValue('startDate') : new Date();
      const baseDate = isStillActive ? new Date(currentEndDate) : new Date();
      const newEndDate = addJakartaMonths(baseDate, months || 1);

      await sub.update({ planId, status: 'ACTIVE', startDate, endDate: newEndDate });
    } else {
      const startDate = new Date();
      const endDate = addJakartaMonths(startDate, months || 1);
      sub = await VillageSubscription.create({ villageId, planId, status: 'ACTIVE', startDate, endDate });
    }
    
    res.json({ success: true, data: sub });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;
    const { planId, status, endDate } = req.body;
    
    let sub = await VillageSubscription.findOne({ where: { villageId } });
    if (!sub) { 
        sub = await VillageSubscription.create({ villageId, planId, status, startDate: new Date(), endDate });
    } else {
        await sub.update({ planId, status, endDate });
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

    // Perpanjang langganan desa sesuai durasi paket pada invoice
    const sub = await VillageSubscription.findOne({ where: { villageId: invoice.getDataValue('villageId') } });
    if (sub) {
      const monthsToAdd = parseInt(invoice.getDataValue('durationMonths') as any) || 1;
      const newEndDate = addJakartaMonths(new Date(sub.getDataValue('endDate')), monthsToAdd);
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
    let invoices = await Invoice.findAll({
      where: { villageId },
      order: [['createdAt', 'DESC']]
    });

    const hasActiveInvoice = invoices.some(inv => {
      const st = inv.getDataValue('status');
      return st === 'UNPAID' || st === 'PENDING_VERIFICATION';
    });

    if (!hasActiveInvoice) {
      const sub = await VillageSubscription.findOne({
        where: { villageId },
        include: [{ model: SubscriptionPlan, as: 'plan' }]
      });
      if (sub) {
        const plan = sub.getDataValue('plan');
        if (plan) {
          const basePrice = Number(plan.basePrice || 0);
          const pricePerKk = Number(plan.pricePerKk || 0);
          const planName = String(plan.name || '').toLowerCase();
          const isTrial = planName.includes('trial') || planName.includes('uji') || (basePrice === 0 && pricePerKk === 0);

          if (!isTrial) {
            const kkCount = await User.count({
              where: { villageId, familyId: { [Op.ne]: null } },
              col: 'familyId',
              distinct: true
            }) || 0;

            const baseAmount = basePrice;
            const kkAmount = pricePerKk * kkCount;
            const subtotal = baseAmount + kkAmount;

            let taxPercentage = 10;
            try {
              const taxSetting = await SystemSetting.findOne({ where: { key: 'TAX_PERCENTAGE' } });
              if (taxSetting) taxPercentage = parseFloat(taxSetting.getDataValue('value') || '10');
            } catch (err) {}
            const taxAmount = (subtotal * taxPercentage) / 100;
            const totalAmount = subtotal + taxAmount;

            const dueDate = addJakartaDays(new Date(), 7);

            let newInvoice;
            try {
              newInvoice = await Invoice.create({
                villageId,
                baseAmount,
                kkAmount,
                totalAmount,
                taxAmount,
                taxPercentage,
                kkCount,
                status: 'UNPAID',
                dueDate,
                planName: plan.getDataValue('name'),
                durationMonths: plan.getDataValue('durationMonths') || 1,
                durationUnit: plan.getDataValue('durationUnit') || 'MONTHLY',
              });
            } catch (createErr: any) {
              newInvoice = await Invoice.create({
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
              } as any);
            }

            invoices = [newInvoice, ...invoices];
          }
        }
      }
    }

    res.json({ success: true, data: invoices });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const orderPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { villageId } = req.params;
    const { planId } = req.body;
    
    const plan = await SubscriptionPlan.findByPk(planId);
    if (!plan) { res.status(404).json({ success: false, message: 'Plan not found' }); return; }

    const village = await Village.findByPk(villageId as string);
    if (!village) { res.status(404).json({ success: false, message: 'Village not found' }); return; }

    // Count KK based on distinct familyId
    const kkCount = await User.count({
      where: { villageId, familyId: { [Op.ne]: null } },
      col: 'familyId',
      distinct: true
    }) || 0; 
    const baseAmount = plan.getDataValue('basePrice') || 0;
    const kkAmount = (plan.getDataValue('pricePerKk') || 0) * kkCount;
    const subtotal = parseFloat(baseAmount.toString()) + parseFloat(kkAmount.toString());

    let taxPercentage = 10;
    try {
      const taxSetting = await SystemSetting.findOne({ where: { key: 'TAX_PERCENTAGE' } });
      if (taxSetting) taxPercentage = parseFloat(taxSetting.getDataValue('value') || '10');
    } catch (err) {}
    const taxAmount = (subtotal * taxPercentage) / 100;
    const totalAmount = subtotal + taxAmount;

    const dueDate = addJakartaDays(new Date(), 3); // 3 days to pay in Asia/Jakarta

    let invoice;
    try {
      invoice = await Invoice.create({
        villageId,
        baseAmount,
        kkAmount,
        totalAmount,
        taxAmount,
        taxPercentage,
        kkCount,
        status: 'UNPAID',
        dueDate,
        planName: plan.getDataValue('name'),
        durationMonths: plan.getDataValue('durationMonths') || 1,
        durationUnit: plan.getDataValue('durationUnit') || 'MONTHLY',
      });
    } catch (createErr: any) {
      console.warn('Fallback Invoice.create without tax columns in orderPlan:', createErr.message);
      invoice = await Invoice.create({
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
      } as any);
    }

    res.json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadPaymentProof = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentProof } = req.body;
    
    const invoice = await Invoice.findByPk(id as string);
    if (!invoice) { res.status(404).json({ success: false, message: 'Invoice not found' }); return; }

    await invoice.update({ paymentProof, status: 'PENDING_VERIFICATION' });
    res.json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// 5. System Settings
// ==========================================
export const getSaasSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await SystemSetting.findAll();
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSaasSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bankAccountInfo, taxPercentage, TAX_PERCENTAGE } = req.body;
    
    if (bankAccountInfo !== undefined) {
      const [setting, created] = await SystemSetting.findOrCreate({
        where: { key: 'BANK_ACCOUNT_INFO' },
        defaults: { value: bankAccountInfo, description: 'Informasi Rekening Bank Pembayaran' }
      });
      if (!created) {
        await setting.update({ value: bankAccountInfo });
      }
    }

    const taxVal = taxPercentage !== undefined ? taxPercentage : TAX_PERCENTAGE;
    if (taxVal !== undefined) {
      const [setting, created] = await SystemSetting.findOrCreate({
        where: { key: 'TAX_PERCENTAGE' },
        defaults: { value: String(taxVal), description: 'Persentase Pajak (PPN) Tagihan' }
      });
      if (!created) {
        await setting.update({ value: String(taxVal) });
      }
    }
    
    const allSettings = await SystemSetting.findAll();
    res.json({ success: true, data: allSettings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
