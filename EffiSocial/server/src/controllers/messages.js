const Message = require('../models/Message');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Send message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { receiver, content, media, mediaType } = req.body;

    // Check if receiver exists
    const receiverUser = await User.findById(receiver);
    if (!receiverUser) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    // Create message
    const message = await Message.create({
      sender: req.user.id,
      receiver,
      content,
      media,
      mediaType
    });

    // Populate sender and receiver details
    await message.populate('sender', 'username profilePicture');
    await message.populate('receiver', 'username profilePicture');

    // Emit message to receiver through Socket.IO
    req.app.get('io').to(receiver).emit('message:new', {
      ...message.toObject(),
      sender: message.sender,
      receiver: message.receiver
    });

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get conversation with user
// @route   GET /api/messages/:userId
// @access  Private
exports.getConversation = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user.id }
      ]
    })
      .populate('sender', 'username profilePicture')
      .populate('receiver', 'username profilePicture')
      .sort('createdAt');

    // Mark unread messages as read
    await Message.updateMany(
      {
        sender: req.params.userId,
        receiver: req.user.id,
        read: false
      },
      { read: true }
    );

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all conversations
// @route   GET /api/messages
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    // Get all unique users that the current user has conversations with
    const messages = await Message.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }]
    })
      .populate('sender', 'username profilePicture')
      .populate('receiver', 'username profilePicture')
      .sort('-createdAt');

    // Group messages by conversation
    const conversations = messages.reduce((acc, message) => {
      const otherUser =
        message.sender._id.toString() === req.user.id
          ? message.receiver
          : message.sender;

      if (!acc[otherUser._id]) {
        acc[otherUser._id] = {
          _id: otherUser._id, // for React key
          participants: [message.sender, message.receiver],
          lastMessage: message,
          unreadCount: 0
        };
      }

      if (
        message.receiver._id.toString() === req.user.id &&
        !message.read
      ) {
        acc[otherUser._id].unreadCount++;
      }

      return acc;
    }, {});

    res.status(200).json({
      success: true,
      count: Object.keys(conversations).length,
      data: Object.values(conversations)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete message
// @route   DELETE /api/messages/:id
// @access  Private
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Make sure user is message sender
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }

    await message.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
}; 