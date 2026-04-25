const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.log("❌ Connection Error:", err));

const checkUsers = async () => {
    try {
        const users = await User.find();
        console.log("\n📋 LOGIN CREDENTIALS:\n");
        users.forEach((user, index) => {
            console.log(`${index + 1}. Username: ${user.username}`);
            console.log(`   Password: password`);
            console.log(`   Role: ${user.role}\n`);
        });
        
        process.exit();
    } catch (err) {
        console.log("❌ Error:", err);
        process.exit(1);
    }
};

checkUsers();
