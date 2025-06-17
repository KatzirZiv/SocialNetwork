const User = require('../models/User');
const { validationResult } = require('express-validator');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
  try {
    const user = await User.findById(req.params.id).select('-password');
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
// @access  Private
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const searchQuery = {
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    };

    const users = await User.find(searchQuery)
      .select('-password')
      .limit(10);

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Send friend request
// @route   POST /api/users/:id/friend-request
// @access  Private
exports.sendFriendRequest = asyncHandler(async (req, res, next) => {
  const targetUser = await User.findById(req.params.id);
  const currentUser = await User.findById(req.user.id);

  if (!targetUser) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  // Check if already friends
  if (currentUser.friends.includes(req.params.id)) {
    return next(new ErrorResponse('Users are already friends', 400));
  }

  // Check if request already exists
  const existingRequest = targetUser.friendRequests.find(
    (request) => request.from.toString() === req.user.id
  );

  if (existingRequest) {
    return next(new ErrorResponse('Friend request already sent', 400));
  }

  // Add friend request
  targetUser.friendRequests.push({
    from: req.user.id,
    status: 'pending',
  });

  await targetUser.save();

  res.status(200).json({
    success: true,
    data: targetUser.friendRequests,
  });
});

// @desc    Accept friend request
// @route   PUT /api/users/:id/accept-friend
// @access  Private
exports.acceptFriendRequest = asyncHandler(async (req, res, next) => {
  const currentUser = await User.findById(req.user.id);
  const requestUser = await User.findById(req.params.id);

  if (!requestUser) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  // Find the friend request
  const friendRequest = currentUser.friendRequests.find(
    (request) => request.from.toString() === req.params.id && request.status === 'pending'
  );

  if (!friendRequest) {
    return next(new ErrorResponse('No pending friend request found', 404));
  }

  // Update request status
  friendRequest.status = 'accepted';

  // Add to friends list for both users
  currentUser.friends.push(req.params.id);
  requestUser.friends.push(req.user.id);

  await currentUser.save();
  await requestUser.save();

  res.status(200).json({
    success: true,
    data: currentUser.friends,
  });
});

// @desc    Reject friend request
// @route   PUT /api/users/:id/reject-friend
// @access  Private
exports.rejectFriendRequest = asyncHandler(async (req, res, next) => {
  const currentUser = await User.findById(req.user.id);

  // Find the friend request
  const friendRequest = currentUser.friendRequests.find(
    (request) => request.from.toString() === req.params.id && request.status === 'pending'
  );

  if (!friendRequest) {
    return next(new ErrorResponse('No pending friend request found', 404));
  }

  // Update request status
  friendRequest.status = 'rejected';

  await currentUser.save();

  res.status(200).json({
    success: true,
    data: currentUser.friendRequests,
  });
});

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