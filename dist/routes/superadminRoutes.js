"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const superadminController_1 = require("../controllers/superadminController");
const router = (0, express_1.Router)();
// /api/superadmin/dashboard-summary
router.get('/dashboard-summary', superadminController_1.getDashboardSummary);
// /api/superadmin/villages
router.get('/villages', superadminController_1.getVillages);
// /api/superadmin/villages/:id/config
router.put('/villages/:id/config', superadminController_1.updateVillageConfig);
// /api/superadmin/system-status
router.get('/system-status', superadminController_1.getSystemStatus);
// /api/superadmin/chat-contacts
router.get('/chat-contacts', superadminController_1.getChatContacts);
// /api/superadmin/fcm-token
router.post('/fcm-token', superadminController_1.updateFcmToken);
exports.default = router;
