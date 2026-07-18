"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roleController_1 = require("../controllers/roleController");
const router = (0, express_1.Router)();
router.get('/:villageId', roleController_1.getRoles);
router.post('/:villageId', roleController_1.saveRoles);
exports.default = router;
