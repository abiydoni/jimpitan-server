"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jadwalController_1 = require("../controllers/jadwalController");
const router = (0, express_1.Router)();
// /api/jadwal/:villageId
router.get('/:villageId', jadwalController_1.getSchedules);
// /api/jadwal/:villageId/:nik
router.post('/:villageId/:nik', jadwalController_1.updateSchedule);
exports.default = router;
