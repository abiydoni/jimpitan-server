import { Router } from 'express';
import {
  registerUser,
  syncUser,
  updateProfile,
  checkVillageCode,
  getUsersByVillage,
  loginSync,
  claimAccount,
} from '../controllers/authController';
import {
  verifyFirebaseToken,
  requireSelf,
  requireSelfOrSuperAdmin,
} from '../middlewares/authMiddleware';

const router = Router();

router.use(verifyFirebaseToken);

router.post('/register', requireSelf('uid'), registerUser);
router.get('/sync/:uid', requireSelf('uid'), syncUser);
router.post('/login-sync', requireSelf('uid'), loginSync);
router.post('/claim-account', requireSelf('uid'), claimAccount);
router.put('/profile/:uid', requireSelf('uid'), updateProfile);
router.get('/village/:code', checkVillageCode);
router.get('/users/:villageId', requireSelfOrSuperAdmin('uid'), getUsersByVillage);

export default router;
