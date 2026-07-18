import { Router } from 'express';
import { getRoles, saveRoles } from '../controllers/roleController';

const router = Router();

router.get('/:villageId', getRoles);
router.post('/:villageId', saveRoles);

export default router;
