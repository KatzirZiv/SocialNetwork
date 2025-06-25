const User = require('../models/User');
const Post = require('../models/Post');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { validationResult } = require('express-validator');
const FriendRequest = require('../models/FriendRequest');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}).single('profilePicture');

// Wrap multer in a promise
exports.uploadMiddleware = (req, res) => {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Add middleware to handle multer errors
exports.handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return next(new ErrorResponse(err.message, 400));
  }
  next(err);
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate({
        path: 'friends',
        select: 'username profilePicture _id'
      })
      .populate({
        path: 'friendRequests.from',
        select: 'username profilePicture _id'
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { bio } = req.body;
    let updateData = { bio };

    // Handle file upload
    if (req.file) {
      updateData.profilePicture = `/uploads/${req.file.filename}`;
    }

    // First check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // If there's a new profile picture, delete the old one
    if (req.file && user.profilePicture && user.profilePicture !== 'default-profile.png') {
      const oldFilePath = path.join(__dirname, '../../', user.profilePicture);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete profile picture if it exists
    if (user.profilePicture && user.profilePicture !== 'default-profile.png') {
      const filePath = path.join(__dirname, '../../', user.profilePicture);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await user.deleteOne();
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get user's friends
// @route   GET /api/users/:id/friends
// @access  Private
exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('friends', 'username profilePicture');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Filter out any null/invalid friends (in case of dangling ObjectIds)
    const validFriends = (user.friends || []).filter(f => f && f._id && f.username);

    res.json({
      success: true,
      data: validFriends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Add friend
// @route   POST /api/users/:id/friends/:friendId
// @access  Private
exports.addFriend = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const friend = await User.findById(req.params.friendId);

    if (!user || !friend) {
      return res.status(404).json({
        success: false,
        error: 'User or friend not found'
      });
    }

    if (user.friends.includes(req.params.friendId)) {
      return res.status(400).json({
        success: false,
        error: 'Already friends'
      });
    }

    user.friends.push(req.params.friendId);
    friend.friends.push(req.params.id);

    await user.save();
    await friend.save();

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Remove friend
// @route   DELETE /api/users/:id/friends/:friendId
// @access  Private
exports.removeFriend = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const friend = await User.findById(req.params.friendId);

    if (!user || !friend) {
      return res.status(404).json({
        success: false,
        error: 'User or friend not found'
      });
    }

    user.friends = user.friends.filter(
      friendId => friendId.toString() !== req.params.friendId
    );
    friend.friends = friend.friends.filter(
      friendId => friendId.toString() !== req.params.id
    );

    await user.save();
    await friend.save();

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Search users
// @route   GET /api/users/search
// @access  Public
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    // Get current user ID from auth token if available
    const currentUserId = req.user?._id?.toString();

    const searchQuery = {
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    };

    // Exclude current user from search results if logged in
    if (currentUserId) {
      searchQuery._id = { $ne: currentUserId };
    }

    const users = await User.find(searchQuery)
      .select('-password')
      .limit(10)
      .lean();

    // If not logged in, just return users
    if (!currentUserId) {
      return res.status(200).json({
        success: true,
        count: users.length,
        data: users
      });
    }

    // Get current user's friends
    const currentUser = await User.findById(currentUserId).select('friends');
    const friendsSet = new Set((currentUser?.friends || []).map(id => id.toString()));

    // Get all friend requests involving the current user
    const friendRequests = await require('../models/FriendRequest').find({
      $or: [
        { sender: currentUserId },
        { receiver: currentUserId }
      ],
      status: 'pending'
    });

    // Map for quick lookup
    const outgoingMap = new Map();
    const incomingMap = new Map();
    friendRequests.forEach(req => {
      if (req.sender.toString() === currentUserId) {
        outgoingMap.set(req.receiver.toString(), req._id.toString());
      } else if (req.receiver.toString() === currentUserId) {
        incomingMap.set(req.sender.toString(), req._id.toString());
      }
    });

    // Attach friendship/request info to each user
    const usersWithStatus = users.map(u => {
      const id = u._id.toString();
      return {
        ...u,
        isFriend: friendsSet.has(id),
        outgoingFriendRequestId: outgoingMap.get(id) || null,
        incomingFriendRequestId: incomingMap.get(id) || null
      };
    });

    res.status(200).json({
      success: true,
      count: usersWithStatus.length,
      data: usersWithStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Send friend request
// @route   POST /api/users/:id/friend-request
// @access  Private
exports.sendFriendRequest = async (req, res) => {
  try {
    const { id } = req.params; // recipient user id
    const fromUserId = req.user._id;

    if (fromUserId.toString() === id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot send a friend request to yourself.'
      });
    }

    // Check if users are already friends (optional, if you have a friends array)
    // ...

    // Check if a pending request already exists
    const existingRequest = await FriendRequest.findOne({
      sender: fromUserId,
      receiver: id,
      status: 'pending'
    });
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        error: 'Friend request already sent'
      });
    }

    // Create new friend request
    const friendRequest = await FriendRequest.create({
      sender: fromUserId,
      receiver: id,
      status: 'pending'
    });

    return res.json({
      success: true,
      data: friendRequest,
      message: 'Friend request sent successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get incoming friend requests
// @route   GET /api/users/friend-requests
// @access  Private
exports.getFriendRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({ receiver: req.user._id, status: 'pending' })
      .populate('sender', 'username profilePicture');
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get outgoing friend requests
// @route   GET /api/users/outgoing-friend-requests
// @access  Private
exports.getOutgoingFriendRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({ sender: req.user._id, status: 'pending' })
      .populate({
        path: 'receiver',
        select: 'username profilePicture',
        options: { strictPopulate: false }
      });
    // Filter out requests with missing receiver
    const validRequests = requests.filter(r => r.receiver && r.receiver.username);
    res.status(200).json({ success: true, data: validRequests });
  } catch (error) {
    console.error('getOutgoingFriendRequests error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Cancel friend request
// @route   DELETE /api/users/friend-request/:requestId
// @access  Private
exports.cancelFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    if (request.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    await request.deleteOne();
    res.json({ success: true, message: 'Friend request cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Accept friend request
// @route   PUT /api/users/friend-request/:requestId/accept
// @access  Private
exports.acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    if (request.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    // Prevent self-friendship
    if (request.sender.toString() === request.receiver.toString()) {
      return res.status(400).json({ success: false, error: 'Cannot friend yourself.' });
    }
    request.status = 'accepted';
    await request.save();
    // Add each user to the other's friends array
    const sender = await User.findById(request.sender);
    const receiver = await User.findById(request.receiver);
    if (sender && !sender.friends.map(id => id.toString()).includes(receiver._id.toString())) {
      sender.friends.push(receiver._id);
      await sender.save();
    }
    if (receiver && !receiver.friends.map(id => id.toString()).includes(sender._id.toString())) {
      receiver.friends.push(sender._id);
      await receiver.save();
    }
    res.json({ success: true, message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Reject friend request
// @route   PUT /api/users/friend-request/:requestId/reject
// @access  Private
exports.rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    if (request.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    request.status = 'rejected';
    await request.save();
    res.json({ success: true, message: 'Friend request rejected' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get user's posts
// @route   GET /api/users/:id/posts
// @access  Private
exports.getUserPosts = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.id })
      .populate('author', 'username profilePicture')
      .populate('group', 'name')
      .populate('likes', 'username')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username profilePicture'
        }
      })
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get number of new users per month (last 12 months)
// @route   GET /api/users/stats/new-per-month
// @access  Public/Admin
exports.getNewUsersPerMonth = async (req, res) => {
  try {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' })
      });
    }
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const users = await User.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 }
        }
      }
    ]);
    const data = months.map(m => {
      const found = users.find(u => u._id.year === m.year && u._id.month === m.month);
      return { ...m, count: found ? found.count : 0 };
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}; 