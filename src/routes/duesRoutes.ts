import { Router } from 'express';
import { getDuesJournals, createDuesJournal, deleteDuesJournal, getTariffs, getExemptions, getJimpitanHistory } from '../controllers/duesController';
import { checkSubscription } from '../middlewares/saasMiddleware';

const router = Router();
router.use(checkSubscription);

// /api/dues/:villageId
router.get('/:villageId', getDuesJournals);

// /api/dues
router.post('/', createDuesJournal);

// /api/dues/:id
router.delete('/:id', deleteDuesJournal);

// /api/dues/tariffs/:villageId
router.get('/tariffs/:villageId', getTariffs);

// /api/dues/tariffs
import { createTariff, updateTariff, deleteTariff } from '../controllers/duesController';
router.post('/tariffs', createTariff);
router.put('/tariffs/:id', updateTariff);
router.delete('/tariffs/:id', deleteTariff);

// /api/dues/exemptions/:villageId
router.get('/exemptions/:villageId', getExemptions);

// /api/dues/exemptions
import { createExemption, updateExemption, deleteExemption } from '../controllers/duesController';
router.post('/exemptions', createExemption);
router.put('/exemptions/:id', updateExemption);
router.delete('/exemptions/:id', deleteExemption);

// /api/dues/jimpitan/:villageId
router.get('/jimpitan/:villageId', getJimpitanHistory);

// /api/dues/jimpitan
import { createJimpitanHistory, deleteJimpitanHistory } from '../controllers/duesController';
router.post('/jimpitan', createJimpitanHistory);
router.delete('/jimpitan/:id', deleteJimpitanHistory);

export default router;
