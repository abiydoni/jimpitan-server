import { Router } from 'express';
import { getSchedules, updateSchedule } from '../controllers/jadwalController';

const router = Router();

// /api/jadwal/:villageId
router.get('/:villageId', getSchedules);

// /api/jadwal/:villageId/:nik
router.post('/:villageId/:nik', updateSchedule);

export default router;
