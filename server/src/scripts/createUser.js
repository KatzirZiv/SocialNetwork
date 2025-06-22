const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/effisocial';

const userData = {
  username: 'johndoe',
  email: 'john@example.com',
  password: 'password123',
  bio: 'Software developer and tech enthusiast. Love coding and building new things!',
  profilePicture: 'https://randomuser.me/api/portraits/men/1.jpg',
  role: 'user'
};

async function createUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: userData.email },
        { username: userData.username }
      ]
    });

    if (existingUser) {
      console.log('User already exists:', existingUser.username);
      process.exit(0);
    }

    // Create user
    const user = await User.create(userData);
    console.log('User created successfully:', {
      id: user._id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      profilePicture: user.profilePicture,
      role: user.role
    });

    process.exit(0);
  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  }
}

createUser(); 