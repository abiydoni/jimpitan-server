"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const duesController_1 = require("../controllers/duesController");
const saasMiddleware_1 = require("../middlewares/saasMiddleware");
const router = (0, express_1.Router)();
router.use(saasMiddleware_1.checkSubscription);
// /api/dues/:villageId
router.get('/:villageId', duesController_1.getDuesJournals);
// /api/dues
router.post('/', duesController_1.createDuesJournal);
// /api/dues/:id
router.delete('/:id', duesController_1.deleteDuesJournal);
// /api/dues/tariffs/:villageId
router.get('/tariffs/:villageId', duesController_1.getTariffs);
// /api/dues/tariffs
const duesController_2 = require("../controllers/duesController");
router.post('/tariffs', duesController_2.createTariff);
router.put('/tariffs/:id', duesController_2.updateTariff);
router.delete('/tariffs/:id', duesController_2.deleteTariff);
// /api/dues/exemptions/:villageId
router.get('/exemptions/:villageId', duesController_1.getExemptions);
// /api/dues/exemptions
const duesController_3 = require("../controllers/duesController");
router.post('/exemptions', duesController_3.createExemption);
router.put('/exemptions/:id', duesController_3.updateExemption);
router.delete('/exemptions/:id', duesController_3.deleteExemption);
// /api/dues/jimpitan/:villageId
router.get('/jimpitan/:villageId', duesController_1.getJimpitanHistory);
// /api/dues/jimpitan
const duesController_4 = require("../controllers/duesController");
router.post('/jimpitan', duesController_4.createJimpitanHistory);
router.delete('/jimpitan/:id', duesController_4.deleteJimpitanHistory);
exports.default = router;
