require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import User model
const User = require('../models/User');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shflyapp';
// Admin user configuration
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin User';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin@123';
const ADMIN_PHONE = process.env.ADMIN_PHONE || '+1234567890';

async function createAdminUser() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB successfully!');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: ADMIN_EMAIL },
        { username: ADMIN_USERNAME },
        { userType: 'admin' }
      ]
    });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   UserType: ${existingAdmin.userType}`);
      return;
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
    
    // Create admin user
    const adminUser = new User({
      fullname: ADMIN_NAME,
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      phone: ADMIN_PHONE,
      userType: 'admin',
      isVerified: true,
      isActive: true,
      bio: 'System Administrator',
      country: 'System',
      city: 'System',
      gender: 'other',
      chat: true,
      call: true,
      video: true
    });
    
    // Save admin user
    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('📋 Admin User Details:');
    console.log(`   Full Name: ${adminUser.fullname}`);
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Phone: ${adminUser.phone}`);
    console.log(`   UserType: ${adminUser.userType}`);
    console.log(`   Password: ${ADMIN_PASSWORD} (remember this!)`);
    console.log('\n🔐 You can now login with these credentials');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.code === 11000) {
      console.error('💡 Duplicate key error - user might already exist');
    }
    
    if (error.name === 'ValidationError') {
      console.error('💡 Validation error - check your input data');
      Object.keys(error.errors).forEach(key => {
        console.error(`   ${key}: ${error.errors[key].message}`);
      });
    }
    
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
    process.exit(0);
  }
}

// Run the script
createAdminUser();
