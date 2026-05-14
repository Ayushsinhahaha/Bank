const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📦 Database: ${conn.connection.name}`);

    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

// Connection Events
mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB Disconnected!');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB Reconnected!');
});

module.exports = connectDB;