import { Router } from 'express';
import { 
  getInventoryItems, 
  createInventoryItem, 
  updateInventoryItem, 
  deleteInventoryItem, 
  getInventoryLoans,
  recordLoan, 
  returnLoan,
  cancelLoan
} from '../controllers/inventoryController';

const router = Router();

// /api/inventory/:villageId
router.get('/:villageId', getInventoryItems);

// /api/inventory
router.post('/', createInventoryItem);

// /api/inventory/:id
router.put('/:id', updateInventoryItem);
router.delete('/:id', deleteInventoryItem);

// /api/inventory/loan/:villageId
router.get('/loan/:villageId', getInventoryLoans);

// /api/inventory/loan
router.post('/loan', recordLoan);

// /api/inventory/loan/return/:loanId
router.post('/loan/return/:loanId', returnLoan);

// /api/inventory/loan/:loanId
router.delete('/loan/:loanId', cancelLoan);

export default router;
