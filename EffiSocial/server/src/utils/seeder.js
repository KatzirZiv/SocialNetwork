const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Group = require('../models/Group');
const Post = require('../models/Post');
const Message = require('../models/Message');

// Load env vars
dotenv.config();

// Connect to DB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/effisocial', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Sample data
const users = [
  {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'password123',
    bio: 'Software developer and tech enthusiast',
    role: 'admin'
  },
  {
    username: 'jane_smith',
    email: 'jane@example.com',
    password: 'password123',
    bio: 'Digital artist and creative mind'
  },
  {
    username: 'bob_wilson',
    email: 'bob@example.com',
    password: 'password123',
    bio: 'Fitness trainer and health coach'
  }
];

const groups = [
  {
    name: 'Tech Enthusiasts',
    description: 'A group for discussing the latest in technology'
  },
  {
    name: 'Art & Design',
    description: 'Share your artwork and get feedback from fellow artists'
  },
  {
    name: 'Fitness & Health',
    description: 'Tips and discussions about staying fit and healthy'
  }
];

const posts = [
  {
    content: 'Just learned about the latest React features!',
    media: 'https://example.com/react.jpg',
    mediaType: 'image'
  },
  {
    content: 'Check out my latest digital artwork!',
    media: 'https://example.com/art.jpg',
    mediaType: 'image'
  },
  {
    content: 'New workout routine that really works!',
    media: 'https://example.com/workout.jpg',
    mediaType: 'image'
  }
];

const messages = [
  {
    content: 'Hey, how are you?',
    read: false
  },
  {
    content: 'Did you see the latest tech news?',
    read: true
  },
  {
    content: 'Let\'s catch up soon!',
    read: false
  }
];

// Import data
const importData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await Group.deleteMany();
    await Post.deleteMany();
    await Message.deleteMany();

    // Create users
    const createdUsers = await User.create(users);

    // Create groups
    const createdGroups = await Promise.all(
      groups.map(async (group, index) => {
        const newGroup = await Group.create({
          ...group,
          admin: createdUsers[index]._id,
          members: [createdUsers[index]._id]
        });

        // Add group to user's groups
        await User.findByIdAndUpdate(createdUsers[index]._id, {
          $push: { groups: newGroup._id }
        });

        return newGroup;
      })
    );

    // Create posts
    await Promise.all(
      posts.map(async (post, index) => {
        const newPost = await Post.create({
          ...post,
          author: createdUsers[index]._id,
          group: createdGroups[index]._id
        });

        // Add post to group
        await Group.findByIdAndUpdate(createdGroups[index]._id, {
          $push: { posts: newPost._id }
        });

        return newPost;
      })
    );

    // Create messages
    await Promise.all(
      messages.map(async (message, index) => {
        const sender = createdUsers[index];
        const receiver = createdUsers[(index + 1) % createdUsers.length];

        return Message.create({
          ...message,
          sender: sender._id,
          receiver: receiver._id
        });
      })
    );

    console.log('Data Imported!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Delete data
const destroyData = async () => {
  try {
    await User.deleteMany();
    await Group.deleteMany();
    await Post.deleteMany();
    await Message.deleteMany();

    console.log('Data Destroyed!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Handle command line arguments
if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
} 