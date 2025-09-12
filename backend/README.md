# Telecom Customer Service Backend

Express.js backend with PostgreSQL for the telecom customer service application.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Setup:**
   - Copy `.env.example` to `.env`
   - Update the database connection string and other environment variables

3. **Database Setup:**
   ```bash
   # Initialize the database and create tables
   npm run init-db
   ```

4. **Start the server:**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

## Default Users

After running `npm run init-db`, these test users will be created:

- **Admin**: admin@gmail.com / admin123
- **Employee**: employee@gmail.com / employee123  
- **Customer**: customer@gmail.com / customer123

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/:userId/role` - Update user role (admin only)
- `DELETE /api/users/:userId` - Delete user (admin only)

### Tickets
- `GET /api/tickets` - Get tickets
- `POST /api/tickets` - Create ticket
- `GET /api/tickets/:ticketId` - Get ticket by ID
- `PUT /api/tickets/:ticketId` - Update ticket (admin/employee only)
- `GET /api/tickets/:ticketId/messages` - Get ticket messages
- `POST /api/tickets/:ticketId/messages` - Add ticket message

### Service Requests
- `GET /api/services` - Get service requests
- `POST /api/services` - Create service request
- `GET /api/services/:serviceId` - Get service request by ID
- `PUT /api/services/:serviceId` - Update service request (admin/employee only)

### Subscriptions
- `GET /api/subscriptions` - Get subscriptions
- `POST /api/subscriptions` - Create subscription
- `GET /api/subscriptions/:subscriptionId` - Get subscription by ID
- `PUT /api/subscriptions/:subscriptionId` - Update subscription

### Payments
- `GET /api/payments` - Get payments
- `POST /api/payments` - Create payment
- `GET /api/payments/:paymentId` - Get payment by ID
- `PUT /api/payments/:paymentId/status` - Update payment status (admin only)

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications` - Create notification (admin only)
- `PUT /api/notifications/:notificationId/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all notifications as read
- `GET /api/notifications/unread-count` - Get unread notification count
- `DELETE /api/notifications/:notificationId` - Delete notification

### Complaints
- `GET /api/complaints` - Get complaints
- `POST /api/complaints` - Create complaint
- `GET /api/complaints/:complaintId` - Get complaint by ID
- `PUT /api/complaints/:complaintId/status` - Update complaint status (admin/employee only)

## Database Schema

The application uses PostgreSQL with the following main tables:

- `users` - User accounts and profiles
- `tickets` - Support tickets
- `ticket_messages` - Messages within tickets
- `service_requests` - Service appointment requests
- `subscriptions` - User subscriptions
- `payments` - Payment records
- `notifications` - User notifications
- `complaints` - Customer complaints

## Security Features

- JWT authentication
- Password hashing with bcrypt
- Role-based access control
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation and sanitization

## Development

The server runs on port 5000 by default. Use `npm run dev` for development with auto-reload.

For production deployment, make sure to:
1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Configure proper CORS origins
4. Use SSL for database connections