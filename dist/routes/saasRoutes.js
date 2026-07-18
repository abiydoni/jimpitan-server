"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const saasController_1 = require("../controllers/saasController");
const router = (0, express_1.Router)();
// ==========================================
// RUTE SUPERADMIN (Manajemen SaaS)
// ==========================================
// Plans
router.get('/plans', saasController_1.getPlans);
router.post('/plans', saasController_1.createPlan);
router.put('/plans/:id', saasController_1.updatePlan);
router.delete('/plans/:id', saasController_1.deletePlan);
// Subscriptions
router.get('/subscriptions', saasController_1.getVillageSubscriptions);
router.post('/subscriptions/assign', saasController_1.assignSubscription);
// Invoices
router.get('/invoices', saasController_1.getAllInvoices);
router.post('/invoices/:id/approve', saasController_1.approvePayment);
// ==========================================
// RUTE PUBLIK / PENGGUNA (Untuk Warga / RT)
// ==========================================
// Get invoice untuk desa spesifik
router.get('/village/:villageId/invoices', saasController_1.getVillageInvoice);
exports.default = router;
