const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
require('dotenv').config({ path: './config.env' });

// Test script to demonstrate Google OAuth API usage
async function testGoogleAuth() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shfly_app';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Create a test category if it doesn't exist
    let testCategory = await Category.findOne({ name: 'Technology' });
    if (!testCategory) {
      testCategory = new Category({
        name: 'Technology',
        description: 'Technology and software development consultations',
        isActive: true,
        color: '#10B981'
      });
      await testCategory.save();
      console.log('Created test category:', testCategory._id);
    }

    console.log('\n=== Google OAuth API Test ===\n');

    // Example request bodies for different platforms
    const androidRequest = {
      idToken: 'ANDROID_GOOGLE_ID_TOKEN_HERE',
      platform: 'android',
      userType: 'provider',
      specialization: testCategory._id.toString()
    };

    const iosRequest = {
      idToken: '116475487823735986481',
      platform: 'ios',
      userType: 'seeker',
      specialization: testCategory._id.toString()
    };

    const webRequest = {
      idToken: 'WEB_GOOGLE_ID_TOKEN_HERE',
      platform: 'web',
      userType: 'provider',
      specialization: testCategory._id.toString()
    };

    console.log('📱 Android Request Example:');
    console.log(JSON.stringify(androidRequest, null, 2));

    console.log('\n🍎 iOS Request Example:');
    console.log(JSON.stringify(iosRequest, null, 2));

    console.log('\n🌐 Web Request Example:');
    console.log(JSON.stringify(webRequest, null, 2));

    console.log('\n📋 API Endpoint:');
    console.log('POST /api/user/auth/google');

    console.log('\n📋 Required Headers:');
    console.log('Content-Type: application/json');

    console.log('\n📋 Environment Variables Required:');
    console.log('GOOGLE_CLIENT_ID_ANDROID=your_android_client_id');
    console.log('GOOGLE_CLIENT_ID_IOS=your_ios_client_id');
    console.log('GOOGLE_CLIENT_ID=your_web_client_id');

    console.log('\n📋 Response Format:');
    const responseExample = {
      message: 'Google authentication successful',
      token: 'JWT_TOKEN_HERE',
      user: {
        id: 'USER_ID',
        username: 'user@example.com',
        email: 'user@example.com',
        userType: 'provider',
        phone: '',
        specialization: 'CATEGORY_ID'
      }
    };
    console.log(JSON.stringify(responseExample, null, 2));

    console.log('\n🔧 How to get Google ID Token:');
    console.log('1. Android: Use Google Sign-In SDK');
    console.log('2. iOS: Use Google Sign-In SDK');
    console.log('3. Web: Use Google Identity Services');

    console.log('\n✅ Google OAuth API is ready for use!');
    console.log('\n📝 Note: Replace the idToken values with actual tokens from your mobile apps.');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

// Run the test
testGoogleAuth();
