import { Router } from 'express';
import { getStats, performAction } from '../controllers/monitorController';

const router = Router();

router.get('/stats', getStats);
router.post('/action', performAction);

export default router;
