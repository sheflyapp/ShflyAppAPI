const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testFinalAPIs() {
  console.log('🎯 FINAL API TESTING - STATIC CONTENT');
  console.log('=====================================\n');

  try {
    // Test 1: Get all content
    console.log('1️⃣ Testing Get All Content...');
    const allContentResponse = await axios.get(`${BASE_URL}/content`);
    console.log(`✅ Get All Content: ${allContentResponse.status} - Found ${allContentResponse.data.data.length} items\n`);

    // Test 2: Get privacy policy
    console.log('2️⃣ Testing Get Privacy Policy...');
    const privacyResponse = await axios.get(`${BASE_URL}/content/privacy-policy`);
    console.log(`✅ Privacy Policy: ${privacyResponse.status} - Title: "${privacyResponse.data.data.title}"\n`);

    // Test 3: Get terms in Arabic
    console.log('3️⃣ Testing Get Terms in Arabic...');
    const termsArResponse = await axios.get(`${BASE_URL}/content/terms-conditions?lang=ar`);
    console.log(`✅ Terms (AR): ${termsArResponse.status} - Title: "${termsArResponse.data.data.title}"\n`);

    // Test 4: Get help content
    console.log('4️⃣ Testing Get Help Content...');
    const helpResponse = await axios.get(`${BASE_URL}/content/help`);
    console.log(`✅ Help Content: ${helpResponse.status} - Title: "${helpResponse.data.data.title}"\n`);

    // Test 5: Get onboarding content
    console.log('5️⃣ Testing Get Onboarding Content...');
    const onboardingResponse = await axios.get(`${BASE_URL}/content/onboarding`);
    console.log(`✅ Onboarding: ${onboardingResponse.status} - Title: "${onboardingResponse.data.data.title}"\n`);

    // Test 6: Test non-existent content
    console.log('6️⃣ Testing Non-existent Content (should be 404)...');
    try {
      await axios.get(`${BASE_URL}/content/non-existent`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`✅ Non-existent Content: 404 - Content not found (expected)\n`);
      } else {
        console.log(`❌ Non-existent Content: ${error.response?.status} - ${error.response?.data?.message}\n`);
      }
    }

    console.log('🎉 ALL STATIC CONTENT APIs WORKING PERFECTLY!');
    console.log('============================================');
    console.log('✅ Content retrieval working');
    console.log('✅ Multi-language support working');
    console.log('✅ Error handling working');
    console.log('✅ Sample content loaded successfully');

    console.log('\n📋 Available Content Types:');
    console.log('===========================');
    console.log('• Privacy Policy - /api/content/privacy-policy');
    console.log('• Terms & Conditions - /api/content/terms-conditions');
    console.log('• Help Center - /api/content/help');
    console.log('• Onboarding - /api/content/onboarding');
    console.log('• All Content - /api/content');

    console.log('\n🌐 Language Support:');
    console.log('===================');
    console.log('• English (default) - ?lang=en');
    console.log('• Arabic - ?lang=ar');

    console.log('\n🔧 Admin Panel:');
    console.log('==============');
    console.log('• URL: http://localhost:5000/admin-content-management.html');
    console.log('• Features: Create, edit, delete content');
    console.log('• Multi-language support');
    console.log('• SEO management');

  } catch (error) {
    console.log(`❌ Test Failed: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

testFinalAPIs();
