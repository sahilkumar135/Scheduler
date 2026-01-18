// server.js

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken'); // For creating and verifying JSON Web Tokens
const AWS = require('aws-sdk'); // AWS SDK for Node.js

const app = express();
const PORT = process.env.PORT || 5000; // Use port from .env or default to 5000
const JWT_SECRET = process.env.JWT_SECRET; // Get JWT secret from .env

// Configure AWS SDK (ensure this matches your EC2 instance's region and SNS topic region)
// IMPORTANT: Replace 'your-aws-region' with your actual AWS region (e.g., 'ap-south-1', 'us-east-1')
AWS.config.update({ region: 'ap-northeast-1' }); // Example: 'ap-south-1' for Mumbai
const sns = new AWS.SNS(); // Create an SNS service object

// IMPORTANT: Replace 'your-aws-region' and 'your-account-id' with your actual values
const SNS_TOPIC_ARN = 'arn:aws:sns:ap-northeast-1:257976283409:SchedulrTaskCompletion'; // Example ARN

// Middleware
app.use(cors()); // Enable CORS for all routes, allowing frontend to connect
app.use(express.json()); // Enable parsing of JSON request bodies

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  // useNewUrlParser and useUnifiedTopology are deprecated and no longer needed for Mongoose 6+
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// --- User Schema and Model ---
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // Ensure usernames are unique
    trim: true,
    minlength: 3, // Minimum username length
  },
  password: {
    type: String,
    required: true,
    minlength: 6, // Minimum password length
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model('User', userSchema);

// --- Task Schema and Model ---
const taskSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  dueDate: {
    type: Date, // Store date as a Date object
    default: null, // Can be null if no due date is set
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'], // Enforce specific values
    default: 'Low',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Add a reference to the user who owns this task
  user: {
    type: mongoose.Schema.Types.ObjectId, // This will store the MongoDB _id of the User
    ref: 'User', // Refers to the 'User' model
    required: true, // A task must belong to a user
  }
});

const Task = mongoose.model('Task', taskSchema);


// --- Middleware for protecting routes (Authentication Middleware) ---
// This middleware will check for a valid JWT in the request header
const authMiddleware = (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token'); // Common header name for JWTs

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  // Verify token
  try {
    // jwt.verify decodes the token using the secret and returns the payload
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach the user ID from the token payload to the request object
    // This makes the user ID available in subsequent route handlers
    req.user = decoded.user;
    next(); // Move to the next middleware/route handler
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};


// --- API Routes ---

// --- Authentication Routes ---

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }


    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }


    user = new User({
      username,
      password, 
    });

    
    const salt = await bcrypt.genSalt(10); 
    user.password = await bcrypt.hash(password, salt); 

    // Save user to database
    await user.save();

    // Create JWT payload
    const payload = {
      user: {
        id: user.id, 
      },
    };

  
    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '1h' }, // Token expires in 1 hour
      (err, token) => {
        if (err) throw err;
        res.status(201).json({ token, message: 'User registered successfully' }); // Send token back to client
      }
    );

  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Check if user exists
    let user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare plain text password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
      },
    };

    // Sign the token
    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.status(200).json({ token, message: 'Logged in successfully' }); // Send token back to client
      }
    );

  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});


// --- Task Routes (Updated to be user-specific and include SNS) ---

// GET all tasks for the authenticated user
// This route is protected by authMiddleware
app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    // Find tasks where the 'user' field matches the authenticated user's ID
    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 }); // Sort by newest first
    res.status(200).json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ message: 'Server error fetching tasks' });
  }
});

// POST a new task for the authenticated user
app.post('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const { text, dueDate, priority } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Task text is required' });
    }

    const newTask = new Task({
      text,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || 'Low',
      user: req.user.id, // Assign the task to the authenticated user
    });

    const savedTask = await newTask.save();
    console.log('New task added to MongoDB:', savedTask.text); // Log for verification
    res.status(201).json(savedTask);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ message: 'Server error creating task' });
  }
});

// PUT (Update) a task by ID for the authenticated user
app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { text, completed, dueDate, priority } = req.body;

    // Find the task and ensure it belongs to the authenticated user
    let task = await Task.findOne({ _id: id, user: req.user.id });

    if (!task) {
      return res.status(404).json({ message: 'Task not found or unauthorized' });
    }

    const wasCompletedBefore = task.completed; // Store current completed status

    // Update task fields
    task.text = text || task.text; // Only update if provided
    task.completed = (typeof completed === 'boolean') ? completed : task.completed;
    task.dueDate = dueDate ? new Date(dueDate) : null;
    task.priority = priority || task.priority;

    await task.save(); // Save the updated task

    // --- SNS NOTIFICATION LOGIC ---
    // Check if the task just became completed (i.e., it was false, now it's true)
    if (!wasCompletedBefore && task.completed) {
      const message = `Task Completed: "${task.text}" (Priority: ${task.priority})`;
      const params = {
        Message: message,
        TopicArn: SNS_TOPIC_ARN,
        Subject: 'Schedulr Task Update: Task Completed!'
      };

      try {
        await sns.publish(params).promise(); // Publish the message to SNS
        console.log('SNS notification sent for completed task:', task.text); // Log for verification
      } catch (snsErr) {
        console.error('Failed to send SNS notification:', snsErr); // Log SNS specific errors
      }
    }
    // --- END SNS NOTIFICATION LOGIC ---

    res.status(200).json(task);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ message: 'Server error updating task' });
  }
});

// DELETE a task by ID for the authenticated user
app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the task and ensure it belongs to the authenticated user before deleting
    const task = await Task.findOne({ _id: id, user: req.user.id });

    if (!task) {
      return res.status(404).json({ message: 'Task not found or unauthorized' });
    }

    await Task.findByIdAndDelete(id); // Delete the task
    console.log('Task deleted from MongoDB:', id); // Log for verification
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ message: 'Server error deleting task' });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});