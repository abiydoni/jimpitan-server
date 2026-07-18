import { Router } from 'express';
import {
  getPlans, createPlan, updatePlan, deletePlan,
  getVillageSubscriptions, assignSubscription,
  getAllInvoices, approvePayment,
  getVillageInvoice
} from '../controllers/saasController';

const router = Router();

// ==========================================
// RUTE SUPERADMIN (Manajemen SaaS)
// ==========================================

// Plans
router.get('/plans', getPlans);
router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

// Subscriptions
router.get('/subscriptions', getVillageSubscriptions);
router.post('/subscriptions/assign', assignSubscription);

// Invoices
router.get('/invoices', getAllInvoices);
router.post('/invoices/:id/approve', approvePayment);

// ==========================================
// RUTE PUBLIK / PENGGUNA (Untuk Warga / RT)
// ==========================================

// Get invoice untuk desa spesifik
router.get('/village/:villageId/invoices', getVillageInvoice);

export default router;
