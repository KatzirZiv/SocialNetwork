const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a group name'],
    trim: true,
    minlength: [3, 'Group name must be at least 3 characters long'],
    maxlength: [50, 'Group name cannot be more than 50 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  coverImage: {
    type: String, // URL to cover image
    default: '/uploads/default_cover.png'
  },
  privacy: {
    type: String,
    enum: ['public', 'private'],
    default: 'public',
  }
});

// Update the updatedAt timestamp before saving
groupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add member to group
groupSchema.methods.addMember = async function(userId) {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
    await this.save();
  }
};

// Remove member from group
groupSchema.methods.removeMember = async function(userId) {
  this.members = this.members.filter(member => member.toString() !== userId.toString());
  await this.save();
};

// Add post to group
groupSchema.methods.addPost = async function(postId) {
  this.posts.push(postId);
  await this.save();
};

module.exports = mongoose.model('Group', groupSchema); 