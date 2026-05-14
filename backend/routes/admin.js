const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ServiceRequest = require('../models/ServiceRequest');
const Notification = require('../models/Notification');
const { verifyToken, checkRole } = require('../middleware/auth');

// ── DASHBOARD STATS ────────────────────────────────────
router.get(
    '/dashboard-stats',
    verifyToken,
    checkRole('admin'),
    async (req, res) => {
        try {
            const [
                total_requests,
                pending,
                assigned,
                in_progress,
                completed,
                cancelled,
                total_users,
                total_agents,
            ] = await Promise.all([
                ServiceRequest.countDocuments(),
                ServiceRequest.countDocuments({ status: 'pending' }),
                ServiceRequest.countDocuments({ status: 'assigned' }),
                ServiceRequest.countDocuments({ status: 'in_progress' }),
                ServiceRequest.countDocuments({ status: 'completed' }),
                ServiceRequest.countDocuments({ status: 'cancelled' }),
                User.countDocuments({ role: 'user' }),
                User.countDocuments({ role: 'agent' }),
            ]);

            res.json({
                success: true,
                stats: {
                    total_requests,
                    pending,
                    assigned,
                    in_progress,
                    completed,
                    cancelled,
                    total_users,
                    total_agents,
                },
            });

        } catch (err) {
            res.status(500).json({
                success: false,
                message: 'Server error',
            });
        }
    }
);

// ── GET ALL REQUESTS ───────────────────────────────────
router.get(
    '/all-requests',
    verifyToken,
    checkRole('admin'),
    async (req, res) => {
        try {
            const { status, priority, page = 1, limit = 50 } = req.query;

            const filter = {};
            if (status) filter.status = status;
            if (priority) filter.priority = priority;

            const requests = await ServiceRequest.find(filter)
                .populate('user_id', 'full_name email phone')
                .populate('assigned_agent', 'full_name email')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await ServiceRequest.countDocuments(filter);

            res.json({
                success: true,
                total,
                requests,
            });

        } catch (err) {
            res.status(500).json({
                success: false,
                message: 'Server error',
            });
        }
    }
);

// ── GET ALL USERS ──────────────────────────────────────
router.get(
    '/all-users',
    verifyToken,
    checkRole('admin'),
    async (req, res) => {
        try {
            const users = await User.find({ role: 'user' })
                .select('-password')
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                count: users.length,
                users,
            });

        } catch (err) {
            res.status(500).json({
                success: false,
                message: 'Server error',
            });
        }
    }
);

// ── GET ALL AGENTS ─────────────────────────────────────
router.get(
    '/all-agents',
    verifyToken,
    checkRole('admin'),
    async (req, res) => {
        try {
            const agents = await User.find({ role: 'agent' })
                .select('-password')
                .sort({ createdAt: -1 });

            // Get task counts for each agent
            const agentsWithStats = await Promise.all(
                agents.map(async (agent) => {
                    const total_tasks = await ServiceRequest.countDocuments({
                        assigned_agent: agent._id,
                    });
                    const completed_tasks = await ServiceRequest.countDocuments({
                        assigned_agent: agent._id,
                        status: 'completed',
                    });
                    const active_tasks = await ServiceRequest.countDocuments({
                        assigned_agent: agent._id,
                        status: { $in: ['assigned', 'in_progress'] },
                    });

                    return {
                        ...agent.toObject(),
                        total_tasks,
                        completed_tasks,
                        active_tasks,
                    };
                })
            );

            res.json({
                success: true,
                count: agents.length,
                agents: agentsWithStats,
            });

        } catch (err) {
            res.status(500).json({
                success: false,
                message: 'Server error',
            });
        }
    }
);

// ── CREATE AGENT ───────────────────────────────────────
router.post(
    '/create-agent',
    verifyToken,
    checkRole('admin'),
    async (req, res) => {
        try {
            const { full_name, email, password, phone } = req.body;

            if (!full_name || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Please fill all required fields',
                });
            }

            const existing = await User.findOne({
                email: email.toLowerCase(),
            });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists',
                });
            }

            const agent = await User.create({
                full_name,
                email,
                password,
                phone,
                role: 'agent',
            });

            res.status(201).json({
                success: true,
                message: 'Agent created successfully!',
                agentId: agent._id,
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

// ── ASSIGN REQUEST TO AGENT ────────────────────────────
router.put(
    '/assign-request',
    verifyToken,
    checkRole('admin'),
    async (req, res) => {
        try {
            const { request_id, agent_id } = req.body;

            const request = await ServiceRequest.findById(request_id);
            if (!request) {
                return res.status(404).json({
                    success: false,
                    message: 'Request not found',
                });
            }

            const agent = await User.findById(agent_id);
            if (!agent || agent.role !== 'agent') {
                return res.status(404).json({
                    success: false,
                    message: 'Agent not found',
                });
            }

            // Update request
            request.assigned_agent = agent_id;
            request.status = 'assigned';
            request.updates.push({
                updated_by: req.user._id,
                updated_by_name: req.user.full_name,
                comment: `Request assigned to agent: ${agent.full_name}`,
            });

            await request.save();

            // Notify Agent
            const agentNotif = 
                `🔔 New task assigned: "${request.title}". Please take action!`;
            await Notification.create({
                user_id: agent_id,
                message: agentNotif,
                request_id: request._id,
            });

            // Notify User
            const userNotif = 
                `👤 Your request "${request.title}" has been assigned to 
                agent: ${agent.full_name}`;
            await Notification.create({
                user_id: request.user_id,
                message: userNotif,
                request_id: request._id,
            });

            // Socket Emit
            const io = req.app.get('io');
            if (io) {
                io.to(`agent_${agent_id}`).emit('new_assignment', {
                    message: agentNotif,
                    requestId: request._id,
                });
                io.to(`user_${request.user_id}`).emit('status_update', {
                    message: userNotif,
                    requestId: request._id,
                });
            }

            res.json({
                success: true,
                message: `Request assigned to ${agent.full_name} successfully!`,
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

// ── TOGGLE USER/AGENT ACTIVE STATUS ───────────────────
router.put(
    '/toggle-user/:id',
    verifyToken,
    checkRole('admin'),
    async (req, res) => {
        try {
            const user = await User.findById(req.params.id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
            }

            user.is_active = !user.is_active;
            await user.save();

            res.json({
                success: true,
                message: `User ${user.is_active ? 'activated' : 'deactivated'} successfully!`,
                is_active: user.is_active,
            });

        } catch (err) {
            res.status(500).json({
                success: false,
                message: 'Server error',
            });
        }
    }
);

// ── DELETE REQUEST ─────────────────────────────────────
router.delete(
    '/delete-request/:id',
    verifyToken,
    checkRole('admin'),
    async (req, res) => {
        try {
            await ServiceRequest.findByIdAndDelete(req.params.id);
            await Notification.deleteMany({ request_id: req.params.id });

            res.json({
                success: true,
                message: 'Request deleted successfully!',
            });

        } catch (err) {
            res.status(500).json({
                success: false,
                message: 'Server error',
            });
        }
    }
);

module.exports = router;