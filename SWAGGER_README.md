# Shfly App API - Swagger Documentation

## Overview

This project includes comprehensive Swagger/OpenAPI documentation for all API endpoints. The documentation is automatically generated from JSDoc comments in the route files and provides an interactive interface for testing and understanding the API.

## Features

- **Interactive API Documentation**: Browse and test all API endpoints
- **Request/Response Examples**: See example requests and responses for each endpoint
- **Authentication Support**: Test endpoints with JWT authentication
- **Schema Definitions**: Complete data models and validation rules
- **Search and Filter**: Easy navigation through API endpoints
- **Export Options**: Download OpenAPI specification in various formats

## Accessing the Documentation

### Development Environment
```
http://localhost:5000/api-docs
```

### Production Environment
```
https://your-domain.com/api-docs
```

## API Endpoints Documentation

### Authentication (`/api/auth`)
- **POST** `/create-admin` - Create first admin user
- **POST** `/register` - Register new user
- **POST** `/login` - User login
- **GET** `/user` - Get current user data
- **POST** `/logout` - User logout

### Users (`/api/users`)
- **GET** `/` - Get all users (Admin only)
- **GET** `/:id` - Get user by ID
- **PUT** `/:id` - Update user profile
- **DELETE** `/:id` - Delete user (Admin only)

### Categories (`/api/categories`)
- **GET** `/` - Get all active categories
- **POST** `/` - Create new category (Admin only)
- **PUT** `/:id` - Update category (Admin only)
- **DELETE** `/:id` - Delete category (Admin only)

### Consultations (`/api/consultations`)
- **GET** `/` - Get consultations with filtering
- **POST** `/` - Create new consultation
- **GET** `/:id` - Get consultation by ID
- **PUT** `/:id` - Update consultation
- **DELETE** `/:id` - Delete consultation

### Providers (`/api/providers`)
- **GET** `/` - Get all providers with search/filtering
- **POST** `/` - Create/update provider profile
- **GET** `/:id` - Get provider by ID
- **PUT** `/:id` - Update provider profile

### Seekers (`/api/seekers`)
- **GET** `/` - Get all seekers (Admin only)
- **POST** `/` - Create/update seeker profile
- **GET** `/:id` - Get seeker by ID
- **PUT** `/:id` - Update seeker profile

### Payments (`/api/payments`)
- **GET** `/` - Get payments with filtering
- **POST** `/` - Create new payment
- **GET** `/:id` - Get payment by ID
- **PUT** `/:id` - Update payment status

### Chat (`/api/chat`)
- **GET** `/` - Get chat messages for consultation
- **POST** `/` - Send chat message
- **GET** `/conversations` - Get user conversations

### Search (`/api/search`)
- **GET** `/` - Search across providers, consultations, categories
- **GET** `/providers` - Search providers specifically
- **GET** `/consultations` - Search consultations specifically

### Notifications (`/api/notifications`)
- **GET** `/` - Get user notifications
- **POST** `/` - Create notification (Admin only)
- **PUT** `/:id/read` - Mark notification as read
- **DELETE** `/:id` - Delete notification

### Upload (`/api/upload`)
- **POST** `/` - Upload files (images, documents)
- **DELETE** `/:filename` - Delete uploaded file

### Wallet (`/api/wallet`)
- **GET** `/` - Get wallet balance and transactions
- **POST** `/add-funds` - Add funds to wallet
- **POST** `/withdraw` - Withdraw funds from wallet
- **GET** `/transactions` - Get transaction history

### Admin (`/api/admin`)
- **GET** `/` - Get admin dashboard data
- **GET** `/stats` - Get system statistics
- **GET** `/reports` - Generate various reports

## Authentication

Most endpoints require JWT authentication. To authenticate:

1. **Login** using `/api/auth/login` to get a JWT token
2. **Click the "Authorize" button** in the Swagger UI
3. **Enter your token** in the format: `Bearer YOUR_JWT_TOKEN`
4. **Click "Authorize"** to apply the token to all requests

## Data Models

### User
```json
{
  "_id": "string",
  "fullname": "string",
  "username": "string",
  "email": "string",
  "userType": "admin|seeker|provider",
  "phone": "string",
  "profileImage": "string",
  "isVerified": "boolean",
  "isActive": "boolean",
  "createdAt": "date-time",
  "updatedAt": "date-time"
}
```

### Consultation
```json
{
  "_id": "string",
  "seeker": "string",
  "provider": "string",
  "category": "string",
  "title": "string",
  "description": "string",
  "status": "pending|accepted|rejected|completed|cancelled",
  "scheduledAt": "date-time",
  "duration": "number",
  "price": "number",
  "createdAt": "date-time"
}
```

### Category
```json
{
  "_id": "string",
  "name": "string",
  "description": "string",
  "icon": "string",
  "isActive": "boolean"
}
```

### Payment
```json
{
  "_id": "string",
  "consultation": "string",
  "amount": "number",
  "currency": "string",
  "status": "pending|completed|failed|refunded",
  "paymentMethod": "string",
  "transactionId": "string"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

## Success Responses

Successful responses follow this pattern:

```json
{
  "success": true,
  "message": "Success message",
  "data": {
    // Response data
  }
}
```

## Testing the API

### 1. Start the Server
```bash
cd ShflyAppAPI
npm install
npm run dev
```

### 2. Access Swagger UI
Open your browser and navigate to `http://localhost:5000/api-docs`

### 3. Test Authentication
1. Use the `/api/auth/create-admin` endpoint to create your first admin user
2. Use `/api/auth/login` to get a JWT token
3. Click "Authorize" and enter your token

### 4. Test Endpoints
- Browse through different API sections
- Try different endpoints
- Test with various request parameters
- View response schemas and examples

## Customization

### Adding New Endpoints
To document new endpoints, add JSDoc comments above your route handlers:

```javascript
/**
 * @swagger
 * /api/new-endpoint:
 *   get:
 *     summary: Endpoint summary
 *     description: Detailed description
 *     tags: [TagName]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/new-endpoint', handler);
```

### Modifying Schemas
Update the `swagger.js` file to modify global schemas and configurations.

### Styling
Customize the Swagger UI appearance by modifying the `swaggerUi.setup()` options in `server.js`.

## Troubleshooting

### Common Issues

1. **Swagger UI not loading**
   - Check if the server is running
   - Verify the `/api-docs` route is properly configured
   - Check browser console for errors

2. **JSDoc comments not recognized**
   - Ensure proper JSDoc syntax
   - Check file paths in `swagger.js` apis array
   - Restart the server after changes

3. **Authentication not working**
   - Verify JWT token format: `Bearer TOKEN`
   - Check if token is expired
   - Ensure the token is valid

### Debug Mode
Enable debug mode by setting environment variable:
```bash
DEBUG=swagger:* npm run dev
```

## Export Options

### OpenAPI Specification
Download the complete API specification:
- **JSON**: `http://localhost:5000/api-docs/swagger.json`
- **YAML**: Use Swagger UI export options

### Code Generation
Use the OpenAPI specification to generate client code in various languages:
- JavaScript/TypeScript
- Python
- Java
- C#
- Go
- And more...

## Contributing

When adding new endpoints or modifying existing ones:

1. **Update JSDoc comments** with proper Swagger annotations
2. **Add new schemas** if introducing new data models
3. **Test the documentation** in Swagger UI
4. **Update this README** if adding new features

## Support

For issues with the Swagger documentation:
1. Check the troubleshooting section
2. Review JSDoc syntax
3. Verify file configurations
4. Check server logs for errors

## License

This documentation is part of the Shfly App API project and follows the same license terms.
