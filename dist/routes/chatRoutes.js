"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const router = (0, express_1.Router)();
// /api/chat/:villageId/users
router.get('/:villageId/users', chatController_1.getChatContacts);
// /api/chat/:villageId/messages/:targetUid?uid=...
router.get('/:villageId/messages/:targetUid', chatController_1.getMessages);
// /api/chat/:villageId/messages
router.post('/:villageId/messages', chatController_1.sendMessage);
// /api/chat/:villageId/messages/:messageId
router.put('/:villageId/messages/:messageId', chatController_1.updateMessage);
exports.default = router;
