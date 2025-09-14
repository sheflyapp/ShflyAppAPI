const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testAPI() {
  console.log('🧪 TESTING SHFLY API ENDPOINTS');
  console.log('===============================\n');

  try {
    // Test 1: Get Categories (Public endpoint)
    console.log('1️⃣ Testing Categories API...');
    const categoriesResponse = await axios.get(`${BASE_URL}/categories`);
    console.log(`✅ Categories API: ${categoriesResponse.status} - Found ${categoriesResponse.data.data.length} categories\n`);

    // Test 2: General Search (Public endpoint)
    console.log('2️⃣ Testing Search API...');
    const searchResponse = await axios.get(`${BASE_URL}/search?q=psychology&type=all&page=1&limit=5`);
    console.log(`✅ Search API: ${searchResponse.status} - Found results\n`);

    // Test 3: Provider Search (Public endpoint)
    console.log('3️⃣ Testing Provider Search API...');
    const providerSearchResponse = await axios.get(`${BASE_URL}/search/providers?q=psychology&page=1&limit=5`);
    console.log(`✅ Provider Search API: ${providerSearchResponse.status} - Found ${providerSearchResponse.data.data?.length || 0} providers\n`);

    // Test 4: Search Suggestions (Public endpoint)
    console.log('4️⃣ Testing Search Suggestions API...');
    const suggestionsResponse = await axios.get(`${BASE_URL}/search/suggestions?query=psych&type=providers`);
    console.log(`✅ Search Suggestions API: ${suggestionsResponse.status}\n`);

    // Test 5: Trending Searches (Public endpoint)
    console.log('5️⃣ Testing Trending Searches API...');
    const trendingResponse = await axios.get(`${BASE_URL}/search/trending`);
    console.log(`✅ Trending Searches API: ${trendingResponse.status}\n`);

    // Test 6: Advanced Search (Public endpoint)
    console.log('6️⃣ Testing Advanced Search API...');
    const advancedSearchResponse = await axios.get(`${BASE_URL}/search/advanced?latitude=40.7128&longitude=-74.0060&radius=50&page=1&limit=5`);
    console.log(`✅ Advanced Search API: ${advancedSearchResponse.status}\n`);

    // Test 7: Try to register a new user
    console.log('7️⃣ Testing User Registration API...');
    const timestamp = Date.now();
    const registrationData = {
      username: `testuser${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: 'password123',
      userType: 'seeker',
      phone: `+1234567${timestamp.toString().slice(-4)}`,
      specializations: [categoriesResponse.data.data[0]._id]
    };

    try {
      const registrationResponse = await axios.post(`${BASE_URL}/auth/register`, registrationData);
      console.log(`✅ User Registration API: ${registrationResponse.status} - User registered successfully`);
      
      // Test 8: Login with the registered user
      console.log('\n8️⃣ Testing User Login API...');
      const loginData = {
        email: registrationData.email,
        password: registrationData.password
      };
      
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, loginData);
      console.log(`✅ User Login API: ${loginResponse.status} - Login successful`);
      
      const authToken = loginResponse.data.token;
      console.log(`🔑 Auth Token: ${authToken.substring(0, 20)}...\n`);

      // Test 9: Get User Profile (Authenticated)
      console.log('9️⃣ Testing Get User Profile API...');
      const profileResponse = await axios.get(`${BASE_URL}/auth/user`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log(`✅ Get User Profile API: ${profileResponse.status} - Profile retrieved\n`);

      // Test 10: Get User Consultations (Authenticated)
      console.log('🔟 Testing Get User Consultations API...');
      const consultationsResponse = await axios.get(`${BASE_URL}/consultations?page=1&limit=5`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log(`✅ Get User Consultations API: ${consultationsResponse.status} - Found ${consultationsResponse.data.data.consultations.length} consultations\n`);

      // Test 11: Get Notifications (Authenticated)
      console.log('1️⃣1️⃣ Testing Get Notifications API...');
      const notificationsResponse = await axios.get(`${BASE_URL}/notifications?page=1&limit=5`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log(`✅ Get Notifications API: ${notificationsResponse.status} - Found ${notificationsResponse.data.data.length} notifications\n`);

      // Test 12: Get Wallet (Authenticated)
      console.log('1️⃣2️⃣ Testing Get Wallet API...');
      const walletResponse = await axios.get(`${BASE_URL}/wallet`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log(`✅ Get Wallet API: ${walletResponse.status} - Wallet balance: $${walletResponse.data.balance || 0}\n`);

      console.log('🎉 ALL API TESTS PASSED SUCCESSFULLY!');
      console.log('=====================================');
      console.log('✅ Public APIs working');
      console.log('✅ Authentication flow working');
      console.log('✅ Protected APIs working');
      console.log('✅ Database connectivity working');

    } catch (registrationError) {
      if (registrationError.response?.status === 400 && registrationError.response?.data?.message?.includes('already exists')) {
        console.log(`⚠️ User Registration API: 400 - User already exists (this is expected if running multiple times)`);
        
        // Try to login with existing user
        console.log('\n8️⃣ Testing User Login API with existing user...');
        const loginData = {
          email: 'test@example.com',
          password: 'password123'
        };
        
        try {
          const loginResponse = await axios.post(`${BASE_URL}/auth/login`, loginData);
          console.log(`✅ User Login API: ${loginResponse.status} - Login successful`);
          
          const authToken = loginResponse.data.token;
          console.log(`🔑 Auth Token: ${authToken.substring(0, 20)}...\n`);

          // Test authenticated endpoints
          console.log('9️⃣ Testing Get User Profile API...');
          const profileResponse = await axios.get(`${BASE_URL}/auth/user`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          console.log(`✅ Get User Profile API: ${profileResponse.status} - Profile retrieved\n`);

          console.log('🎉 AUTHENTICATED API TESTS PASSED!');
          console.log('==================================');
          console.log('✅ Authentication working');
          console.log('✅ Protected APIs working');
          
        } catch (loginError) {
          console.log(`❌ User Login API: ${loginError.response?.status} - ${loginError.response?.data?.message || loginError.message}`);
        }
      } else {
        console.log(`❌ User Registration API: ${registrationError.response?.status} - ${registrationError.response?.data?.message || registrationError.message}`);
      }
    }

  } catch (error) {
    console.log(`❌ API Test Failed: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

// Run the test
testAPI();
