import { Router } from 'express';
import { getAppVersion } from '../controllers/configController';

const router = Router();

// GET /api/config/version — publik, tidak perlu auth
router.get('/version', getAppVersion);

export default router;
