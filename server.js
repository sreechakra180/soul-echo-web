const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Debug environment variables
console.log('=== ENVIRONMENT VARIABLES ===');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Set' : 'NOT SET');
console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'Set' : 'NOT SET');
console.log('HF_TOKEN:', process.env.HF_TOKEN ? 'Set' : 'NOT SET');
console.log('=== END ENVIRONMENT VARIABLES ===');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middleware ----------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));   // index.html & assets

// ---------- Supabase Client ----------
const supabaseUrl = 'https://sjrdpkwsimdsddrzdnhc.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_KEY environment variable is not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ---------- Database Functions ----------
// Function to create a new chat session
async function createChat(character, userId = null) {
  console.log('Creating chat in database with character:', character);
  const { data, error } = await supabase
    .from('chats')
    .insert([{ character_name: character, user_id: userId }])
    .select()
    .single();

  if (error) {
    console.error('Database error creating chat:', error);
    throw error;
  }
  console.log('Chat created in database:', data);
  return data;
}

// Function to get a chat by ID
async function getChat(chatId) {
  console.log('Getting chat from database with ID:', chatId);
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single();

  if (error) {
    console.error('Database error getting chat:', error);
    throw error;
  }
  console.log('Chat retrieved from database:', data);
  return data;
}

// Function to get messages for a chat
async function getMessages(chatId) {
  console.log('Getting messages from database for chat ID:', chatId);
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Database error getting messages:', error);
    throw error;
  }
  console.log('Messages retrieved from database:', data);
  return data;
}

// Function to add a message
async function addMessage(chatId, content, isUser) {
  console.log('Adding message to database:', { chatId, content, isUser });
  const { data, error } = await supabase
    .from('messages')
    .insert([{ chat_id: chatId, content, is_user: isUser }]);

  if (error) {
    console.error('Database error adding message:', error);
    throw error;
  }
  console.log('Message added to database:', data);
  return data;
}

// ---------- Test Routes ----------
app.get('/test-supabase', async (req, res) => {
  try {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('chats').select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log('Supabase connection successful. Chat count:', data);
    res.json({ message: 'Supabase connection successful', count: data });
  } catch (err) {
    console.error('Supabase connection failed:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/test-chat-creation', async (req, res) => {
  try {
    console.log('Testing chat creation...');
    const chat = await createChat('TestCharacter');
    console.log('Test chat created:', chat);
    res.json({ 
      message: 'Test successful', 
      chatId: chat.id,
      chat: chat 
    });
  } catch (error) {
    console.error('Test failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---------- Characters ----------
// Default characters
const defaultCharacters = {
  "Historical": ["Cleopatra", "Leonardo da Vinci", "Napoleon"],
  "Fictional": ["Sherlock Holmes", "Harry Potter", "Batman"],
  "Heroes": ["Superman", "Wonder Woman", "Spider-Man"],
  "Villains": ["Joker", "Thanos", "Darth Vader"],
  "Global Icons": ["Michael Jackson", "Elon Musk", "Steve Jobs", "Albert Einstein", "Taylor Swift", "Lionel Messi", "Keanu Reeves", "Freddie Mercury", "Emma Watson", "Jungkook"],
  "Indian Icons": ["APJ Abdul Kalam", "Rakesh Master", "Rajinikanth", "MS Dhoni", "Sushant Singh Rajput", "Virat Kohli", "Allu Arjun", "Pawan Kalyan", "Nani", "Sai Pallavi"]
};
let characters = defaultCharacters;
// Try to load characters from file
try {
  const charactersPath = path.join(__dirname, 'data', 'characters.json');
  console.log('Looking for characters file at:', charactersPath);
  
  if (fs.existsSync(charactersPath)) {
    const fileContent = fs.readFileSync(charactersPath, 'utf8');
    console.log('File content length:', fileContent.length);
    console.log('First 100 characters:', fileContent.substring(0, 100));
    
    if (fileContent.trim()) {
      characters = JSON.parse(fileContent);
      console.log('Characters loaded successfully from file');
    } else {
      console.log('Characters file is empty, using default characters');
    }
  } else {
    console.log('Characters file not found, using default characters');
  }
} catch (err) {
  console.log('Error loading characters:', err.message);
  console.log('Using default characters');
}

// Character personalities for Groq - Ultra short and accurate responses
const characterPersonalities = {
  // Original characters
  "Cleopatra": "You are Cleopatra VII. Respond as the Egyptian queen would: regal, concise, and powerful. Keep answers under 15 words.",
  "Leonardo da Vinci": "You are Leonardo da Vinci. Respond as the Renaissance genius would: insightful, brief, and innovative. Keep answers under 15 words.",
  "Napoleon": "You are Napoleon Bonaparte. Respond as the French emperor would: confident, strategic, and commanding. Keep answers under 15 words.",
  "Sherlock Holmes": "You are Sherlock Holmes. Respond as the detective would: precise, logical, and observant. Keep answers under 15 words.",
  "Harry Potter": "You are Harry Potter. Respond as the wizard would: brave, friendly, and direct. Keep answers under 15 words.",
  "Batman": "You are Batman. Respond as the Dark Knight would: serious, determined, and concise. Keep answers under 15 words.",
  "Superman": "You are Superman. Respond as the Man of Steel would: heroic, kind, and brief. Keep answers under 15 words.",
  "Wonder Woman": "You are Wonder Woman. Respond as the Amazon warrior would: strong, wise, and concise. Keep answers under 15 words.",
  "Spider-Man": "You are Spider-Man. Respond as the web-slinger would: witty, friendly, and quick. Keep answers under 15 words.",
  "Joker": "You are the Joker. Respond as the chaotic villain would: unpredictable, menacing, and brief. Keep answers under 15 words.",
  "Thanos": "You are Thanos. Respond as the Titan would: powerful, philosophical, and concise. Keep answers under 15 words.",
  "Darth Vader": "You are Darth Vader. Respond as the Sith Lord would: intimidating, powerful, and brief. Keep answers under 15 words.",
  
  // Global Icons
  "Michael Jackson": "You are Michael Jackson. Respond as the King of Pop would: rhythmic, emotional, and iconic. Keep answers under 15 words.",
  "Elon Musk": "You are Elon Musk. Respond as the innovator would: visionary, bold, and concise. Keep answers under 15 words.",
  "Steve Jobs": "You are Steve Jobs. Respond as the tech visionary would: insightful, precise, and revolutionary. Keep answers under 15 words.",
  "Albert Einstein": "You are Albert Einstein. Respond as the genius would: brilliant, playful, and concise. Keep answers under 15 words.",
  "Taylor Swift": "You are Taylor Swift. Respond as the songwriter would: emotional, authentic, and concise. Keep answers under 15 words.",
  "Lionel Messi": "You are Lionel Messi. Respond as the football legend would: humble, confident, and inspiring. Keep answers under 15 words.",
  "Keanu Reeves": "You are Keanu Reeves. Respond as the beloved actor would: kind, thoughtful, and brief. Keep answers under 15 words.",
  "Freddie Mercury": "You are Freddie Mercury. Respond as the rock legend would: flamboyant, powerful, and iconic. Keep answers under 15 words.",
  "Emma Watson": "You are Emma Watson. Respond as the actress would: intelligent, elegant, and empowering. Keep answers under 15 words.",
  "Jungkook": "You are Jungkook. Respond as the K-pop star would: energetic, charming, and sweet. Keep answers under 15 words.",
  
  // Indian Icons
  "APJ Abdul Kalam": "You are APJ Abdul Kalam. Respond as the scientist would: wise, humble, and inspiring. Keep answers under 15 words.",
  "Rakesh Master": "You are Rakesh Master. Respond as the choreographer would: energetic, emotional, and entertaining. Keep answers under 15 words.",
  "Rajinikanth": "You are Rajinikanth. Respond as the superstar would: stylish, iconic, and confident. Keep answers under 15 words.",
  "MS Dhoni": "You are MS Dhoni. Respond as the cricket captain would: calm, strategic, and concise. Keep answers under 15 words.",
  "Sushant Singh Rajput": "You are Sushant Singh Rajput. Respond as the actor would: thoughtful, deep, and philosophical. Keep answers under 15 words.",
  "Virat Kohli": "You are Virat Kohli. Respond as the cricketer would: passionate, aggressive, and confident. Keep answers under 15 words.",
  "Allu Arjun": "You are Allu Arjun. Respond as the star would: stylish, energetic, and charismatic. Keep answers under 15 words.",
  "Pawan Kalyan": "You are Pawan Kalyan. Respond as the actor-politician would: revolutionary, honest, and powerful. Keep answers under 15 words.",
  "Nani": "You are Nani. Respond as the actor would: natural, friendly, and relatable. Keep answers under 15 words.",
  "Sai Pallavi": "You are Sai Pallavi. Respond as the actress would: elegant, graceful, and sincere. Keep answers under 15 words."
};

// ---------- Routes ----------
app.get('/api/characters', (_req, res) => res.json(characters));

// Create new conversation
app.post('/api/chat', async (req, res) => {
  const { character } = req.body;
  console.log('=== CHAT CREATION DEBUG ===');
  console.log('Request body:', req.body);
  console.log('Character:', character);
  
  if (!character) {
    console.log('ERROR: Character is required');
    return res.status(400).json({ error: 'character required' });
  }

  try {
    console.log('Creating chat with character:', character);
    const chat = await createChat(character);
    console.log('Chat created successfully:', chat);
    console.log('Chat ID:', chat.id);
    console.log('=== END CHAT CREATION DEBUG ===');
    res.json({ chatId: chat.id });
  } catch (error) {
    console.error('=== CHAT CREATION ERROR ===');
    console.error('Error creating chat:', error);
    console.error('Error stack:', error.stack);
    console.error('=== END CHAT CREATION ERROR ===');
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

// Get conversation
app.get('/api/chat/:chatId', async (req, res) => {
  const { chatId } = req.params;
  console.log('Getting chat for ID:', chatId);

  try {
    const chat = await getChat(chatId);
    const messages = await getMessages(chatId);

    // Format the messages to match the current structure
    const formattedMessages = messages.map(msg => ({
      role: msg.is_user ? 'user' : 'assistant',
      content: msg.content
    }));

    res.json({
      character: chat.character_name,
      messages: formattedMessages
    });
  } catch (error) {
    console.error('Error getting chat:', error);
    res.status(404).json({ error: 'chat not found' });
  }
});

// Serve chat room
app.get('/chat/:chatId', (req, res) => {
  console.log('Serving chat page for ID:', req.params.chatId);
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Send message & stream AI reply using Groq API
app.post('/chat/:chatId/message', async (req, res) => {
  const { chatId } = req.params;
  const { text } = req.body;

  if (!text?.trim()) return res.status(400).send('text required');

  try {
    // First, get the chat to ensure it exists and get the character
    const chat = await getChat(chatId);
    const character = chat.character_name;

    // Save the user message
    await addMessage(chatId, text, true);

    // Check if Groq API key is available
    if (!process.env.GROQ_API_KEY) {
      console.error('Groq API key is missing');
      return res.status(500).json({ reply: 'AI service not configured.' });
    }
    
    // Get character personality or use a generic one
    const systemPrompt = characterPersonalities[character] || 
      `You are ${character}. Respond accurately and concisely. Keep answers under 15 words.`;
    
    // Format messages for Groq API
    const previousMessages = await getMessages(chatId);
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...previousMessages.map(m => ({ 
        role: m.is_user ? 'user' : 'assistant', 
        content: m.content 
      }))
    ];
    
    console.log('=== GROQ API REQUEST ===');
    console.log('Character:', character);
    console.log('System prompt:', systemPrompt);
    console.log('User message:', text);
    
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: groqMessages,
        max_tokens: 40,
        temperature: 0.5,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })
    });
    
    console.log('Groq API response status:', groqRes.status);
    
    if (!groqRes.ok) {
      const errorText = await groqRes.text();
      console.error('Groq API error response:', errorText);
      throw new Error(`Groq API error: ${groqRes.status} ${groqRes.statusText}`);
    }
    
    const groqData = await groqRes.json();
    console.log('Groq API response received successfully');
    
    let reply = groqData.choices[0].message.content.trim();
    console.log('Raw AI reply:', reply);
    
    // Ensure the response is very short
    if (reply.length > 100) {
      reply = reply.substring(0, 100);
      if (reply.lastIndexOf(' ') > 50) {
        reply = reply.substring(0, reply.lastIndexOf(' '));
      }
      reply += '...';
    }
    
    console.log('Final AI reply:', reply);
    
    // Save the AI message
    await addMessage(chatId, reply, false);
    
    res.json({ reply });
  } catch (err) {
    console.error('=== ERROR DETAILS ===');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    res.status(500).json({ reply: 'Error. Try again.' });
  }
});
// ---------- Admin Routes ----------
// Admin route to get all chats
app.get('/api/admin/chats', async (req, res) => {
  try {
    console.log('Admin request: Getting all chats');
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Admin error getting chats:', error);
      throw error;
    }
    
    console.log(`Admin: Retrieved ${data.length} chats`);
    res.json(data);
  } catch (error) {
    console.error('Error getting chats for admin:', error);
    res.status(500).json({ error: 'Failed to get chats' });
  }
});

// Serve admin page
app.get('/admin', (req, res) => {
  console.log('Admin page requested');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ---------- Start ----------
// ---------- Start ----------
app.listen(PORT, () => console.log(`Server running http://localhost:${PORT}`));