"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inventoryController_1 = require("../controllers/inventoryController");
const router = (0, express_1.Router)();
// /api/inventory/:villageId
router.get('/:villageId', inventoryController_1.getInventoryItems);
// /api/inventory
router.post('/', inventoryController_1.createInventoryItem);
// /api/inventory/:id
router.put('/:id', inventoryController_1.updateInventoryItem);
router.delete('/:id', inventoryController_1.deleteInventoryItem);
// /api/inventory/loan/:villageId
router.get('/loan/:villageId', inventoryController_1.getInventoryLoans);
// /api/inventory/loan
router.post('/loan', inventoryController_1.recordLoan);
// /api/inventory/loan/return/:loanId
router.post('/loan/return/:loanId', inventoryController_1.returnLoan);
// /api/inventory/loan/:loanId
router.delete('/loan/:loanId', inventoryController_1.cancelLoan);
exports.default = router;
