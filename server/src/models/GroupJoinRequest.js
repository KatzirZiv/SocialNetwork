const mongoose = require('mongoose');

const groupJoinRequestSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // sender
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // group admin
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GroupJoinRequest', groupJoinRequestSchema); 