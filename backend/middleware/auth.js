const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── Verify Token ───────────────────────────────────────
const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access Denied. No token provided.',
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get fresh user from DB
        const user = await User.findById(decoded.id).select('-password');
        if (!user || !user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'User not found or deactivated.',
            });
        }

        req.user = user;
        next();

    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token.',
        });
    }
};

// ── Check Role ─────────────────────────────────────────
const checkRole = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access Denied. Required role: ${roles.join(' or ')}`,
            });
        }
        next();
    };
};

module.exports = { verifyToken, checkRole };