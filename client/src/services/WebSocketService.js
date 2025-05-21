import { getAccessToken } from './AuthService';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.callbacks = {};
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.baseReconnectDelay = 1000; // Start with 1 second delay
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.socket && this.isConnected) {
        resolve();
        return;
      }

      const token = getAccessToken();
      if (!token) {
        reject(new Error('No authentication token available'));
        return;
      }

      // Determine WebSocket URL based on environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.NODE_ENV === 'production' 
        ? window.location.host
        : 'localhost:8000';
      
      const wsUrl = `${protocol}//${host}/ws/toota/?token=${token}`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
        this.isConnected = false;
        this.attemptReconnect();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnection attempts reached');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`Attempting to reconnect in ${delay}ms...`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    }
  }

  send(type, data) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        this.connect()
          .then(() => this.sendMessage(type, data, resolve, reject))
          .catch(reject);
      } else {
        this.sendMessage(type, data, resolve, reject);
      }
    });
  }

  sendMessage(type, data, resolve, reject) {
    try {
      const message = JSON.stringify({ type, data });
      this.socket.send(message);
      resolve();
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      reject(error);
    }
  }

  handleMessage(data) {
    const messageType = data.type;
    
    if (messageType === 'echo.message') {
      const innerType = data.data?.type;
      const innerData = data.data?.data;
      
      if (innerType && this.callbacks[innerType]) {
        this.callbacks[innerType].forEach(callback => callback(innerData));
      }
    } else if (messageType === 'error') {
      console.error('WebSocket error message:', data.data?.message);
      
      // Notify error subscribers
      if (this.callbacks['error']) {
        this.callbacks['error'].forEach(callback => callback(data.data));
      }
    } else if (this.callbacks[messageType]) {
      this.callbacks[messageType].forEach(callback => callback(data.data));
    }
  }

  subscribe(type, callback) {
    if (!this.callbacks[type]) {
      this.callbacks[type] = [];
    }
    this.callbacks[type].push(callback);
    
    // Connect if not already connected
    if (!this.isConnected) {
      this.connect().catch(error => {
        console.error('Connection failed during subscription:', error);
      });
    }
    
    // Return unsubscribe function
    return () => {
      this.callbacks[type] = this.callbacks[type].filter(cb => cb !== callback);
    };
  }

  // Trip-related methods
  createTrip(tripData) {
    return this.send('create.trip', tripData);
  }

  updateTrip(tripData) {
    return this.send('update.trip', tripData);
  }

  // Bidding-related methods
  createBid(tripId, amount) {
    return this.send('create.bid', { trip_id: tripId, amount });
  }

  acceptBid(bidId) {
    return this.send('accept.bid', { bid_id: bidId });
  }

  // Chat-related methods
  sendMessage(tripId, message) {
    return this.send('chat.message', { trip_id: tripId, message });
  }

  fetchMessages(tripId, limit = 50) {
    return this.send('fetch.messages', { trip_id: tripId, limit });
  }

  markMessagesAsRead(tripId) {
    return this.send('mark.messages.read', { trip_id: tripId });
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService();
export default webSocketService;

