import { Router } from 'express';
import { getChatContacts, getMessages, sendMessage, updateMessage, getUnreadCounts, markMessagesRead } from '../controllers/chatController';
import { optionalVerifyFirebaseToken } from '../middlewares/authMiddleware';

const router = Router();

router.use(optionalVerifyFirebaseToken);

// /api/chat/:villageId/users
router.get('/:villageId/users', getChatContacts);

// /api/chat/:villageId/messages/:targetUid?uid=...
router.get('/:villageId/messages/:targetUid', getMessages);

// /api/chat/:villageId/messages
router.post('/:villageId/messages', sendMessage);

// /api/chat/:villageId/messages/:messageId
router.put('/:villageId/messages/:messageId', updateMessage);

// /api/chat/:villageId/unread?uid=...
router.get('/:villageId/unread', getUnreadCounts);

// /api/chat/:villageId/mark-read
router.post('/:villageId/mark-read', markMessagesRead);

export default router;
