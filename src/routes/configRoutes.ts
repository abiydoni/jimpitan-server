import { Router } from 'express';
import { getAppVersion, updateAppVersion } from '../controllers/configController';
import { verifyFirebaseToken, requireSuperAdmin } from '../middlewares/authMiddleware';

const router = Router();

// GET /api/config/version — publik, tidak perlu auth
router.get('/version', getAppVersion);

// PUT /api/config/version — perlu auth
router.put('/version', verifyFirebaseToken, requireSuperAdmin, updateAppVersion);

export default router;
