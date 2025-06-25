const Post = require("../models/Post");
const Group = require("../models/Group");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const asyncHandler = require("../middleware/async");
const ErrorResponse = require("../utils/errorResponse");
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");

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
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for videos
  fileFilter: function (req, file, cb) {
    const imageTypes = /jpeg|jpg|png|gif/;
    const videoTypes = /mp4|webm|ogg/;
    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = imageTypes.test(ext);
    const isVideo = videoTypes.test(ext);
    const isImageMime = file.mimetype.startsWith('image/');
    const isVideoMime = file.mimetype.startsWith('video/');
    if ((isImage && isImageMime) || (isVideo && isVideoMime)) {
      return cb(null, true);
    }
    cb(new Error('Only image and video files are allowed!'));
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
      // Set mediaType based on mimetype
      if (req.file.mimetype.startsWith('video/')) {
        req.body.mediaType = 'video';
      } else if (req.file.mimetype.startsWith('image/')) {
        req.body.mediaType = 'image';
      }
    }

    // Extra logging for group
    console.log("Group field received:", req.body.group);

    try {
      const post = await Post.create(req.body);
      await post.populate("author", "username profilePicture");
      await post.populate("group", "name");
      // הוספת הפוסט למערך הפוסטים של הקבוצה (אם קיים group)
      if (post.group) {
        try {
          await Group.findByIdAndUpdate(post.group, { $addToSet: { posts: post._id } });
        } catch (e) {
          console.warn('Failed to add post to group:', e.message);
        }
      }
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
  try {
    const user = await User.findById(req.user.id);

    // Build query
    let query = {};

    // If group is specified, only get posts from that group
    if (req.query.group) {
      if (mongoose.Types.ObjectId.isValid(req.query.group)) {
        query.group = req.query.group;
      } else {
        return res.status(400).json({ success: false, message: "Invalid group ID" });
      }
    } else if (req.query.author) {
      query.author = req.query.author;
    } else {
      // Get posts from user, their friends, and their groups
      const userIds = [req.user.id, ...(user.friends || [])];
      const groupIds = user.groups || [];
      query.$or = [
        // Posts not in a group, from user or friends
        { $and: [ { $or: [ { group: { $exists: false } }, { group: null } ] }, { author: { $in: userIds } } ] },
        // Posts in a group, only if user is a member
        { group: { $in: groupIds } }
      ];
    }

    // Get posts
    const posts = await Post.find(query)
      .populate("author", "username profilePicture")
      .populate("group", "name")
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
  } catch (err) {
    console.error("Error in getPosts:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
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
  const post = await Post.findById(req.params.id).populate('group');

  if (!post) {
    return next(
      new ErrorResponse(`Post not found with id of ${req.params.id}`, 404)
    );
  }

  // Allow: post author, global admin, or group admin (if post belongs to a group)
  let isGroupAdmin = false;
  if (post.group && post.group.admin && post.group.admin.toString() === req.user.id) {
    isGroupAdmin = true;
  }

  if (
    post.author.toString() !== req.user.id &&
    req.user.role !== "admin" &&
    !isGroupAdmin
  ) {
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

// @desc    Get number of new posts per month (last 12 months)
// @route   GET /api/posts/stats/new-per-month
// @access  Public/Admin
exports.getNewPostsPerMonth = async (req, res) => {
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
    const posts = await Post.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 }
        }
      }
    ]);
    const data = months.map(m => {
      const found = posts.find(p => p._id.year === m.year && p._id.month === m.month);
      return { ...m, count: found ? found.count : 0 };
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get top active users (by number of posts)
// @route   GET /api/posts/stats/top-users
// @access  Private/Admin
exports.topActiveUsers = async (req, res) => {
  try {
    const topUsers = await Post.aggregate([
      { $group: { _id: "$author", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 7 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          userId: "$user._id",
          username: "$user.username",
          profilePicture: "$user.profilePicture",
          count: 1
        }
      }
    ]);
    res.json({ success: true, data: topUsers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get posts count by day of week
// @route   GET /api/posts/stats/by-day-of-week
// @access  Private/Admin
exports.postsByDayOfWeek = async (req, res) => {
  try {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const posts = await Post.aggregate([
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          count: { $sum: 1 }
        }
      }
    ]);
    // MongoDB: 1=Sunday ... 7=Saturday
    const data = days.map((day, i) => {
      const found = posts.find(p => p._id === i + 1);
      return { day, count: found ? found.count : 0 };
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Get posts count by hour of day
// @route   GET /api/posts/stats/by-hour
// @access  Private/Admin
exports.postsByHour = async (req, res) => {
  try {
    const posts = await Post.aggregate([
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 }
        }
      }
    ]);
    const data = Array.from({ length: 24 }, (_, i) => {
      const found = posts.find(p => p._id === i);
      return { hour: i, count: found ? found.count : 0 };
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};