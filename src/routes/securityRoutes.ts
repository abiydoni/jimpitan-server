import { Router } from 'express';
import { backupDatabase, clearSystemCache, triggerGDriveBackup } from '../controllers/securityController';
import { verifyFirebaseToken, requireSuperAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Endpoint pengujian langsung via tab browser (Tanpa butuh header token)
router.get('/test-backup-now', triggerGDriveBackup);

// Semua fitur keamanan dan backup di bawah ini hanya bisa diakses oleh SUPER_ADMIN
router.use(verifyFirebaseToken);
router.use(requireSuperAdmin);

router.get('/backup', backupDatabase);
router.get('/backup-gdrive', triggerGDriveBackup);
router.post('/clear-logs', clearSystemCache);

export default router;
