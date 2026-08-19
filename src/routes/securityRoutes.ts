import { Router } from 'express';
import { backupDatabase, clearSystemCache, triggerGDriveBackup } from '../controllers/securityController';
import { verifyFirebaseToken, requireSuperAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Semua fitur keamanan dan backup hanya bisa diakses oleh SUPER_ADMIN
router.use(verifyFirebaseToken);
router.use(requireSuperAdmin);

router.get('/backup', backupDatabase);
router.get('/backup-gdrive', triggerGDriveBackup);
router.post('/clear-logs', clearSystemCache);

export default router;
