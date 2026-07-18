import { Router } from 'express';
import { getDashboardSummary, getSlides, getMenus, getAdminSummary, getSuperAdminSummary } from '../controllers/dashboardController';

const router = Router();

// /api/dashboard/superadmin/summary (GLOBAL SYSTEM-WIDE)
router.get('/superadmin/summary', getSuperAdminSummary);

// /api/dashboard/:villageId/summary
router.get('/:villageId/summary', getDashboardSummary);

// /api/dashboard/:villageId/admin-summary (KHUSUS SUPER ADMIN)
router.get('/:villageId/admin-summary', getAdminSummary);

// /api/dashboard/:villageId/slides
router.get('/:villageId/slides', getSlides);

// /api/dashboard/:villageId/menus
router.get('/:villageId/menus', getMenus);

export default router;
