import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import webSocketService from '../services/WebSocketService';
import { useAuth } from '../context/AuthContext';

const ChatWindow = ({ trip }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    // Load existing messages for this trip
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/trips/${trip.id}/messages/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
          // Scroll to bottom after messages load
          setTimeout(scrollToBottom, 100);
        } else {
          console.error('Failed to fetch messages');
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    
    if (trip && trip.id) {
      fetchMessages();
    }
    
    // Register WebSocket handler for chat messages
    const handleChatMessage = (data) => {
      if (data.trip_id === trip.id) {
        setMessages(prevMessages => [...prevMessages, {
          id: data.id,
          trip_id: data.trip_id,
          sender_id: data.sender_id,
          sender_name: data.sender_name,
          content: data.content,
          timestamp: data.timestamp
        }]);
        
        // Scroll to bottom when new message arrives
        setTimeout(scrollToBottom, 100);
      }
    };
    
    webSocketService.registerHandler('chat.message', handleChatMessage);
    
    // Cleanup
    return () => {
      webSocketService.unregisterHandler('chat.message', handleChatMessage);
    };
  }, [trip]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      return;
    }
    
    setLoading(true);
    
    // Send message via WebSocket
    const success = webSocketService.sendChatMessage(trip.id, newMessage.trim());
    
    if (success) {
      setNewMessage('');
    } else {
      toast.error('Failed to send message. Please try again.');
    }
    
    setLoading(false);
  };
  
  // Only show chat if trip is accepted or in progress
  if (!trip || !['ACCEPTED', 'IN_PROGRESS'].includes(trip.status)) {
    return null;
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4 flex flex-col h-96">
      <h3 className="text-lg font-semibold mb-3">Chat</h3>
      
      {/* Messages area */}
      <div className="flex-grow overflow-y-auto mb-4 p-2 bg-gray-50 rounded">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No messages yet</p>
        ) : (
          <div className="space-y-3">
            {messages.map(message => {
              const isCurrentUser = message.sender_id === user.id;
              
              return (
                <div 
                  key={message.id} 
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-3/4 rounded-lg px-4 py-2 ${
                      isCurrentUser 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <div className="text-sm font-medium mb-1">
                      {isCurrentUser ? 'You' : message.sender_name}
                    </div>
                    <div>{message.content}</div>
                    <div className="text-xs mt-1 opacity-75">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Message input */}
      <form onSubmit={handleSendMessage} className="flex">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !newMessage.trim()}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-md disabled:bg-blue-300"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;

