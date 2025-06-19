const Post = require("../models/Post");
const Group = require("../models/Group");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const asyncHandler = require("../middleware/async");
const ErrorResponse = require("../utils/errorResponse");
const multer = require("multer");
const path = require("path");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../../uploads/"));
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  },
}).single("media");

// @desc    Create new post
// @route   POST /api/posts
// @access  Private
exports.createPost = asyncHandler(async (req, res, next) => {
  console.log("--- Create Post Request ---");
  console.log("User:", req.user);
  console.log("Body before upload:", req.body);
  upload(req, res, async function (err) {
    if (err) {
      console.error("Multer error:", err);
      return next(new ErrorResponse(err.message, 400));
    }

    console.log("Body after upload:", req.body);
    if (req.file) {
      console.log("File uploaded:", req.file);
    }

    req.body.author = req.user.id;
    if (req.file) {
      req.body.media = `/uploads/${req.file.filename}`;
    }

    try {
      const post = await Post.create(req.body);
      await post.populate("author", "username profilePicture");
      console.log("Post created:", post);
      res.status(201).json({
        success: true,
        data: post,
      });
    } catch (error) {
      console.error("Error creating post:", error);
      return next(new ErrorResponse(error.message, 500));
    }
  });
});

// @desc    Get all posts (from user and friends)
// @route   GET /api/posts
// @access  Private
exports.getPosts = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  // Build query
  let query = {};

  // If author is specified, only get posts from that author
  if (req.query.author) {
    query.author = req.query.author;
  } else {
    // Otherwise get posts from user and their friends
    query.$or = [{ author: req.user.id }, { author: { $in: user.friends } }];
  }

  // Get posts
  const posts = await Post.find(query)
    .populate("author", "username profilePicture")
    .populate("likes", "username")
    .populate({
      path: "comments",
      populate: {
        path: "author",
        select: "username profilePicture",
      },
    })
    .sort("-createdAt");

  res.status(200).json({
    success: true,
    data: posts,
  });
});

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Private
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "username profilePicture")
      .populate("group", "name")
      .populate("comments.author", "username profilePicture");

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    res.status(200).json({
      success: true,
      data: post,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
exports.updatePost = asyncHandler(async (req, res, next) => {
  let post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is post owner
  if (post.author.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this post`,
        401
      )
    );
  }

  post = await Post.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("author", "username profilePicture");

  res.status(200).json({
    success: true,
    data: post,
  });
});

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is post owner
  if (post.author.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this post`,
        401
      )
    );
  }

  await post.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Like/Unlike post
// @route   PUT /api/posts/:id/like
// @access  Private
exports.likePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if the post has already been liked by this user
  const likeIndex = post.likes.indexOf(req.user.id);

  if (likeIndex > -1) {
    // Unlike
    post.likes.splice(likeIndex, 1);
  } else {
    // Like
    post.likes.push(req.user.id);
  }

  await post.save();

  res.status(200).json({
    success: true,
    data: post,
  });
});

// @desc    Add comment to post
// @route   POST /api/posts/:id/comments
// @access  Private
exports.addComment = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  const newComment = {
    content: req.body.content,
    author: req.user.id,
  };

  post.comments.unshift(newComment);

  await post.save();

  // Populate the new comment's author details
  await post.populate({
    path: "comments",
    populate: {
      path: "author",
      select: "username profilePicture",
    },
  });

  res.status(200).json({
    success: true,
    data: post,
  });
});

// @desc    Remove comment from post
// @route   DELETE /api/posts/:id/comments/:comment_id
// @access  Private
exports.removeComment = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  // Pull out comment
  const comment = post.comments.find(
    (comment) => comment._id.toString() === req.params.comment_id
  );

  // Make sure comment exists
  if (!comment) {
    return next(
      new ErrorResponse(
        `Comment not found with id of ${req.params.comment_id}`,
        404
      )
    );
  }

  // Make sure user is comment owner
  if (comment.author.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this comment`,
        401
      )
    );
  }

  // Get remove index
  const removeIndex = post.comments
    .map((comment) => comment._id.toString())
    .indexOf(req.params.comment_id);

  post.comments.splice(removeIndex, 1);

  await post.save();

  res.status(200).json({
    success: true,
    data: post,
  });
});

// @desc    Update comment on post
// @route   PUT /api/posts/:id/comments/:comment_id
// @access  Private
exports.updateComment = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  // Find comment
  const comment = post.comments.id(req.params.comment_id);

  if (!comment) {
    return next(
      new ErrorResponse(
        `Comment not found with id of ${req.params.comment_id}`,
        404
      )
    );
  }

  // Make sure user is comment owner or admin
  if (comment.author.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this comment`,
        401
      )
    );
  }

  // Update content
  comment.content = req.body.content || comment.content;
  await post.save();

  res.status(200).json({
    success: true,
    data: post,
  });
});
