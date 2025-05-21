# TootApp - Digital Platform

TootApp is a digital platform for managing trips, drivers, and users.

## Features

- User, Driver, and Admin dashboards
- Trip management
- Payment processing
- SMS notifications for new trips
- Email notifications
- Real-time updates

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 14+
- Redis (for WebSockets)
- PostgreSQL (for production)

### Backend Setup

1. Navigate to the server directory:
   ```
   cd server
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

5. Update the `.env` file with your configuration:
   - Database settings
   - Email settings
   - SMS API settings (Africa's Talking API)

6. Run migrations:
   ```
   python manage.py migrate
   ```

7. Start the development server:
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

3. Start the development server:
   ```
   npm run dev
   ```

## SMS Notification Setup

The application now includes SMS notifications for new trips. To enable this feature:

1. Sign up for an Africa's Talking account at [africastalking.com](https://africastalking.com/)
2. Get your API key and username from the dashboard
3. Add the following to your `.env` file:
   ```
   SMS_API_KEY=your_api_key
   SMS_USERNAME=your_username
   SMS_SENDER_ID=TootApp  # Optional
   ```

## Performance Improvements

The application has been optimized for better performance:

- Database queries optimized with `select_related` for foreign keys
- Efficient counting of trips by status
- Improved error handling
- Better logging configuration
- Optimized monthly trip statistics

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

