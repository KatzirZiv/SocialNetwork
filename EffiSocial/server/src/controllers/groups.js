const Group = require('../models/Group');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Create group
// @route   POST /api/groups
// @access  Private
exports.createGroup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description } = req.body;

    // Create group
    const group = await Group.create({
      name,
      description,
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
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description } = req.body;
    const updateFields = {};

    if (name) updateFields.name = name;
    if (description) updateFields.description = description;

    let group = await Group.findById(req.params.id);

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
        message: 'Not authorized to update this group'
      });
    }

    group = await Group.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
      .populate('admin', 'username profilePicture')
      .populate('members', 'username profilePicture');

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

    // Remove group from all members' groups array
    await User.updateMany(
      { groups: req.params.id },
      { $pull: { groups: req.params.id } }
    );

    await group.remove();

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

// @desc    Join group
// @route   POST /api/groups/:id/join
// @access  Private
exports.joinGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if user is already a member
    if (group.members.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Already a member of this group'
      });
    }

    // Add user to group members
    group.members.push(req.user.id);
    await group.save();

    // Add group to user's groups
    await User.findByIdAndUpdate(req.user.id, {
      $push: { groups: group._id }
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