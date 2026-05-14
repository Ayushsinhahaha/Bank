// backend/createAllUsers.js
// Update MONGO_URI to use Atlas

const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found. Check backend/.env');
  process.exit(1);
}
const usersToCreate = [
    {
        full_name: 'Super Admin',
        email: 'admin@portal.com',
        password: 'admin123',
        phone: '9999999999',
        role: 'admin',
    },
    {
        full_name: 'Agent One',
        email: 'agent1@portal.com',
        password: 'agent123',
        phone: '9876543210',
        role: 'agent',
    },
    {
        full_name: 'Agent Two',
        email: 'agent2@portal.com',
        password: 'agent123',
        phone: '9876543211',
        role: 'agent',
    },
    {
        full_name: 'Test User',
        email: 'user@portal.com',
        password: 'user123',
        phone: '9123456789',
        role: 'user',
    },
];

const createAllUsers = async () => {
    try {
        console.log('🔄 Connecting to MongoDB Atlas...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB Atlas Connected!\n');

        for (const userData of usersToCreate) {
            const existing = await User.findOne({
                email: userData.email
            });

            if (existing) {
                console.log(`⚠️  Already exists: ${userData.email}`);
                continue;
            }

            await User.create(userData);
            console.log(`✅ Created [${userData.role.toUpperCase()}]: ${userData.email}`);
        }

        console.log('');
        console.log('╔══════════════════════════════════════════╗');
        console.log('║         ALL LOGIN CREDENTIALS            ║');
        console.log('╠══════════════════════════════════════════╣');
        console.log('║  👨‍💻 ADMIN                                ║');
        console.log('║  Email : admin@portal.com                ║');
        console.log('║  Pass  : admin123                        ║');
        console.log('║                                          ║');
        console.log('║  🧑‍💼 AGENT 1                              ║');
        console.log('║  Email : agent1@portal.com               ║');
        console.log('║  Pass  : agent123                        ║');
        console.log('║                                          ║');
        console.log('║  🧑‍💼 AGENT 2                              ║');
        console.log('║  Email : agent2@portal.com               ║');
        console.log('║  Pass  : agent123                        ║');
        console.log('║                                          ║');
        console.log('║  👤 TEST USER                            ║');
        console.log('║  Email : user@portal.com                 ║');
        console.log('║  Pass  : user123                         ║');
        console.log('╚══════════════════════════════════════════╝');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

createAllUsers();