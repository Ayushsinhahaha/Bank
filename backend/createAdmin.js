// backend/createAdmin.js

const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const createAdmin = async () => {
    try {
        // Connect to MongoDB
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected!');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ 
            email: 'admin@portal.com' 
        });

        if (existingAdmin) {
            console.log('⚠️  Admin already exists!');
            console.log('📧 Email:', existingAdmin.email);
            console.log('👤 Role:', existingAdmin.role);
            process.exit(0);
        }

        // Create Admin
        const admin = await User.create({
            full_name: 'Super Admin',
            email: 'admin@portal.com',
            password: 'admin123',
            phone: '9999999999',
            role: 'admin',
        });

        console.log('');
        console.log('================================');
        console.log('✅ Admin Created Successfully!');
        console.log('================================');
        console.log('📧 Email    : admin@portal.com');
        console.log('🔒 Password : admin123');
        console.log('👤 Role     : admin');
        console.log('🆔 ID       :', admin._id);
        console.log('================================');
        console.log('');
        console.log('👉 Go to: http://localhost:5000');
        console.log('👉 Login at: frontend/login-admin.html');
        console.log('');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
        process.exit(1);
    }
};

createAdmin();