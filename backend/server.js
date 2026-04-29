require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import our routes
const authRoutes = require('./routes/auth');
const managerRoutes = require('./routes/manager');
const equipmentRoutes = require('./routes/equipment.routes');
const aisleRoutes = require('./routes/aisle.routes');

const app = express();

// Middleware (These MUST come before the routes)
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ BuildForge Database Connected Successfully"))
  .catch(err => console.log("❌ Database Connection Error: ", err));

// Test Route
app.get('/', (req, res) => {
  res.send("BuildForge Backend is Running!");
});

// 🎯 The Auth Route connection (Must be before app.listen)
app.use('/api/auth', authRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/aisles', aisleRoutes);

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});