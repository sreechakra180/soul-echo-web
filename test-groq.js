const fetch = require('node-fetch');
require('dotenv').config();

async function testGroqAPI() {
  try {
    console.log('Testing Groq API...');
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello, can you tell me a joke?' }
        ],
        max_tokens: 100
      })
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Response data:', data);
    console.log('AI reply:', data.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testGroqAPI();