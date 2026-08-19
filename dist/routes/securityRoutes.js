"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const securityController_1 = require("../controllers/securityController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Endpoint pengujian langsung via tab browser (Tanpa butuh header token)
router.get('/test-backup-now', securityController_1.triggerGDriveBackup);
// Semua fitur keamanan dan backup di bawah ini hanya bisa diakses oleh SUPER_ADMIN
router.use(authMiddleware_1.verifyFirebaseToken);
router.use(authMiddleware_1.requireSuperAdmin);
router.get('/backup', securityController_1.backupDatabase);
router.get('/backup-gdrive', securityController_1.triggerGDriveBackup);
router.post('/clear-logs', securityController_1.clearSystemCache);
exports.default = router;
