const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Post = require('../models/Post');
const Group = require('../models/Group');
const Message = require('../models/Message');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/effisocial';

// Sample data
const users = [
  {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    bio: 'Software developer and tech enthusiast',
    profilePicture: 'https://randomuser.me/api/portraits/men/1.jpg'
  },
  {
    username: 'jane_smith',
    email: 'jane@example.com',
    password: 'password123',
    firstName: 'Jane',
    lastName: 'Smith',
    bio: 'Digital artist and photographer',
    profilePicture: 'https://randomuser.me/api/portraits/women/1.jpg'
  },
  {
    username: 'mike_wilson',
    email: 'mike@example.com',
    password: 'password123',
    firstName: 'Mike',
    lastName: 'Wilson',
    bio: 'Fitness trainer and health coach',
    profilePicture: 'https://randomuser.me/api/portraits/men/2.jpg'
  }
];

const posts = [
  {
    content: 'Just launched my new website! Check it out and let me know what you think.',
    media: 'https://picsum.photos/800/600',
    mediaType: 'image',
    likes: [],
    comments: []
  },
  {
    content: 'Beautiful sunset at the beach today! 🌅',
    media: 'https://picsum.photos/800/600',
    mediaType: 'image',
    likes: [],
    comments: []
  },
  {
    content: 'New workout routine is paying off! 💪',
    media: 'https://picsum.photos/800/600',
    mediaType: 'image',
    likes: [],
    comments: []
  }
];

const groups = [
  {
    name: 'Tech Enthusiasts',
    description: 'A group for discussing the latest in technology',
    members: [],
    posts: []
  },
  {
    name: 'Photography Club',
    description: 'Share your photos and get feedback from fellow photographers',
    members: [],
    posts: []
  }
];

const messages = [
  {
    content: 'Hey, how are you doing?',
    sender: null, // Will be set after user creation
    receiver: null, // Will be set after user creation
    read: false
  },
  {
    content: 'Did you see the latest tech news?',
    sender: null,
    receiver: null,
    read: false
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Post.deleteMany({});
    await Group.deleteMany({});
    await Message.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const createdUsers = await Promise.all(
      users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        return User.create({
          ...user,
          password: hashedPassword
        });
      })
    );
    console.log('Created users');

    // Create groups
    const createdGroups = await Promise.all(
      groups.map((group, index) => {
        return Group.create({
          ...group,
          admin: createdUsers[index % createdUsers.length]._id,
          members: [createdUsers[index % createdUsers.length]._id]
        });
      })
    );
    console.log('Created groups');

    // Create posts
    const createdPosts = await Promise.all(
      posts.map((post, index) => {
        return Post.create({
          ...post,
          author: createdUsers[index % createdUsers.length]._id,
          group: createdGroups[index % createdGroups.length]._id
        });
      })
    );
    console.log('Created posts');

    // Create messages
    const createdMessages = await Promise.all(
      messages.map((message, index) => {
        return Message.create({
          ...message,
          sender: createdUsers[index % createdUsers.length]._id,
          receiver: createdUsers[(index + 1) % createdUsers.length]._id
        });
      })
    );
    console.log('Created messages');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase(); 