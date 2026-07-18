"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboardController_1 = require("../controllers/dashboardController");
const router = (0, express_1.Router)();
// /api/dashboard/superadmin/summary (GLOBAL SYSTEM-WIDE)
router.get('/superadmin/summary', dashboardController_1.getSuperAdminSummary);
// /api/dashboard/:villageId/summary
router.get('/:villageId/summary', dashboardController_1.getDashboardSummary);
// /api/dashboard/:villageId/admin-summary (KHUSUS SUPER ADMIN)
router.get('/:villageId/admin-summary', dashboardController_1.getAdminSummary);
// /api/dashboard/:villageId/slides
router.get('/:villageId/slides', dashboardController_1.getSlides);
// /api/dashboard/:villageId/menus
router.get('/:villageId/menus', dashboardController_1.getMenus);
exports.default = router;
