"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
// /api/auth/register
router.post('/register', authController_1.registerUser);
// /api/auth/sync/:uid
router.get('/sync/:uid', authController_1.syncUser);
// /api/auth/login-sync
router.post('/login-sync', authController_1.loginSync);
// /api/auth/claim-account
router.post('/claim-account', authController_1.claimAccount);
// /api/auth/profile/:uid
router.put('/profile/:uid', authController_1.updateProfile);
// /api/auth/village/:code
router.get('/village/:code', authController_1.checkVillageCode);
// /api/auth/users/:villageId
router.get('/users/:villageId', authController_1.getUsersByVillage);
exports.default = router;
