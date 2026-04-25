const mongoose = require('mongoose');

// This defines what a "User" looks like in our database
const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
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
});

module.exports = mongoose.model('User', UserSchema);