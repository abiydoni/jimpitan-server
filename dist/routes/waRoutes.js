"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const waController_1 = require("../controllers/waController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Daftar Penerima KK
router.get('/recipients', authMiddleware_1.optionalVerifyFirebaseToken, waController_1.getRecipients);
// Konfigurasi Gateway & Template
router.get('/settings', authMiddleware_1.optionalVerifyFirebaseToken, waController_1.getSettings);
router.put('/settings', authMiddleware_1.verifyFirebaseToken, waController_1.updateSettings);
// Uji coba kirim pesan
router.post('/test', authMiddleware_1.verifyFirebaseToken, waController_1.testSend);
// Eksekusi Blasting Massal
router.post('/blast', authMiddleware_1.verifyFirebaseToken, waController_1.sendBlast);
// Riwayat Pengiriman
router.get('/history', authMiddleware_1.optionalVerifyFirebaseToken, waController_1.getBlastHistory);
router.delete('/history/:id', authMiddleware_1.verifyFirebaseToken, waController_1.deleteBlastHistory);
exports.default = router;
