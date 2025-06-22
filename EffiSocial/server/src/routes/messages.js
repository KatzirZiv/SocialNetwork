const express = require('express');
const { check } = require('express-validator');
const {
  sendMessage,
  getConversation,
  getConversations,
  deleteMessage
} = require('../controllers/messages');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get all conversations
router.get('/', getConversations);

// Get conversation with user
router.get('/:userId', getConversation);

// Send message
router.post(
  '/',
  [
    check('receiver', 'Receiver is required').not().isEmpty(),
    check('content', 'Content is required').not().isEmpty(),
    check('content', 'Content cannot be more than 1000 characters').isLength({ max: 1000 }),
    check('mediaType', 'Media type must be image or video').optional().isIn(['image', 'video'])
  ],
  sendMessage
);

// Delete message
router.delete('/:id', deleteMessage);

module.exports = router; 