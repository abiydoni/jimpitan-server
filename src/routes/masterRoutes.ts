import { Router } from 'express';
import { 
  getVillages, getVillageById, createVillage, updateVillage, deleteVillage, registerVillage,
  notifyVillageManual,
  getUsers, getUserById, updateUserStatus, deleteUserFamily, saveUserFamily, linkUserAccount,
  updateFcmToken, removeFcmToken, updateOnlineStatus, updateUserRoles,
  getMenus, updateMenu, deleteMenu,
  getSlides, createSlide, updateSlide, deleteSlide,
  bulkImportUsers, moveUserFamily, cleanupIncompleteUsers, deleteUser,
  getActivityLogs
} from '../controllers/masterController';
import { checkSubscription } from '../middlewares/saasMiddleware';

const router = Router();
router.use(checkSubscription);

// Activity Logs (Audit Trail)
router.get('/activity-logs', getActivityLogs);

// Villages
router.get('/villages', getVillages);
router.get('/villages/:id', getVillageById);
router.post('/villages/register', registerVillage);
router.post('/villages', createVillage);
router.post('/villages/:id/notify', notifyVillageManual);
router.put('/villages/:id', updateVillage);
router.delete('/villages/:id', deleteVillage);

// Users
router.get('/users', getUsers);
router.delete('/users/cleanup-incomplete', cleanupIncompleteUsers);
router.get('/users/:uid', getUserById);
router.put('/users/:uid', updateUserStatus);
router.delete('/users/:uid', deleteUser);
router.post('/users/family', saveUserFamily);
router.post('/users/link-account', linkUserAccount);
router.post('/users/bulk-import', bulkImportUsers);
router.delete('/users/family/:familyId', deleteUserFamily);
router.post('/users/:uid/move-family', moveUserFamily);
router.put('/users/:uid/fcm-token', updateFcmToken);
router.delete('/users/:uid/fcm-token', removeFcmToken);
router.put('/users/:uid/online-status', updateOnlineStatus);
router.put('/users/:uid/roles', updateUserRoles);

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
