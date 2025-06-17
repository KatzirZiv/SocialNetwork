const User = require('../models/User');
const Post = require('../models/Post');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { validationResult } = require('express-validator');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('=== Multer Destination ===');
    console.log('Uploads directory:', uploadsDir);
    console.log('Directory exists:', fs.existsSync(uploadsDir));
    console.log('Directory permissions:', fs.statSync(uploadsDir).mode);
    console.log('File being saved:', file.originalname);
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${ext}`;
    console.log('=== Multer Filename ===');
    console.log('Generated filename:', filename);
    console.log('Full path will be:', path.join(uploadsDir, filename));
    cb(null, filename);
  }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  console.log('=== Multer File Filter ===');
  console.log('Processing file:', file.originalname);
  console.log('File mimetype:', file.mimetype);
  console.log('File size:', file.size);
  if (file.mimetype.startsWith('image/')) {
    console.log('File accepted:', file.originalname);
    cb(null, true);
  } else {
    console.log('File rejected:', file.originalname);
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
    console.log('=== Starting File Upload ===');
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    upload(req, res, (err) => {
      if (err) {
        console.error('=== Multer Error ===');
        console.error('Error:', err);
        reject(err);
      } else {
        console.log('=== Multer Success ===');
        console.log('Files:', req.file);
        if (req.file) {
          const filePath = path.join(uploadsDir, req.file.filename);
          console.log('File saved at:', filePath);
          console.log('File exists:', fs.existsSync(filePath));
          console.log('File size:', fs.statSync(filePath).size);
          console.log('File permissions:', fs.statSync(filePath).mode);
        }
        resolve();
      }
    });
  });
};

// Add middleware to handle multer errors
exports.handleMulterError = (err, req, res, next) => {
  console.error('Multer error middleware:', err);
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
  console.log('[USERS CONTROLLER] getUser HIT', req.originalUrl, req.params);
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
    console.log('=== Update User Request ===');
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    const userId = req.params.id;
    const { bio } = req.body;
    let updateData = { bio };

    // Handle file upload
    if (req.file) {
      console.log('Processing file upload:', req.file);
      // Store the full path to the file
      updateData.profilePicture = `/uploads/${req.file.filename}`;
    }

    console.log('Updating user with data:', updateData);

    // First check if user exists
    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found:', userId);
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

    console.log('User updated successfully:', updatedUser);
    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
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

    res.json({
      success: true,
      data: user.friends
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
    console.log('=== Search Users Controller ===');
    console.log('Request details:', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      headers: req.headers,
      params: req.params,
      user: req.user ? { id: req.user._id, username: req.user.username } : 'Not authenticated'
    });

    const { query } = req.query;
    if (!query) {
      console.log('No query provided');
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    console.log('Search query:', query);

    // Get current user ID from auth token if available
    const currentUserId = req.user?._id;
    console.log('Current user ID:', currentUserId);

    const searchQuery = {
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    };

    // Exclude current user from search results if logged in
    if (currentUserId) {
      searchQuery._id = { $ne: currentUserId };
      console.log('Excluding current user from search:', currentUserId);
    }

    console.log('MongoDB search query:', searchQuery);

    const users = await User.find(searchQuery)
      .select('-password')
      .limit(10);

    console.log('Search results:', {
      count: users.length,
      users: users.map(u => ({
        id: u._id,
        username: u.username,
        email: u.email
      }))
    });

    const response = {
      success: true,
      count: users.length,
      data: users
    };

    console.log('Sending response:', response);
    res.status(200).json(response);
  } catch (error) {
    console.error('=== Search Users Error ===');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
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
    const { id } = req.params;
    const fromUserId = req.user._id;

    console.log('Friend request received:', {
      targetUserId: id,
      fromUserId,
      body: req.body,
      headers: req.headers,
      user: req.user
    });

    // Check if user is trying to send request to themselves
    if (id === fromUserId.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot send friend request to yourself'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if users are already friends
    if (user.friends.includes(fromUserId)) {
      return res.status(400).json({
        success: false,
        error: 'Users are already friends'
      });
    }

    // Check if request already exists
    const existingRequest = user.friendRequests.find(
      request => request.from.toString() === fromUserId.toString() && request.status === 'pending'
    );

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        error: 'Friend request already sent'
      });
    }

    // Add friend request
    user.friendRequests.push({
      from: fromUserId,
      status: 'pending',
      isTemporary: false
    });

    await user.save();

    return res.json({
      success: true,
      data: user,
      message: 'Friend request sent successfully'
    });
  } catch (error) {
    console.error('Error in sendFriendRequest:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Accept friend request
// @route   PUT /api/users/:id/accept-friend
// @access  Private
exports.acceptFriendRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { requestId } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Find the friend request
    const friendRequest = user.friendRequests.id(requestId);
    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        error: 'Friend request not found'
      });
    }

    // Update request status
    friendRequest.status = 'accepted';

    // Add to friends list
    user.friends.push(friendRequest.from);
    
    // Add current user to friend's friends list
    const friend = await User.findById(friendRequest.from);
    if (friend) {
      friend.friends.push(user._id);
      await friend.save();
    }

    await user.save();

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

// @desc    Reject friend request
// @route   PUT /api/users/:id/reject-friend
// @access  Private
exports.rejectFriendRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { requestId } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Find the friend request
    const friendRequest = user.friendRequests.id(requestId);
    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        error: 'Friend request not found'
      });
    }

    // Update request status
    friendRequest.status = 'rejected';

    await user.save();

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

// @desc    Get friend requests
// @route   GET /api/users/friend-requests
// @access  Private
exports.getFriendRequests = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .populate('friendRequests.from', 'username profilePicture');

  res.status(200).json({
    success: true,
    data: user.friendRequests,
  });
});

// @desc    Get user's posts
// @route   GET /api/users/:id/posts
// @access  Private
exports.getUserPosts = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.id })
      .populate('author', 'username profilePicture')
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

// @desc    Cancel friend request
// @route   DELETE /api/users/:id/friend-request
// @access  Private
exports.cancelFriendRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const fromUserId = req.user._id;

    console.log('Cancel friend request received:', {
      targetUserId: id,
      fromUserId,
      body: req.body,
      headers: req.headers,
      user: req.user
    });

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Find and remove the friend request
    const requestIndex = user.friendRequests.findIndex(
      request => request.from.toString() === fromUserId.toString() && request.status === 'pending'
    );

    if (requestIndex === -1) {
      return res.status(400).json({
        success: false,
        error: 'No pending friend request found'
      });
    }

    user.friendRequests.splice(requestIndex, 1);
    await user.save();

    return res.json({
      success: true,
      data: user,
      message: 'Friend request cancelled successfully'
    });
  } catch (error) {
    console.error('Error in cancelFriendRequest:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}; 