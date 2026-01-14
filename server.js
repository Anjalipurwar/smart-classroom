// File: server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Import Models
const User = require('./models/User');
const Faculty = require('./models/Faculty');

// Import Routes
const facultyRoutes = require('./routes/faculty');
const timetableRoutes = require('./routes/timetable'); 

// Initialize App
const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully.'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions (stored in MongoDB)
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day session
}));

// ✅ Middleware for protected routes
function isLoggedIn(req, res, next) {
  if (req.session.userId) return next();
  res.redirect('/');
}

// ---------- FRONTEND ROUTES ----------

// Login page
app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/app');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Signup page
app.get('/signup', (req, res) => {
  if (req.session.userId) return res.redirect('/app');
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Dashboard (Main app)
app.get('/app', isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// Faculty management
app.get('/faculty', isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'faculty.html'));
});

// View timetable
app.get('/view-timetable', isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'view_timetable.html'));
});

// Profile
app.get('/profile', isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// ---------- AUTH ROUTES ----------

// Signup
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "All fields are required." });

    if (!email.endsWith("@gmail.com"))
      return res.status(400).json({ success: false, message: "Please use a Gmail address." });

    if (password.length < 6)
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ success: false, message: "An account with this Gmail already exists." });

    const newUser = new User({ name, email, password });
    await newUser.save();

    req.session.userId = newUser._id;
    res.status(201).json({ success: true, message: "Account created successfully!" });
  } catch (error) {
    console.error("❌ Signup error:", error);
    res.status(500).json({ success: false, message: "Server error during signup." });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required.' });

    const user = await User.findOne({ email });
    if (!user || user.password !== password)
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    req.session.userId = user._id;
    res.json({ success: true, message: 'Login successful!' });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false, message: 'Could not log out.' });
    res.json({ success: true, message: 'Logged out successfully.' });
  });
});

// ---------- CONNECT BACKEND ROUTES ----------
app.use('/api/faculty', facultyRoutes);
app.use('/api/timetable', timetableRoutes); // ✅ this connects to your AI logic timetable.js

// ---------- SERVER START ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});



const classRoutes = require("./routes/class");
app.use("/api/classes", classRoutes);


// near other route requires
const masterRoutes = require('./routes/master');
app.use('/api/master', masterRoutes);

