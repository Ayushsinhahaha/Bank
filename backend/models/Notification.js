const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        is_read: {
            type: Boolean,
            default: false,
        },
        request_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ServiceRequest',
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Notification', NotificationSchema);