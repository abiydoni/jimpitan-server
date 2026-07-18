import { Router } from 'express';
import { 
  getVillages, getVillageById, createVillage, updateVillage, deleteVillage, registerVillage,
  getUsers, getUserById, updateUserStatus, deleteUserFamily, saveUserFamily,
  updateFcmToken, removeFcmToken, updateOnlineStatus,
  getMenus, updateMenu, deleteMenu,
  getSlides, createSlide, updateSlide, deleteSlide,
  bulkImportUsers
} from '../controllers/masterController';
import { checkSubscription } from '../middlewares/saasMiddleware';

const router = Router();
router.use(checkSubscription);

// Villages
router.get('/villages', getVillages);
router.get('/villages/:id', getVillageById);
router.post('/villages/register', registerVillage);
router.post('/villages', createVillage);
router.put('/villages/:id', updateVillage);
router.delete('/villages/:id', deleteVillage);

// Users
router.get('/users', getUsers);
router.get('/users/:uid', getUserById);
router.put('/users/:uid', updateUserStatus);
router.post('/users/family', saveUserFamily);
router.post('/users/bulk-import', bulkImportUsers);
router.delete('/users/family/:familyId', deleteUserFamily);
router.put('/users/:uid/fcm-token', updateFcmToken);
router.delete('/users/:uid/fcm-token', removeFcmToken);
router.put('/users/:uid/online-status', updateOnlineStatus);

// Menus
router.get('/menus', getMenus);
router.put('/menus/:id', updateMenu);
router.delete('/menus/:id', deleteMenu);

// Slides
router.get('/slides', getSlides);
router.post('/slides', createSlide);
router.put('/slides/:id', updateSlide);
router.delete('/slides/:id', deleteSlide);

export default router;
