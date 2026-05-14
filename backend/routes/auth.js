const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── REGISTER ───────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { full_name, email, password, phone, role } = req.body;

        // Validation
        if (!full_name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please fill all required fields',
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email is already registered',
            });
        }

        // Create user (password hashed in model)
        const user = await User.create({
            full_name,
            email,
            password,
            phone,
            role: role || 'user',
        });

        res.status(201).json({
            success: true,
            message: 'Registration successful!',
            userId: user._id,
        });

    } catch (err) {
        // Handle mongoose validation errors
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors)
                .map((e) => e.message);
            return res.status(400).json({
                success: false,
                message: messages[0],
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message,
        });
    }
});

// ── LOGIN ──────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please enter email and password',
            });
        }

        // Find user & include password for comparison
        const user = await User.findOne({
            email: email.toLowerCase(),
            is_active: true,
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: user.role,
                name: user.full_name,
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful!',
            token,
            user: {
                id: user._id,
                name: user.full_name,
                email: user.email,
                role: user.role,
            },
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message,
        });
    }
});

module.exports = router;