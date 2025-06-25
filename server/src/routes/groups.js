const express = require('express');
const { check } = require('express-validator');
const {
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  searchGroups,
  inviteMember,
  removeMember,
  addMember,
  transferAdmin,
  topGroupsByActivity
} = require('../controllers/groups');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Search groups
router.get('/search', searchGroups);

// Get all groups
router.get('/', getGroups);

// Get single group
router.get('/:id', getGroup);

// Create group
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('name', 'Name must be between 3 and 50 characters').isLength({ min: 3, max: 50 }),
    check('description', 'Description cannot be more than 500 characters').optional().isLength({ max: 500 })
  ],
  createGroup
);

// Update group
router.put(
  '/:id',
  [
    check('name', 'Name must be between 3 and 50 characters').optional().isLength({ min: 3, max: 50 }),
    check('description', 'Description cannot be more than 500 characters').optional().isLength({ max: 500 })
  ],
  updateGroup
);

// Delete group
router.delete('/:id', deleteGroup);

// Join group
router.post('/:id/join', joinGroup);

// Leave group
router.post('/:id/leave', leaveGroup);

// Invite member
router.post('/:id/invite', inviteMember);

// Remove member (admin only)
router.post('/:id/remove-member', removeMember);

// Add member (admin only)
router.post('/:id/add-member', addMember);

// Transfer admin
router.post('/:id/transfer-admin', transferAdmin);

// סטטיסטיקת קבוצות פעילות
router.get('/stats/top-groups', topGroupsByActivity);

module.exports = router; 