// File: routes/auth.js (CORRECT Email-Only Version)
const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Path to your User model

// --- API route for signup ---
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body; // Expect only email and password

    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required.' });
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password min 6 chars.' });
    if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ success: false, message: 'Invalid email format.' });

    const existingUser = await User.findOne({ email: email }); // Check only for email
    if (existingUser) return res.status(400).json({ success: false, message: 'Email already exists.' });

    // !! HASH PASSWORD HERE in real app !!
    const newUser = new User({ email, password }); // Save only email and password
    await newUser.save();

    req.session.userId = newUser._id; // Log in
    res.status(201).json({ success: true, message: 'Signup successful!' });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ success: false, message: 'Server error during signup.' });
  }
});

// --- API route for login ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body; // Expect only email and password
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required.' });

    const user = await User.findOne({ email: email }); // Find only by email

    // !! COMPARE HASHED PASSWORD HERE in real app !!
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    req.session.userId = user._id; // Log in
    res.json({ success: true, message: 'Login successful!' });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// --- API route for logout ---
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Could not log out.' });
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  });
});

module.exports = router;