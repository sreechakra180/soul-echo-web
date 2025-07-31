const supabase = require('./supabase.js');

// Function to create a new chat session
async function createChat(character, userId = null) {
  const { data, error } = await supabase
    .from('chats')
    .insert([{ character_id: character, user_id: userId }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Function to get a chat by ID
async function getChat(chatId) {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single();

  if (error) throw error;
  return data;
}

// Function to get messages for a chat
async function getMessages(chatId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

// Function to add a message
async function addMessage(chatId, content, isUser) {
  const { data, error } = await supabase
    .from('messages')
    .insert([{ chat_id: chatId, content, is_user: isUser }]);

  if (error) throw error;
  return data;
}

module.exports = {
  createChat,
  getChat,
  getMessages,
  addMessage
};
