"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const configController_1 = require("../controllers/configController");
const router = (0, express_1.Router)();
// GET /api/config/version — publik, tidak perlu auth
router.get('/version', configController_1.getAppVersion);
exports.default = router;
