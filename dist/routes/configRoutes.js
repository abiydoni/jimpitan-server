"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const configController_1 = require("../controllers/configController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// GET /api/config/version — publik, tidak perlu auth
router.get('/version', configController_1.getAppVersion);
// PUT /api/config/version — perlu auth
router.put('/version', authMiddleware_1.verifyFirebaseToken, authMiddleware_1.requireSuperAdmin, configController_1.updateAppVersion);
exports.default = router;
