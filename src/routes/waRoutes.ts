import { Router } from 'express';
import { 
  getRecipients, 
  getSettings, 
  updateSettings, 
  testSend, 
  sendBlast, 
  getBlastHistory, 
  deleteBlastHistory 
} from '../controllers/waController';
import { verifyFirebaseToken, optionalVerifyFirebaseToken } from '../middlewares/authMiddleware';

const router = Router();

// Daftar Penerima KK
router.get('/recipients', optionalVerifyFirebaseToken, getRecipients);

// Konfigurasi Gateway & Template
router.get('/settings', optionalVerifyFirebaseToken, getSettings);
router.put('/settings', verifyFirebaseToken, updateSettings);

// Uji coba kirim pesan
router.post('/test', verifyFirebaseToken, testSend);

// Eksekusi Blasting Massal
router.post('/blast', verifyFirebaseToken, sendBlast);

// Riwayat Pengiriman
router.get('/history', optionalVerifyFirebaseToken, getBlastHistory);
router.delete('/history/:id', verifyFirebaseToken, deleteBlastHistory);

export default router;
