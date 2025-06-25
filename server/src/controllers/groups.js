const Group = require('../models/Group');
const User = require('../models/User');
const GroupJoinRequest = require('../models/GroupJoinRequest');
const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const Post = require('../models/Post');

// Configure multer for cover image uploads
const coverStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/'));
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const coverUpload = multer({
  storage: coverStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  },
}).single('coverImage');

// @desc    Create group
// @route   POST /api/groups
// @access  Private
exports.createGroup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, privacy } = req.body;

    // Create group
    const group = await Group.create({
      name,
      description,
      privacy: privacy || 'public',
      admin: req.user.id,
      members: [req.user.id]
    });

    // Add group to user's groups
    await User.findByIdAndUpdate(req.user.id, {
      $push: { groups: group._id }
    });

    res.status(201).json({
      success: true,
      data: group
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all groups
// @route   GET /api/groups
// @access  Private
exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate('admin', 'username profilePicture')
      .populate('members', 'username profilePicture');

    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single group
// @route   GET /api/groups/:id
// @access  Private
exports.getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('admin', 'username profilePicture')
      .populate('members', 'username profilePicture')
      .populate({
        path: 'posts',
        populate: {
          path: 'author',
          select: 'username profilePicture'
        }
      });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update group
// @route   PUT /api/groups/:id
// @access  Private
exports.updateGroup = async (req, res) => {
  coverUpload(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { name, description, privacy } = req.body;
      const updateFields = {};
      if (name) updateFields.name = name;
      if (description) updateFields.description = description;
      if (privacy) updateFields.privacy = privacy;
      if (req.file) {
        updateFields.coverImage = `/uploads/${req.file.filename}`;
      }
      let group = await Group.findById(req.params.id);
      if (!group) {
        return res.status(404).json({ success: false, message: 'Group not found' });
      }
      // Make sure user is group admin
      if (group.admin.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to update this group' });
      }
      group = await Group.findByIdAndUpdate(
        req.params.id,
        { $set: updateFields },
        { new: true, runValidators: true }
      )
        .populate('admin', 'username profilePicture')
        .populate('members', 'username profilePicture');
      res.status(200).json({ success: true, data: group });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });
};

// @desc    Delete group
// @route   DELETE /api/groups/:id
// @access  Private
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Make sure user is group admin
    if (group.admin.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this group'
      });
    }

    // Delete all posts associated with the group
    await Post.deleteMany({ _id: { $in: group.posts } });

    // Remove group from all members' groups array
    await User.updateMany(
      { groups: req.params.id },
      { $pull: { groups: req.params.id } }
    );

    // Actually delete the group
    await Group.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Join group
// @route   POST /api/groups/:id/join
// @access  Private
exports.joinGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    // Check if user is already a member
    if (group.members.includes(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Already a member of this group' });
    }
    // For private groups, create a join request
    if (group.privacy === 'private') {
      const existingRequest = await GroupJoinRequest.findOne({ group: group._id, user: req.user._id, status: 'pending' });
      if (existingRequest) {
        return res.status(400).json({ success: false, message: 'Join request already sent' });
      }
      await GroupJoinRequest.create({
        group: group._id,
        user: req.user._id,
        receiver: group.admin,
        status: 'pending'
      });
      return res.status(200).json({ success: true, message: 'Join request sent. Waiting for admin approval.' });
    }
    // Public group: add user to members
    group.members.push(req.user.id);
    await group.save();
    await User.findByIdAndUpdate(req.user.id, { $push: { groups: group._id } });
    res.status(200).json({ success: true, data: group });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Leave group
// @route   POST /api/groups/:id/leave
// @access  Private
exports.leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is a member
    if (!group.members.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Not a member of this group'
      });
    }

    // Check if user is admin
    if (group.admin.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Admin cannot leave the group. Transfer admin rights or delete the group.'
      });
    }

    // Remove user from group members
    group.members = group.members.filter(
      member => member.toString() !== req.user.id
    );
    await group.save();

    // Remove group from user's groups
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { groups: group._id }
    });

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Search groups
// @route   GET /api/groups/search
// @access  Private
exports.searchGroups = async (req, res) => {
  try {
    const { query } = req.query;
    const searchQuery = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    };

    const groups = await Group.find(searchQuery)
      .populate('admin', 'username profilePicture')
      .populate('members', 'username profilePicture')
      .limit(10);

    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Invite member to group
// @route   POST /api/groups/:id/invite
// @access  Private
exports.inviteMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);
    const user = await User.findById(userId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already a member
    if (group.members.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this group'
      });
    }

    // Check if user is the admin
    if (group.admin.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'User is already the admin of this group'
      });
    }

    // Add user to group members
    group.members.push(userId);
    await group.save();

    // Add group to user's groups
    user.groups.push(group._id);
    await user.save();

    res.status(200).json({
      success: true,
      data: group
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Remove member from group
// @route   POST /api/groups/:id/remove-member
// @access  Private (Admin only)
exports.removeMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    const { userId } = req.body;
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    // Only admin can remove
    if (group.admin.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    // Prevent admin from removing themselves
    if (userId === group.admin.toString()) {
      return res.status(400).json({ success: false, message: 'Admin cannot remove themselves' });
    }
    // Remove member
    await group.removeMember(userId);
    // Remove group from user's groups
    await User.findByIdAndUpdate(userId, { $pull: { groups: group._id } });
    res.status(200).json({ success: true, data: group });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Add member to group (admin only)
// @route   POST /api/groups/:id/add-member
// @access  Private (Admin only)
exports.addMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    const { userId } = req.body;
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    // Only admin can add
    if (group.admin.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    // Prevent admin from adding themselves (already a member)
    if (userId === group.admin.toString()) {
      return res.status(400).json({ success: false, message: 'Admin is already a member' });
    }
    // Add member
    await group.addMember(userId);
    // Add group to user's groups
    await User.findByIdAndUpdate(userId, { $addToSet: { groups: group._id } });
    res.status(200).json({ success: true, data: group });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Transfer group admin
// @route   POST /api/groups/:id/transfer-admin
// @access  Private (admin only)
exports.transferAdmin = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    // Only current admin can transfer
    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the current admin can transfer admin rights.' });
    }
    const { newAdminId } = req.body;
    if (!newAdminId) {
      return res.status(400).json({ success: false, message: 'New admin ID is required.' });
    }
    // New admin must be a member
    if (!group.members.map(m => m.toString()).includes(newAdminId)) {
      return res.status(400).json({ success: false, message: 'Selected user is not a member of the group.' });
    }
    group.admin = newAdminId;
    await group.save();
    const updatedGroup = await Group.findById(group._id)
      .populate('admin', 'username profilePicture')
      .populate('members', 'username profilePicture');
    res.status(200).json({ success: true, data: updatedGroup });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get top groups by activity (number of posts)
// @route   GET /api/groups/stats/top-groups
// @access  Private/Admin
exports.topGroupsByActivity = async (req, res) => {
  try {
    const topGroups = await Group.aggregate([
      {
        $project: {
          name: 1,
          postCount: { $size: { $ifNull: ["$posts", []] } },
          coverImage: 1
        }
      },
      { $sort: { postCount: -1 } },
      { $limit: 7 }
    ]);
    res.json({ success: true, data: topGroups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get join requests for a group (admin only)
// @route   GET /api/groups/:id/join-requests
// @access  Private (admin only)
exports.getJoinRequests = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    if (group.admin.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const requests = await GroupJoinRequest.find({ group: group._id, status: 'pending' })
      .populate('user', 'username profilePicture');
    res.status(200).json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Accept a join request (admin only)
// @route   POST /api/groups/:id/join-requests/:requestId/accept
// @access  Private (admin only)
exports.acceptJoinRequest = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    if (group.admin.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const request = await GroupJoinRequest.findById(req.params.requestId);
    if (!request || request.group.toString() !== group._id.toString() || request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'No such join request' });
    }
    // Add to members
    group.members.push(request.user);
    await group.save();
    await User.findByIdAndUpdate(request.user, { $push: { groups: group._id } });
    request.status = 'accepted';
    await request.save();
    res.status(200).json({ success: true, message: 'User added to group' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Decline a join request (admin only)
// @route   POST /api/groups/:id/join-requests/:requestId/decline
// @access  Private (admin only)
exports.declineJoinRequest = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    if (group.admin.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const request = await GroupJoinRequest.findById(req.params.requestId);
    if (!request || request.group.toString() !== group._id.toString() || request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'No such join request' });
    }
    request.status = 'rejected';
    await request.save();
    res.status(200).json({ success: true, message: 'Join request declined' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Cancel join request
// @route   DELETE /api/groups/:id/join-request
// @access  Private
exports.cancelJoinRequest = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    // Find and delete the pending join request for this user and group
    const request = await GroupJoinRequest.findOneAndDelete({ group: group._id, user: req.user._id, status: 'pending' });
    if (!request) {
      return res.status(404).json({ success: false, message: 'No pending join request found' });
    }
    return res.status(200).json({ success: true, message: 'Join request cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get current user's join request for a group
// @route   GET /api/groups/:id/my-join-request
// @access  Private
exports.getMyJoinRequest = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    const request = await GroupJoinRequest.findOne({ group: group._id, user: req.user._id });
    // Backend check: if request is accepted but user is not a member, treat as no active join request
    if (request && request.status === 'accepted' && !group.members.map(m => m.toString()).includes(req.user._id.toString())) {
      return res.status(200).json({ success: true, data: null });
    }
    if (!request) {
      return res.status(200).json({ success: true, data: null });
    }
    return res.status(200).json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}; 