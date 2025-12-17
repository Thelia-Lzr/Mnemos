const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// 测试用户登录信息
const testUser = {
  email: 'teddyyzr@foxmail.com',
  password: 'Teddy&Terri123'
};

async function testAIFormatFix() {
  console.log('🔧 测试AI格式修复...\n');
  try {
    
    // 1. 登录获取token
    console.log('1. 用户登录...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, testUser);
    const token = loginResponse.data.token;
    console.log('✅ 登录成功');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. 测试不同类型的练习生成
    const testCases = [
      {
        name: '英语语法练习',
        request: {
          language: 'en',
          difficulty: 'intermediate',
          type: 'grammar',
          count: 3
        }
      },
      {
        name: '法语词汇练习',
        request: {
          language: 'fr',
          difficulty: 'beginner',
          type: 'vocabulary',
          vocabularyWords: ['bonjour', 'merci', 'au revoir'],
          count: 3
        }
      },
      {
        name: '日语综合练习',
        request: {
          language: 'ja',
          difficulty: 'intermediate',
          type: 'general',
          count: 3
        }
      }
    ];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n${i + 2}. 测试${testCase.name}...`);
      
      try {
        const practiceResponse = await axios.post(
          `${API_BASE_URL}/practice/generate-group`, 
          testCase.request, 
          { headers }
        );
        
        const practiceGroup = practiceResponse.data.data;
        console.log(`✅ 生成成功: ${practiceGroup.title}`);
        console.log(`   题目数量: ${practiceGroup.questions.length}`);
        
        // 验证格式
        let formatValid = true;
        let formatErrors = [];
        
        practiceGroup.questions.forEach((question, index) => {
          // 检查选项格式
          if (!Array.isArray(question.options) || question.options.length !== 4) {
            formatValid = false;
            formatErrors.push(`题目${index + 1}: 选项不是4个元素的数组`);
          } else {
            // 检查选项是否以A., B., C., D.开头
            const expectedPrefixes = ['A.', 'B.', 'C.', 'D.'];
            question.options.forEach((option, optionIndex) => {
              if (!option.startsWith(expectedPrefixes[optionIndex])) {
                formatValid = false;
                formatErrors.push(`题目${index + 1}: 选项${optionIndex + 1}格式错误: "${option}"`);
              }
            });
          }
          
          // 检查正确答案格式
          if (!['A', 'B', 'C', 'D'].includes(question.correctAnswer)) {
            formatValid = false;
            formatErrors.push(`题目${index + 1}: 正确答案格式错误: "${question.correctAnswer}"`);
          }
          
          // 检查词汇格式
          if (!Array.isArray(question.vocabularyWords)) {
            formatValid = false;
            formatErrors.push(`题目${index + 1}: vocabularyWords不是数组`);
          } else {
            question.vocabularyWords.forEach((word, wordIndex) => {
              if (typeof word !== 'string') {
                formatValid = false;
                formatErrors.push(`题目${index + 1}: 词汇${wordIndex + 1}不是字符串: ${typeof word}`);
              }
            });
          }
        });
        
        if (formatValid) {
          console.log('   ✅ 格式验证通过');
        } else {
          console.log('   ❌ 格式验证失败:');
          formatErrors.forEach(error => console.log(`     - ${error}`));
        }
        
        // 显示第一题的详细信息
        if (practiceGroup.questions.length > 0) {
          const firstQuestion = practiceGroup.questions[0];
          console.log(`   示例题目:`);
          console.log(`     内容: ${firstQuestion.content}`);
          console.log(`     选项: ${JSON.stringify(firstQuestion.options)}`);
          console.log(`     正确答案: "${firstQuestion.correctAnswer}"`);
          console.log(`     词汇: ${JSON.stringify(firstQuestion.vocabularyWords)}`);
        }
        
      } catch (error) {
        console.log(`❌ 生成失败: ${error.response?.data?.error || error.message}`);
        if (error.response?.data?.stack) {
          console.log(`   错误堆栈: ${error.response.data.stack.split('\n')[0]}`);
        }
      }
    }
    
    console.log('\n🎉 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.response?.data || error.message);
  }
}

// 运行测试
console.log('Starting test...');
testAIFormatFix().then(() => {
  console.log('Test completed successfully');
}).catch((error) => {
  console.error('Test failed:', error);
});