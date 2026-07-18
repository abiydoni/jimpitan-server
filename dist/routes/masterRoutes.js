"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const masterController_1 = require("../controllers/masterController");
const saasMiddleware_1 = require("../middlewares/saasMiddleware");
const router = (0, express_1.Router)();
router.use(saasMiddleware_1.checkSubscription);
// Villages
router.get('/villages', masterController_1.getVillages);
router.get('/villages/:id', masterController_1.getVillageById);
router.post('/villages/register', masterController_1.registerVillage);
router.post('/villages', masterController_1.createVillage);
router.put('/villages/:id', masterController_1.updateVillage);
router.delete('/villages/:id', masterController_1.deleteVillage);
// Users
router.get('/users', masterController_1.getUsers);
router.get('/users/:uid', masterController_1.getUserById);
router.put('/users/:uid', masterController_1.updateUserStatus);
router.post('/users/family', masterController_1.saveUserFamily);
router.post('/users/bulk-import', masterController_1.bulkImportUsers);
router.delete('/users/family/:familyId', masterController_1.deleteUserFamily);
router.put('/users/:uid/fcm-token', masterController_1.updateFcmToken);
router.delete('/users/:uid/fcm-token', masterController_1.removeFcmToken);
// Menus
router.get('/menus', masterController_1.getMenus);
router.put('/menus/:id', masterController_1.updateMenu);
router.delete('/menus/:id', masterController_1.deleteMenu);
// Slides
router.get('/slides', masterController_1.getSlides);
router.post('/slides', masterController_1.createSlide);
router.put('/slides/:id', masterController_1.updateSlide);
router.delete('/slides/:id', masterController_1.deleteSlide);
exports.default = router;
