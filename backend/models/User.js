const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
    {
        full_name: {
            type: String,
            required: [true, 'Full name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                'Please enter a valid email',
            ],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: 6,
        },
        phone: {
            type: String,
            trim: true,
            default: '',
        },
        role: {
            type: String,
            enum: ['user', 'agent', 'admin'],
            default: 'user',
        },
        is_active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// ── Hash Password Before Save ──────────────────────────
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// ── Compare Password Method ────────────────────────────
UserSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);