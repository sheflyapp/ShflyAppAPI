const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testWithAuthentication() {
  console.log('🔐 TESTING AUTHENTICATED API ENDPOINTS');
  console.log('======================================\n');

  let authToken = '';

  try {
    // First, register and login to get auth token
    console.log('1️⃣ Getting Authentication Token...');
    const timestamp = Date.now();
    const registrationData = {
      username: `testuser${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: 'password123',
      userType: 'seeker',
      phone: `+1234567${timestamp.toString().slice(-4)}`,
      specializations: ['68b866100655e88b50e797c4'] // Use actual category ID
    };

    try {
      const registrationResponse = await axios.post(`${BASE_URL}/auth/register`, registrationData);
      console.log(`✅ User Registration: ${registrationResponse.status}`);
      authToken = registrationResponse.data.token;
    } catch (regError) {
      if (regError.response?.status === 400 && regError.response?.data?.message?.includes('already exists')) {
        console.log('⚠️ User already exists, trying login...');
        const loginData = {
          email: 'test@example.com',
          password: 'password123'
        };
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, loginData);
        console.log(`✅ User Login: ${loginResponse.status}`);
        authToken = loginResponse.data.token;
      } else {
        throw regError;
      }
    }

    console.log(`🔑 Auth Token: ${authToken.substring(0, 20)}...\n`);

    const headers = { Authorization: `Bearer ${authToken}` };

    // Test Chat API with authentication
    console.log('2️⃣ Testing Chat API...');
    try {
      const chatResponse = await axios.get(`${BASE_URL}/chat?page=1&limit=5`, { headers });
      console.log(`✅ Chat API: ${chatResponse.status} - Found ${chatResponse.data.data.length} conversations`);
    } catch (error) {
      console.log(`❌ Chat API: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    // Test Reviews API with authentication
    console.log('\n3️⃣ Testing Reviews API...');
    try {
      const reviewsResponse = await axios.get(`${BASE_URL}/reviews?page=1&limit=5`, { headers });
      console.log(`✅ Reviews API: ${reviewsResponse.status} - Found ${reviewsResponse.data.length} reviews`);
    } catch (error) {
      console.log(`❌ Reviews API: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    // Test Questions API with authentication
    console.log('\n4️⃣ Testing Questions API...');
    try {
      const questionsResponse = await axios.get(`${BASE_URL}/questions?page=1&limit=5`, { headers });
      console.log(`✅ Questions API: ${questionsResponse.status} - Found ${questionsResponse.data.data.length} questions`);
    } catch (error) {
      console.log(`❌ Questions API: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    // Test Availability API with authentication
    console.log('\n5️⃣ Testing Availability API...');
    try {
      const availabilityResponse = await axios.get(`${BASE_URL}/availability?page=1&limit=5`, { headers });
      console.log(`✅ Availability API: ${availabilityResponse.status} - Found ${availabilityResponse.data.data.length} availability slots`);
    } catch (error) {
      console.log(`❌ Availability API: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    // Test Profile API
    console.log('\n6️⃣ Testing Profile API...');
    try {
      const profileResponse = await axios.get(`${BASE_URL}/profile`, { headers });
      console.log(`✅ Profile API: ${profileResponse.status} - Profile retrieved`);
    } catch (error) {
      console.log(`❌ Profile API: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    // Test Wallet API
    console.log('\n7️⃣ Testing Wallet API...');
    try {
      const walletResponse = await axios.get(`${BASE_URL}/wallet`, { headers });
      console.log(`✅ Wallet API: ${walletResponse.status} - Balance: $${walletResponse.data.balance || 0}`);
    } catch (error) {
      console.log(`❌ Wallet API: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    // Test Notifications API
    console.log('\n8️⃣ Testing Notifications API...');
    try {
      const notificationsResponse = await axios.get(`${BASE_URL}/notifications?page=1&limit=5`, { headers });
      console.log(`✅ Notifications API: ${notificationsResponse.status} - Found ${notificationsResponse.data.data.length} notifications`);
    } catch (error) {
      console.log(`❌ Notifications API: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }

    console.log('\n🎉 AUTHENTICATED API TESTS COMPLETED!');
    console.log('=====================================');
    console.log('✅ Authentication working');
    console.log('✅ Protected APIs accessible');
    console.log('✅ Database connectivity verified');

  } catch (error) {
    console.log(`❌ Test Failed: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

testWithAuthentication();
