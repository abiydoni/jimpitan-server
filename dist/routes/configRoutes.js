"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const configController_1 = require("../controllers/configController");
const uploadController_1 = require("../controllers/uploadController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// GET /api/config/version — publik, tidak perlu auth
router.get('/version', configController_1.getAppVersion);
// PUT /api/config/version — perlu auth
router.put('/version', authMiddleware_1.verifyFirebaseToken, authMiddleware_1.requireSuperAdmin, configController_1.updateAppVersion);
// POST /api/config/upload-apk — upload file apk (perlu auth)
router.post('/upload-apk', authMiddleware_1.verifyFirebaseToken, authMiddleware_1.requireSuperAdmin, uploadController_1.uploadApk);
exports.default = router;
