import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaSpinner } from 'react-icons/fa';
import webSocketService from '../../services/WebSocketService';
import { getAccessToken } from '../../services/AuthService';
import { jwtDecode } from 'jwt-decode';

const ChatWindow = ({ tripId, userType }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const messagesEndRef = useRef(null);
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Get user ID from token
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.user_id || decoded.id);
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
  }, []);
  
  // Connect to WebSocket and fetch messages
  useEffect(() => {
    if (!tripId) return;
    
    setLoading(true);
    
    // Connect to WebSocket
    webSocketService.connect()
      .then(() => {
        // Fetch message history
        webSocketService.fetchMessages(tripId)
          .then(() => {
            setLoading(false);
          })
          .catch(error => {
            console.error('Error fetching messages:', error);
            setError('Failed to load message history');
            setLoading(false);
          });
        
        // Mark messages as read
        webSocketService.markMessagesAsRead(tripId)
          .catch(error => {
            console.error('Error marking messages as read:', error);
          });
      })
      .catch(error => {
        console.error('WebSocket connection error:', error);
        setError('Failed to connect to chat service');
        setLoading(false);
      });
    
    // Subscribe to new messages
    const unsubscribe = webSocketService.subscribe('chat.history', (data) => {
      if (data.trip_id === tripId) {
        setMessages(data.messages.reverse()); // Reverse to show newest at bottom
      }
    });
    
    // Subscribe to incoming messages
    const messageUnsubscribe = webSocketService.subscribe('chat.message', (data) => {
      if (data.trip_id === tripId) {
        setMessages(prevMessages => [...prevMessages, data]);
        
        // Mark message as read if it's not from current user
        if (data.sender_id !== userId) {
          webSocketService.markMessagesAsRead(tripId)
            .catch(error => {
              console.error('Error marking messages as read:', error);
            });
        }
      }
    });
    
    // Subscribe to error messages
    const errorUnsubscribe = webSocketService.subscribe('error', (data) => {
      setError(data.message || 'An error occurred');
    });
    
    return () => {
      unsubscribe();
      messageUnsubscribe();
      errorUnsubscribe();
    };
  }, [tripId, userId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    webSocketService.sendMessage(tripId, newMessage)
      .then(() => {
        setNewMessage('');
      })
      .catch(error => {
        console.error('Error sending message:', error);
        setError('Failed to send message');
      });
  };
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg text-red-500 text-center">
        <p>{error}</p>
        <button 
          className="mt-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-[500px] bg-white rounded-lg shadow-md">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Trip Chat</h2>
        <p className="text-sm text-gray-500">
          {userType === 'driver' ? 'Chat with customer' : 'Chat with driver'}
        </p>
      </div>
      
      {/* Messages Container */}
      <div className="flex-1 p-4 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <FaSpinner className="animate-spin text-blue-500 text-2xl" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-gray-400">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = msg.sender_type === (userType === 'driver' ? 'DRIVER' : 'USER');
            
            return (
              <div 
                key={msg.id} 
                className={`mb-4 flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[70%] rounded-lg p-3 ${
                    isCurrentUser 
                      ? 'bg-blue-500 text-white rounded-br-none' 
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm">{msg.message}</p>
                  <p className={`text-xs mt-1 ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                    {formatTime(msg.created)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <form 
        onSubmit={handleSendMessage}
        className="p-4 border-t border-gray-200 flex items-center"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading || !newMessage.trim()}
        >
          <FaPaperPlane />
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;

