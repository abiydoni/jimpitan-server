"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.optionalVerifyFirebaseToken);
// /api/chat/:villageId/users
router.get('/:villageId/users', chatController_1.getChatContacts);
// /api/chat/:villageId/messages/:targetUid?uid=...
router.get('/:villageId/messages/:targetUid', chatController_1.getMessages);
// /api/chat/:villageId/messages
router.post('/:villageId/messages', chatController_1.sendMessage);
// /api/chat/:villageId/messages/:messageId
router.put('/:villageId/messages/:messageId', chatController_1.updateMessage);
// /api/chat/:villageId/unread?uid=...
router.get('/:villageId/unread', chatController_1.getUnreadCounts);
// /api/chat/:villageId/mark-read
router.post('/:villageId/mark-read', chatController_1.markMessagesRead);
exports.default = router;
