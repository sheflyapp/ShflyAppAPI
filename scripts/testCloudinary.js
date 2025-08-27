const cloudinary = require('../config/cloudinary');

async function testCloudinary() {
  try {
    console.log('Testing Cloudinary configuration...');
    
    // Test basic configuration
    console.log('Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : 'Not set',
      api_secret: process.env.CLOUDINARY_API_SECRET ? '***' + process.env.CLOUDINARY_API_SECRET.slice(-4) : 'Not set'
    });

    // Test connection by getting account info
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful:', result);
    
    // Test uploader info
    const uploadPresets = await cloudinary.api.upload_presets();
    console.log('✅ Upload presets retrieved successfully');
    
    console.log('\n🎉 Cloudinary is configured correctly!');
    console.log('\nNext steps:');
    console.log('1. Make sure your environment variables are set correctly');
    console.log('2. Restart your server');
    console.log('3. Test file uploads through your API endpoints');
    
  } catch (error) {
    console.error('❌ Cloudinary test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check your environment variables in config.env');
    console.log('2. Verify your Cloudinary credentials');
    console.log('3. Ensure you have sufficient credits in your Cloudinary account');
    console.log('4. Check your internet connection');
  }
}

// Run the test
testCloudinary();
