import { Router } from 'express';
import {
  getPlans, createPlan, updatePlan, deletePlan,
  getVillageSubscriptions, getVillageSubscription, assignSubscription, updateSubscription,
  getAllInvoices, approvePayment, rejectPayment,
  getVillageInvoice, orderPlan, uploadPaymentProof,
  getSaasSettings, updateSaasSettings
} from '../controllers/saasController';

const router = Router();

// ==========================================
// RUTE SUPERADMIN (Manajemen SaaS)
// ==========================================

// Settings
router.get('/settings', getSaasSettings);
router.put('/settings', updateSaasSettings);

// Plans
router.get('/plans', getPlans);
router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

// Subscriptions
router.get('/subscriptions', getVillageSubscriptions);
router.post('/subscriptions/assign', assignSubscription);
router.put('/subscriptions/:villageId', updateSubscription);

// Invoices
router.get('/invoices', getAllInvoices);
router.post('/invoices/:id/approve', approvePayment);
router.post('/invoices/:id/reject', rejectPayment);

// ==========================================
// RUTE PUBLIK / PENGGUNA (Untuk Warga / RT)
// ==========================================

// Get subscription untuk desa spesifik
router.get('/village-subscription/:villageId', getVillageSubscription);
router.get('/village/:villageId/subscription', getVillageSubscription);

// Get invoice untuk desa spesifik
router.get('/village/:villageId/invoices', getVillageInvoice);
router.post('/village/:villageId/invoices/order', orderPlan);
router.post('/invoices/:id/upload-proof', uploadPaymentProof);

export default router;
