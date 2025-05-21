# TootApp - Transportation Platform

TootApp is a comprehensive transportation platform that connects users with drivers for efficient and reliable transportation services.

## Features

- User and driver authentication
- Trip management
- Real-time bidding system
- Live chat between users and drivers
- SMS notifications
- Payment processing
- Driver ratings and reviews
- WebSocket support for real-time updates

## Tech Stack

### Backend
- Django 4.2
- Django REST Framework
- Django Channels (WebSockets)
- PostgreSQL
- Redis (for WebSocket channel layers)
- Africa's Talking API (for SMS)

### Frontend
- React
- Tailwind CSS
- React Router
- React Icons
- WebSocket API

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL
- Redis

### Backend Setup

1. Navigate to the server directory:
   ```
   cd server
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Create a `.env` file in the server directory with the following variables:
   ```
   DEBUG=True
   SECRET_KEY=your_secret_key
   DATABASE_URL=postgres://user:password@localhost:5432/tootapp
   REDIS_URL=redis://localhost:6379/0
   AT_USERNAME=your_africastalking_username
   AT_API_KEY=your_africastalking_api_key
   ```

6. Run migrations:
   ```
   python manage.py migrate
   ```

7. Create a superuser:
   ```
   python manage.py createsuperuser
   ```

8. Start the development server:
   ```
   python manage.py runserver
   ```

### Frontend Setup

1. Navigate to the client directory:
   ```
   cd client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the client directory with the following variables:
   ```
   VITE_API_URL=http://localhost:8000/api
   VITE_WS_URL=ws://localhost:8000/ws
   ```

4. Start the development server:
   ```
   npm run dev
   ```

## WebSocket Testing

You can test the WebSocket functionality using the provided test script:

```
cd server
python websocket_test.py
```

## API Documentation

API documentation is available at:
- Swagger UI: `http://localhost:8000/swagger/`
- ReDoc: `http://localhost:8000/redoc/`

## SMS Notifications

The platform uses Africa's Talking API for SMS notifications. To enable this feature:

1. Sign up for an account at [Africa's Talking](https://africastalking.com/)
2. Get your API key and username
3. Add them to your `.env` file as shown above

## Deployment

### Backend Deployment

1. Set up a production-ready database (PostgreSQL)
2. Set up Redis for WebSocket channel layers
3. Configure environment variables for production
4. Collect static files: `python manage.py collectstatic`
5. Use Gunicorn and Daphne for serving the application
6. Set up NGINX as a reverse proxy

### Frontend Deployment

1. Build the frontend: `npm run build`
2. Serve the built files using NGINX or a similar web server

## License

This project is licensed under the MIT License - see the LICENSE file for details.

