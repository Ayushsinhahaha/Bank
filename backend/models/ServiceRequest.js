const mongoose = require('mongoose');

// Sub-schema for request updates/comments
const UpdateSchema = new mongoose.Schema(
    {
        updated_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        updated_by_name: {
            type: String,
        },
        comment: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const ServiceRequestSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
        },
        service_type: {
            type: String,
            required: [true, 'Service type is required'],
            enum: [
                'Medical Assistance',
                'Home Care',
                'Transportation',
                'Grocery Shopping',
                'Medication Reminder',
                'Doctor Appointment',
                'Companionship',
                'Technical Help',
                'Legal Assistance',
                'Other',
            ],
        },
        status: {
            type: String,
            enum: [
                'pending',
                'assigned',
                'in_progress',
                'completed',
                'cancelled',
            ],
            default: 'pending',
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
        assigned_agent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        updates: [UpdateSchema],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('ServiceRequest', ServiceRequestSchema);