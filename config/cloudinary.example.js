// Example Cloudinary Configuration
// Copy this file to cloudinary.js and fill in your actual credentials

const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: './config.env' });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,        // Your Cloudinary cloud name
  api_key: process.env.CLOUDINARY_API_KEY,              // Your Cloudinary API key
  api_secret: process.env.CLOUDINARY_API_SECRET         // Your Cloudinary API secret
});

module.exports = cloudinary;

/*
To get your Cloudinary credentials:

1. Sign up at https://cloudinary.com/
2. Go to your Dashboard
3. Copy the following values:
   - Cloud Name
   - API Key
   - API Secret

4. Add them to your .env file:
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   CLOUDINARY_FOLDER=shfly-app-uploads

5. Copy this file to cloudinary.js and restart your server
*/
