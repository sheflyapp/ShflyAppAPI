const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
let authToken = '';
let userId = '';
let consultationId = '';
let paymentId = '';

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    console.log(`✅ ${method} ${endpoint} - Status: ${response.status}`);
    return response.data;
  } catch (error) {
    console.log(`❌ ${method} ${endpoint} - Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// Test Functions
async function testAuthenticationFlow() {
  console.log('\n🔐 TESTING AUTHENTICATION FLOW');
  console.log('================================');
  
  // 1. Get Categories for registration
  const categories = await apiCall('GET', '/categories');
  if (!categories?.data?.length) {
    console.log('❌ No categories found, cannot proceed with registration');
    return false;
  }
  
  // 2. Register new user
  const registrationData = {
    username: `testuser${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    password: 'password123',
    userType: 'seeker',
    phone: '+1234567890',
    specializations: [categories.data[0]._id]
  };
  
  const registration = await apiCall('POST', '/auth/register', registrationData);
  if (registration?.token) {
    authToken = registration.token;
    userId = registration.user.id;
    console.log('✅ User registered successfully');
  } else {
    console.log('❌ Registration failed');
    return false;
  }
  
  // 3. Login
  const loginData = {
    email: registrationData.email,
    password: registrationData.password
  };
  
  const login = await apiCall('POST', '/auth/login', loginData);
  if (login?.token) {
    authToken = login.token;
    console.log('✅ User logged in successfully');
  } else {
    console.log('❌ Login failed');
    return false;
  }
  
  return true;
}

async function testHomeNavigationFlow() {
  console.log('\n🏠 TESTING HOME & NAVIGATION FLOW');
  console.log('==================================');
  
  const headers = { Authorization: `Bearer ${authToken}` };
  
  // 1. Get user profile
  await apiCall('GET', '/auth/user', null, headers);
  
  // 2. Get categories
  await apiCall('GET', '/categories');
  
  // 3. Get recommendations
  await apiCall('GET', '/search/recommendations?limit=10', null, headers);
  
  // 4. Get trending searches
  await apiCall('GET', '/search/trending');
  
  // 5. Get user consultations
  await apiCall('GET', '/consultations?page=1&limit=10', null, headers);
  
  return true;
}

async function testSearchFlow() {
  console.log('\n🔍 TESTING SEARCH & DISCOVERY FLOW');
  console.log('===================================');
  
  // 1. General search
  await apiCall('GET', '/search?q=psychology&type=all&page=1&limit=10');
  
  // 2. Provider search
  await apiCall('GET', '/search/providers?q=psychology&sortBy=rating&page=1&limit=10');
  
  // 3. Search suggestions
  await apiCall('GET', '/search/suggestions?query=psych&type=providers');
  
  // 4. Advanced search
  await apiCall('GET', '/search/advanced?latitude=40.7128&longitude=-74.0060&radius=50&page=1&limit=20');
  
  return true;
}

async function testConsultationFlow() {
  console.log('\n📅 TESTING REQUEST & SCHEDULING FLOW');
  console.log('=====================================');
  
  const headers = { Authorization: `Bearer ${authToken}` };
  
  // 1. Get categories for consultation
  const categories = await apiCall('GET', '/categories');
  if (!categories?.data?.length) {
    console.log('❌ No categories found');
    return false;
  }
  
  // 2. Get providers
  const providers = await apiCall('GET', '/search/providers?limit=1');
  if (!providers?.data?.length) {
    console.log('❌ No providers found');
    return false;
  }
  
  // 3. Create consultation
  const consultationData = {
    providerId: providers.data[0]._id,
    categoryId: categories.data[0]._id,
    title: 'Test Consultation',
    description: 'This is a test consultation',
    consultationType: 'video',
    scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    duration: 60,
    price: 100,
    location: 'Online'
  };
  
  const consultation = await apiCall('POST', '/consultations', consultationData, headers);
  if (consultation?.data?.consultation?._id) {
    consultationId = consultation.data.consultation._id;
    console.log('✅ Consultation created successfully');
  } else {
    console.log('❌ Consultation creation failed');
    return false;
  }
  
  // 4. Get consultation details
  await apiCall('GET', `/consultations/${consultationId}`, null, headers);
  
  return true;
}

async function testPaymentFlow() {
  console.log('\n💳 TESTING PAYMENT FLOW');
  console.log('========================');
  
  const headers = { Authorization: `Bearer ${authToken}` };
  
  if (!consultationId) {
    console.log('❌ No consultation ID available for payment');
    return false;
  }
  
  // 1. Create payment
  const paymentData = {
    consultationId: consultationId,
    amount: 100,
    currency: 'USD',
    paymentMethod: 'credit_card',
    description: 'Test consultation payment'
  };
  
  const payment = await apiCall('POST', '/payments', paymentData, headers);
  if (payment?.data?.payment?._id) {
    paymentId = payment.data.payment._id;
    console.log('✅ Payment created successfully');
  } else {
    console.log('❌ Payment creation failed');
    return false;
  }
  
  // 2. Get payment details
  await apiCall('GET', `/payments/${paymentId}`, null, headers);
  
  // 3. Update payment status
  await apiCall('PUT', `/payments/${paymentId}`, { status: 'completed' }, headers);
  
  return true;
}

async function testChatFlow() {
  console.log('\n💬 TESTING CHAT & COMMUNICATION FLOW');
  console.log('====================================');
  
  const headers = { Authorization: `Bearer ${authToken}` };
  
  if (!consultationId) {
    console.log('❌ No consultation ID available for chat');
    return false;
  }
  
  // 1. Get chat conversations
  await apiCall('GET', '/chat?page=1&limit=10', null, headers);
  
  // 2. Send message
  const messageData = {
    consultationId: consultationId,
    message: 'Hello, this is a test message',
    messageType: 'text'
  };
  
  await apiCall('POST', '/chat', messageData, headers);
  
  return true;
}

async function testProfileFlow() {
  console.log('\n👤 TESTING USER PROFILE & SETTINGS FLOW');
  console.log('========================================');
  
  const headers = { Authorization: `Bearer ${authToken}` };
  
  // 1. Get user profile
  await apiCall('GET', '/profile', null, headers);
  
  // 2. Update profile
  const updateData = {
    fullname: 'Updated Test User',
    bio: 'This is an updated bio'
  };
  
  await apiCall('PUT', '/profile', updateData, headers);
  
  // 3. Get wallet
  await apiCall('GET', '/wallet', null, headers);
  
  return true;
}

async function testNotificationsFlow() {
  console.log('\n🔔 TESTING NOTIFICATIONS & REVIEWS FLOW');
  console.log('========================================');
  
  const headers = { Authorization: `Bearer ${authToken}` };
  
  // 1. Get notifications
  await apiCall('GET', '/notifications?page=1&limit=20', null, headers);
  
  // 2. Mark all notifications as read
  await apiCall('PUT', '/notifications/mark-all-read', null, headers);
  
  return true;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 STARTING COMPLETE API FLOW TESTING');
  console.log('=====================================');
  
  try {
    // Test each flow
    await testAuthenticationFlow();
    await testHomeNavigationFlow();
    await testSearchFlow();
    await testConsultationFlow();
    await testPaymentFlow();
    await testChatFlow();
    await testProfileFlow();
    await testNotificationsFlow();
    
    console.log('\n🎉 ALL TESTS COMPLETED!');
    console.log('=======================');
    console.log('Check the results above for any failures.');
    
  } catch (error) {
    console.log('\n❌ TEST RUNNER ERROR:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testAuthenticationFlow,
  testHomeNavigationFlow,
  testSearchFlow,
  testConsultationFlow,
  testPaymentFlow,
  testChatFlow,
  testProfileFlow,
  testNotificationsFlow
};
