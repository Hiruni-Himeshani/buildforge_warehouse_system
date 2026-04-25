const mongoose = require('mongoose');

// This defines what a "User" looks like in our database
const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    required: true, 
    // These are the 4 roles we discussed for BuildForge
    enum: ['StoreKeeper', 'SalesOfficer', 'SalesManager', 'WarehouseManager'] 
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);