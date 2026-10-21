import { Router } from 'express';
import { getAppVersion, updateAppVersion, verifyReviewerCredentials } from '../controllers/configController';
import { uploadApk } from '../controllers/uploadController';
import { verifyFirebaseToken, requireSuperAdmin } from '../middlewares/authMiddleware';

const router = Router();

// GET /api/config/version — publik, tidak perlu auth
router.get('/version', getAppVersion);

// POST /api/config/reviewer-verify — verifikasi kredensial penguji Play Store langsung ke tabel database
router.post('/reviewer-verify', verifyReviewerCredentials);

// PUT /api/config/version — perlu auth
router.put('/version', verifyFirebaseToken, requireSuperAdmin, updateAppVersion);

// POST /api/config/upload-apk — upload file apk (perlu auth)
router.post('/upload-apk', verifyFirebaseToken, requireSuperAdmin, uploadApk);

export default router;
