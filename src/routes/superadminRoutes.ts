import { Router } from 'express';
import { getDashboardSummary, getVillages, updateVillageConfig, getSystemStatus, getChatContacts, updateFcmToken } from '../controllers/superadminController';

const router = Router();

// /api/superadmin/dashboard-summary
router.get('/dashboard-summary', getDashboardSummary);

// /api/superadmin/villages
router.get('/villages', getVillages);

// /api/superadmin/villages/:id/config
router.put('/villages/:id/config', updateVillageConfig);

// /api/superadmin/system-status
router.get('/system-status', getSystemStatus);

// /api/superadmin/chat-contacts
router.get('/chat-contacts', getChatContacts);

// /api/superadmin/fcm-token
router.post('/fcm-token', updateFcmToken);

export default router;
