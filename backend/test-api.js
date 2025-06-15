const axios = require('axios');

async function testAPI() {
  const baseURL = 'http://localhost:3001';
  
  try {
    console.log('测试 API 连接...');
    
    // 测试基本连接
    const response = await axios.get(`${baseURL}/api/statistics`, {
      timeout: 5000,
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('API 响应状态:', response.status);
    console.log('API 响应数据:', response.data);
    
  } catch (error) {
    console.error('API 测试失败:', error.message);
    if (error.response) {
      console.error('错误状态:', error.response.status);
      console.error('错误数据:', error.response.data);
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testAPI();
}

module.exports = { testAPI }; 