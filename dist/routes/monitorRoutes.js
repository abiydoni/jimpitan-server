"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const monitorController_1 = require("../controllers/monitorController");
const router = (0, express_1.Router)();
router.get('/stats', monitorController_1.getStats);
router.post('/action', monitorController_1.performAction);
exports.default = router;
