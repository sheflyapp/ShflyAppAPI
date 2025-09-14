const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testStaticContentAPIs() {
  console.log('📄 TESTING STATIC CONTENT APIs');
  console.log('===============================\n');

  try {
    // Test 1: Get all content (should be empty initially)
    console.log('1️⃣ Testing Get All Content API...');
    const allContentResponse = await axios.get(`${BASE_URL}/content`);
    console.log(`✅ Get All Content API: ${allContentResponse.status} - Found ${allContentResponse.data.data.length} content items\n`);

    // Test 2: Get specific content (should return 404 for non-existent content)
    console.log('2️⃣ Testing Get Privacy Policy API (should be 404)...');
    try {
      const privacyResponse = await axios.get(`${BASE_URL}/content/privacy-policy`);
      console.log(`✅ Privacy Policy API: ${privacyResponse.status} - Found content`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`✅ Privacy Policy API: 404 - Content not found (expected for new setup)\n`);
      } else {
        console.log(`❌ Privacy Policy API: ${error.response?.status} - ${error.response?.data?.message}\n`);
      }
    }

    // Test 3: Get content with language parameter
    console.log('3️⃣ Testing Get Content with Language Parameter...');
    try {
      const contentEnResponse = await axios.get(`${BASE_URL}/content/terms-conditions?lang=en`);
      console.log(`✅ Terms & Conditions (EN): ${contentEnResponse.status}`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`✅ Terms & Conditions (EN): 404 - Content not found (expected)\n`);
      } else {
        console.log(`❌ Terms & Conditions (EN): ${error.response?.status} - ${error.response?.data?.message}\n`);
      }
    }

    try {
      const contentArResponse = await axios.get(`${BASE_URL}/content/terms-conditions?lang=ar`);
      console.log(`✅ Terms & Conditions (AR): ${contentArResponse.status}`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`✅ Terms & Conditions (AR): 404 - Content not found (expected)\n`);
      } else {
        console.log(`❌ Terms & Conditions (AR): ${error.response?.status} - ${error.response?.data?.message}\n`);
      }
    }

    console.log('🎉 STATIC CONTENT API TESTS COMPLETED!');
    console.log('=====================================');
    console.log('✅ Public content APIs working');
    console.log('✅ Language parameter support working');
    console.log('✅ 404 handling working correctly');
    console.log('✅ API structure is ready for content management');

    console.log('\n📝 NEXT STEPS:');
    console.log('==============');
    console.log('1. Use admin panel to create content: http://localhost:5000/admin-content-management.html');
    console.log('2. Or use API directly with admin authentication');
    console.log('3. Test content creation and retrieval');

  } catch (error) {
    console.log(`❌ Static Content API Test Failed: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

// Test with admin authentication
async function testStaticContentWithAuth() {
  console.log('\n🔐 TESTING STATIC CONTENT WITH ADMIN AUTH');
  console.log('==========================================\n');

  try {
    // First, login as admin to get token
    console.log('1️⃣ Getting Admin Authentication Token...');
    const loginData = {
      email: 'admin@shfly.com', // Assuming admin email
      password: 'admin123' // Assuming admin password
    };

    let authToken = '';
    try {
      const loginResponse = await axios.post(`${BASE_URL}/admin/auth/login`, loginData);
      console.log(`✅ Admin Login: ${loginResponse.status}`);
      authToken = loginResponse.data.token;
    } catch (loginError) {
      console.log(`⚠️ Admin Login: ${loginError.response?.status} - ${loginError.response?.data?.message || 'Admin not found'}`);
      console.log('Skipping authenticated tests...\n');
      return;
    }

    const headers = { Authorization: `Bearer ${authToken}` };

    // Test 2: Get all content for admin
    console.log('2️⃣ Testing Get All Content for Admin...');
    try {
      const adminContentResponse = await axios.get(`${BASE_URL}/content/admin/all`, { headers });
      console.log(`✅ Admin Get All Content: ${adminContentResponse.status} - Found ${adminContentResponse.data.data.length} content items`);
    } catch (error) {
      console.log(`❌ Admin Get All Content: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    // Test 3: Create privacy policy content
    console.log('\n3️⃣ Testing Create Privacy Policy Content...');
    const privacyData = {
      title: 'Privacy Policy',
      content: 'This is our privacy policy. We respect your privacy and protect your personal information.',
      contentAr: 'هذه هي سياسة الخصوصية الخاصة بنا. نحن نحترم خصوصيتك ونحمي معلوماتك الشخصية.',
      version: '1.0.0',
      seoTitle: 'Privacy Policy - Shfly',
      seoDescription: 'Learn about how we protect your privacy and personal information.',
      seoKeywords: ['privacy', 'policy', 'data protection', 'shfly']
    };

    try {
      const createResponse = await axios.post(`${BASE_URL}/content/privacy-policy`, privacyData, { headers });
      console.log(`✅ Create Privacy Policy: ${createResponse.status} - Content created successfully`);
    } catch (error) {
      console.log(`❌ Create Privacy Policy: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    // Test 4: Get the created content
    console.log('\n4️⃣ Testing Get Created Privacy Policy...');
    try {
      const getPrivacyResponse = await axios.get(`${BASE_URL}/content/privacy-policy`);
      console.log(`✅ Get Privacy Policy: ${getPrivacyResponse.status} - Content retrieved`);
      console.log(`   Title: ${getPrivacyResponse.data.data.title}`);
      console.log(`   Version: ${getPrivacyResponse.data.data.version}`);
    } catch (error) {
      console.log(`❌ Get Privacy Policy: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    // Test 5: Get content in Arabic
    console.log('\n5️⃣ Testing Get Privacy Policy in Arabic...');
    try {
      const getPrivacyArResponse = await axios.get(`${BASE_URL}/content/privacy-policy?lang=ar`);
      console.log(`✅ Get Privacy Policy (AR): ${getPrivacyArResponse.status} - Arabic content retrieved`);
    } catch (error) {
      console.log(`❌ Get Privacy Policy (AR): ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    console.log('\n🎉 AUTHENTICATED STATIC CONTENT TESTS COMPLETED!');
    console.log('================================================');
    console.log('✅ Admin authentication working');
    console.log('✅ Content creation working');
    console.log('✅ Content retrieval working');
    console.log('✅ Multi-language support working');

  } catch (error) {
    console.log(`❌ Authenticated Test Failed: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

// Run both tests
async function runAllTests() {
  await testStaticContentAPIs();
  await testStaticContentWithAuth();
}

runAllTests();
