const express = require('express');
const { check } = require('express-validator');
const {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  likePost,
  addComment,
  removeComment,
  updateComment
} = require('../controllers/posts');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(protect);

// Get all posts
router.get('/', getPosts);

// Get single post
router.get('/:id', getPost);

// Create post
router.post(
  '/',
  [
    check('content', 'Content is required').not().isEmpty(),
    check('content', 'Content cannot be more than 5000 characters').isLength({ max: 5000 }),
    check('group', 'Group is required').not().isEmpty(),
    check('mediaType', 'Media type must be image or video').optional().isIn(['image', 'video'])
  ],
  createPost
);

// Update post
router.put(
  '/:id',
  [
    check('content', 'Content cannot be more than 5000 characters').optional().isLength({ max: 5000 }),
    check('mediaType', 'Media type must be image or video').optional().isIn(['image', 'video'])
  ],
  updatePost
);

// Delete post
router.delete('/:id', deletePost);

// Like/Unlike post
router.put('/:id/like', likePost);

// Add comment
router.post(
  '/:id/comments',
  [
    check('content', 'Content is required').not().isEmpty(),
    check('content', 'Content cannot be more than 1000 characters').isLength({ max: 1000 })
  ],
  addComment
);

// Update comment
router.put(
  '/:id/comments/:comment_id',
  [
    check('content', 'Content cannot be more than 1000 characters').optional().isLength({ max: 1000 })
  ],
  updateComment
);

// Remove comment
router.delete('/:id/comments/:comment_id', removeComment);

module.exports = router; 