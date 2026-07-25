"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const saasController_1 = require("../controllers/saasController");
const router = (0, express_1.Router)();
// ==========================================
// RUTE SUPERADMIN (Manajemen SaaS)
// ==========================================
// Settings
router.get('/settings', saasController_1.getSaasSettings);
router.put('/settings', saasController_1.updateSaasSettings);
// Plans
router.get('/plans', saasController_1.getPlans);
router.post('/plans', saasController_1.createPlan);
router.put('/plans/:id', saasController_1.updatePlan);
router.delete('/plans/:id', saasController_1.deletePlan);
// Subscriptions
router.get('/subscriptions', saasController_1.getVillageSubscriptions);
router.post('/subscriptions/assign', saasController_1.assignSubscription);
router.put('/subscriptions/:villageId', saasController_1.updateSubscription);
// Invoices
router.get('/invoices', saasController_1.getAllInvoices);
router.post('/invoices/:id/approve', saasController_1.approvePayment);
// ==========================================
// RUTE PUBLIK / PENGGUNA (Untuk Warga / RT)
// ==========================================
// Get subscription untuk desa spesifik
router.get('/village-subscription/:villageId', saasController_1.getVillageSubscription);
router.get('/village/:villageId/subscription', saasController_1.getVillageSubscription);
// Get invoice untuk desa spesifik
router.get('/village/:villageId/invoices', saasController_1.getVillageInvoice);
router.post('/village/:villageId/invoices/order', saasController_1.orderPlan);
router.post('/invoices/:id/upload-proof', saasController_1.uploadPaymentProof);
exports.default = router;
