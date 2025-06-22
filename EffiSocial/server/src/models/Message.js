const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Please provide message content'],
    maxlength: [1000, 'Message cannot be more than 1000 characters']
  },
  media: {
    type: String, // URL to media file
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Media must be a valid URL'
    }
  },
  mediaType: {
    type: String,
    enum: ['image', 'video', null],
    default: null
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

// Mark message as read
messageSchema.methods.markAsRead = async function() {
  this.read = true;
  await this.save();
};

module.exports = mongoose.model('Message', messageSchema); 