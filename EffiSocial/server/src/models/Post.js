const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'Please provide post content'],
      trim: true,
      maxlength: [1000, 'Post cannot be more than 1000 characters'],
    },
    media: {
      type: String, // URL to the media file
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    comments: [
      {
        content: {
          type: String,
          required: true,
          trim: true,
          maxlength: [500, 'Comment cannot be more than 500 characters'],
        },
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Update the updatedAt timestamp before saving
postSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add like to post
postSchema.methods.addLike = async function(userId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
    await this.save();
  }
};

// Remove like from post
postSchema.methods.removeLike = async function(userId) {
  this.likes = this.likes.filter(like => like.toString() !== userId.toString());
  await this.save();
};

// Add comment to post
postSchema.methods.addComment = async function(userId, content) {
  this.comments.push({
    author: userId,
    content: content
  });
  await this.save();
};

module.exports = mongoose.model('Post', postSchema); 