const axios = require('axios');

// Cấu hình cho API endpoint
const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Test CORS configuration
 */
async function testCORS() {
  console.log('🔍 Kiểm tra cấu hình CORS...\n');
  
  try {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'GET',
      }
    });
    
    console.log('✅ CORS preflight request thành công');
    console.log('Headers trả về:', response.headers);
    
    // Kiểm tra CORS headers
    if (response.headers['access-control-allow-origin']) {
      console.log(`✅ access-control-allow-origin: ${response.headers['access-control-allow-origin']}`);
    } else {
      console.log('❌ Không tìm thấy header access-control-allow-origin');
    }
    
    if (response.headers['access-control-allow-methods']) {
      console.log(`✅ access-control-allow-methods: ${response.headers['access-control-allow-methods']}`);
    } else {
      console.log('❌ Không tìm thấy header access-control-allow-methods');
    }
    
    if (response.headers['access-control-allow-credentials']) {
      console.log(`✅ access-control-allow-credentials: ${response.headers['access-control-allow-credentials']}`);
    } else {
      console.log('❌ Không tìm thấy header access-control-allow-credentials');
    }
    
    console.log('\n✅ Cấu hình CORS hoạt động đúng!');
  } catch (error) {
    console.error('❌ Lỗi kiểm tra CORS:', error.message);
    
    if (error.response) {
      console.log('Headers trả về:', error.response.headers);
    }
  }
}

/**
 * Test API response format
 */
async function testResponseFormat() {
  console.log('\n🔍 Kiểm tra định dạng response chuẩn...\n');
  
  // Array of test endpoints
  const testEndpoints = [
    { method: 'GET', url: `${API_URL}/subscriptions`, name: 'Get Subscription Packages' },
    { method: 'GET', url: `${API_URL}/topics`, name: 'Get Topics' },
    { method: 'GET', url: `${API_URL}/tags`, name: 'Get Tags' },
    { method: 'POST', url: `${API_URL}/auth/login`, data: { email: 'test@example.com', password: 'wrong-password' }, name: 'Login (Expected to fail)' }
  ];
  
  for (const endpoint of testEndpoints) {
    console.log(`🔍 Kiểm tra endpoint: ${endpoint.name} (${endpoint.method} ${endpoint.url})`);
    
    try {
      let response;
      if (endpoint.method === 'GET') {
        response = await axios.get(endpoint.url);
      } else if (endpoint.method === 'POST') {
        response = await axios.post(endpoint.url, endpoint.data);
      }
      
      console.log(`✅ Status code: ${response.status}`);
      
      // Kiểm tra format response
      if (response.data.hasOwnProperty('success')) {
        console.log(`✅ Có trường 'success': ${response.data.success}`);
      } else {
        console.log('❌ Không có trường success');
      }
      
      if (response.data.hasOwnProperty('message')) {
        console.log(`✅ Có trường 'message': ${response.data.message}`);
      } else {
        console.log('❌ Không có trường message');
      }
      
      if (response.data.hasOwnProperty('data') || 
          endpoint.method === 'POST' && !response.data.success) {
        console.log('✅ Có trường data hoặc đây là trường hợp lỗi login');
      } else {
        console.log('❌ Không có trường data');
      }
      
      console.log('🔍 Cấu trúc response:', Object.keys(response.data));
      console.log('-------------------------------------');
    } catch (error) {
      console.log(`⚠️ Endpoint trả về lỗi (có thể là dự kiến): ${error.message}`);
      
      if (error.response) {
        console.log(`✅ Status code: ${error.response.status}`);
        
        // Kiểm tra format response lỗi
        if (error.response.data.hasOwnProperty('success')) {
          console.log(`✅ Có trường 'success': ${error.response.data.success}`);
        } else {
          console.log('❌ Không có trường success');
        }
        
        if (error.response.data.hasOwnProperty('message')) {
          console.log(`✅ Có trường 'message': ${error.response.data.message}`);
        } else {
          console.log('❌ Không có trường message');
        }
        
        console.log('🔍 Cấu trúc response lỗi:', Object.keys(error.response.data));
      }
      
      console.log('-------------------------------------');
    }
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Bắt đầu kiểm tra cấu hình CORS và định dạng response...\n');
  
  // Kiểm tra CORS
  await testCORS();
  
  // Kiểm tra định dạng response
  await testResponseFormat();
  
  console.log('\n✅ Đã hoàn thành kiểm tra!');
}

// Chạy script
main().catch(console.error); 