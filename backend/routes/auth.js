const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 🎯 This creates the /register path
router.post('/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // 1. Check if user exists
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: "User already exists" });
        }

        // 2. Encrypt the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Save the new user
        user = new User({ 
            username, 
            password: hashedPassword, 
            role 
        });
        
        await user.save();
        res.status(201).json({ msg: "User registered successfully!" });
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔑 LOGIN ROUTE (To let your team enter the site)
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Check if the user exists
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ msg: "User not found" });

        // 2. Check if the password is correct
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid password" });

        // 3. Give them a "Digital Key" (Token) and send them to their lobby
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
        res.json({ token, role: user.role, username: user.username });
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;