const express = require('express');
const router = express.Router();
const ServiceRequest = require('../models/ServiceRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { verifyToken, checkRole } = require('../middleware/auth');

// ── USER: RAISE A REQUEST ──────────────────────────────
router.post('/raise', verifyToken, checkRole('user'), async (req, res) => {
    try {
        const { title, description, service_type, priority } = req.body;

        if (!title || !description || !service_type) {
            return res.status(400).json({
                success: false,
                message: 'Please fill all required fields',
            });
        }

        // Create service request
        const request = await ServiceRequest.create({
            user_id: req.user._id,
            title,
            description,
            service_type,
            priority: priority || 'medium',
            status: 'pending',
        });

        // Notify ALL active agents
        const agents = await User.find({
            role: 'agent',
            is_active: true,
        }).select('_id');

        const notifMessage = 
            `📋 New Request: "${title}" has been raised. Please take action.`;

        const notifications = agents.map((agent) => ({
            user_id: agent._id,
            message: notifMessage,
            request_id: request._id,
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        // Emit socket event to all agents
        const io = req.app.get('io');
        if (io) {
            io.emit('new_request', {
                message: notifMessage,
                requestId: request._id,
                title,
                priority,
            });
        }

        res.status(201).json({
            success: true,
            message: 'Service request raised successfully!',
            request,
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message,
        });
    }
});

// ── USER: GET MY REQUESTS ──────────────────────────────
router.get('/my-requests', verifyToken, checkRole('user'), async (req, res) => {
    try {
        const requests = await ServiceRequest.find({
            user_id: req.user._id,
        })
            .populate('assigned_agent', 'full_name email phone')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: requests.length,
            requests,
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message,
        });
    }
});

// ── AGENT: GET ALL PENDING + ASSIGNED TASKS ────────────
router.get(
    '/agent-tasks',
    verifyToken,
    checkRole('agent'),
    async (req, res) => {
        try {
            const requests = await ServiceRequest.find({
                $or: [
                    { assigned_agent: req.user._id },
                    { status: 'pending' },
                ],
            })
                .populate('user_id', 'full_name email phone')
                .populate('assigned_agent', 'full_name')
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                count: requests.length,
                requests,
            });

        } catch (err) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: err.message,
            });
        }
    }
);

// ── AGENT: UPDATE REQUEST STATUS ───────────────────────
router.put(
    '/update-status/:id',
    verifyToken,
    checkRole('agent', 'admin'),
    async (req, res) => {
        try {
            const { status, comment } = req.body;
            const requestId = req.params.id;

            const request = await ServiceRequest.findById(requestId);
            if (!request) {
                return res.status(404).json({
                    success: false,
                    message: 'Request not found',
                });
            }

            // Update status and agent
            request.status = status;
            request.assigned_agent = req.user._id;

            // Add comment/update
            if (comment) {
                request.updates.push({
                    updated_by: req.user._id,
                    updated_by_name: req.user.full_name,
                    comment,
                });
            }

            await request.save();

            // Notify the user
            const notifMessage = 
                `✅ Your request "${request.title}" has been updated to: 
                ${status.replace('_', ' ').toUpperCase()}`;

            await Notification.create({
                user_id: request.user_id,
                message: notifMessage,
                request_id: request._id,
            });

            // Socket emit to specific user
            const io = req.app.get('io');
            if (io) {
                io.to(`user_${request.user_id}`).emit('status_update', {
                    message: notifMessage,
                    requestId: request._id,
                    status,
                });
            }

            res.json({
                success: true,
                message: `Request status updated to: ${status}`,
                request,
            });

        } catch (err) {
            res.status(500).json({
                success: false,
                message: 'Server error',
                error: err.message,
            });
        }
    }
);

// ── GET NOTIFICATIONS ──────────────────────────────────
router.get('/notifications', verifyToken, async (req, res) => {
    try {
        const notifications = await Notification.find({
            user_id: req.user._id,
        })
            .sort({ createdAt: -1 })
            .limit(20);

        const unreadCount = await Notification.countDocuments({
            user_id: req.user._id,
            is_read: false,
        });

        res.json({
            success: true,
            unreadCount,
            notifications,
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message,
        });
    }
});

// ── MARK ALL NOTIFICATIONS READ ────────────────────────
router.put('/notifications/read-all', verifyToken, async (req, res) => {
    try {
        await Notification.updateMany(
            { user_id: req.user._id, is_read: false },
            { is_read: true }
        );

        res.json({
            success: true,
            message: 'All notifications marked as read',
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error',
        });
    }
});

// ── GET REQUEST DETAILS ────────────────────────────────
router.get('/details/:id', verifyToken, async (req, res) => {
    try {
        const request = await ServiceRequest.findById(req.params.id)
            .populate('user_id', 'full_name email phone')
            .populate('assigned_agent', 'full_name email phone')
            .populate('updates.updated_by', 'full_name role');

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found',
            });
        }

        res.json({ success: true, request });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: err.message,
        });
    }
});

module.exports = router;