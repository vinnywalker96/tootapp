import { toast } from 'react-toastify';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.messageHandlers = {};
    this.connectionPromise = null;
    this.connectionPromiseResolve = null;
    this.connectionPromiseReject = null;
  }

  /**
   * Connect to the WebSocket server
   * @param {string} token - JWT token for authentication
   * @returns {Promise} - Resolves when connected, rejects on error
   */
  connect(token) {
    if (this.socket && this.isConnected) {
      console.log('WebSocket already connected');
      return Promise.resolve();
    }

    // Create a new promise for connection
    this.connectionPromise = new Promise((resolve, reject) => {
      this.connectionPromiseResolve = resolve;
      this.connectionPromiseReject = reject;
    });

    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = process.env.REACT_APP_WS_HOST || window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/ws/toota/?token=${token}`;

      console.log(`Connecting to WebSocket at ${wsUrl}`);
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.connectionPromiseReject(error);
    }

    return this.connectionPromise;
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.socket) {
      // Clear any reconnect timeout
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      // Close the connection
      this.socket.close(1000, 'User disconnected');
      this.socket = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
      console.log('WebSocket disconnected by user');
    }
  }

  /**
   * Send a message to the WebSocket server
   * @param {string} type - Message type
   * @param {object} data - Message data
   * @returns {boolean} - True if sent successfully, false otherwise
   */
  sendMessage(type, data) {
    if (!this.socket || !this.isConnected) {
      console.error('Cannot send message: WebSocket not connected');
      return false;
    }

    try {
      const message = JSON.stringify({
        type,
        data
      });
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  /**
   * Register a handler for a specific message type
   * @param {string} messageType - Type of message to handle
   * @param {function} handler - Handler function
   */
  registerHandler(messageType, handler) {
    if (!this.messageHandlers[messageType]) {
      this.messageHandlers[messageType] = [];
    }
    this.messageHandlers[messageType].push(handler);
  }

  /**
   * Unregister a handler for a specific message type
   * @param {string} messageType - Type of message
   * @param {function} handler - Handler function to remove
   */
  unregisterHandler(messageType, handler) {
    if (this.messageHandlers[messageType]) {
      this.messageHandlers[messageType] = this.messageHandlers[messageType].filter(
        h => h !== handler
      );
    }
  }

  /**
   * Handle WebSocket open event
   */
  handleOpen() {
    console.log('WebSocket connection established');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Resolve the connection promise
    if (this.connectionPromiseResolve) {
      this.connectionPromiseResolve();
    }
  }

  /**
   * Handle WebSocket message event
   * @param {MessageEvent} event - WebSocket message event
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      const { type, data } = message;

      console.log(`Received WebSocket message of type: ${type}`);

      // Call all registered handlers for this message type
      if (this.messageHandlers[type]) {
        this.messageHandlers[type].forEach(handler => {
          try {
            handler(data);
          } catch (handlerError) {
            console.error(`Error in handler for message type ${type}:`, handlerError);
          }
        });
      }

      // Handle error messages
      if (type === 'error') {
        console.error('WebSocket error message:', data);
        toast.error(`WebSocket error: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error, event.data);
    }
  }

  /**
   * Handle WebSocket close event
   * @param {CloseEvent} event - WebSocket close event
   */
  handleClose(event) {
    this.isConnected = false;
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);

    // Reject the connection promise if it's still pending
    if (this.connectionPromiseReject) {
      this.connectionPromiseReject(new Error(`Connection closed: ${event.code} ${event.reason}`));
    }

    // Attempt to reconnect if not closed cleanly and not manually disconnected
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimeout = setTimeout(() => {
        // Get the token from localStorage
        const token = localStorage.getItem('token');
        if (token) {
          this.connect(token).catch(error => {
            console.error('Reconnection failed:', error);
          });
        } else {
          console.error('Cannot reconnect: No authentication token available');
        }
      }, delay);
    }
  }

  /**
   * Handle WebSocket error event
   * @param {Event} error - WebSocket error event
   */
  handleError(error) {
    console.error('WebSocket error:', error);
    
    // Reject the connection promise if it's still pending
    if (this.connectionPromiseReject) {
      this.connectionPromiseReject(error);
    }
  }

  /**
   * Send a chat message
   * @param {number} tripId - Trip ID
   * @param {string} content - Message content
   * @returns {boolean} - True if sent successfully
   */
  sendChatMessage(tripId, content) {
    return this.sendMessage('chat.message', { trip_id: tripId, content });
  }

  /**
   * Send a bid for a trip
   * @param {number} tripId - Trip ID
   * @param {number} amount - Bid amount
   * @returns {boolean} - True if sent successfully
   */
  sendBid(tripId, amount) {
    return this.sendMessage('bid.create', { trip_id: tripId, amount });
  }

  /**
   * Accept a bid
   * @param {number} bidId - Bid ID
   * @returns {boolean} - True if sent successfully
   */
  acceptBid(bidId) {
    return this.sendMessage('bid.accept', { bid_id: bidId });
  }

  /**
   * Update trip status
   * @param {number} tripId - Trip ID
   * @param {string} status - New status
   * @returns {boolean} - True if sent successfully
   */
  updateTripStatus(tripId, status) {
    return this.sendMessage('trip.status_update', { trip_id: tripId, status });
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService();
export default webSocketService;

