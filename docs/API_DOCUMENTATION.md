# Aldeia Chatbot - API Documentation

**Version**: 1.0.0
**Last Updated**: January 6, 2025
**Base URL**: `https://api.aldeia.com/api` (Production) | `http://localhost:3001/api` (Development)

---

## Table of Contents

1. [Authentication](#authentication)
2. [API Response Format](#api-response-format)
3. [Error Codes](#error-codes)
4. [Rate Limiting](#rate-limiting)
5. [Authentication Endpoints](#authentication-endpoints)
6. [Chat Endpoints](#chat-endpoints)
7. [Billing Endpoints](#billing-endpoints)
8. [Documents Endpoints](#documents-endpoints)
9. [Admin Endpoints](#admin-endpoints)
10. [Webhooks](#webhooks)

---

## Authentication

Most endpoints require authentication using JWT (JSON Web Tokens). Include the access token in the `Authorization` header:

```http
Authorization: Bearer <access_token>
```

### Token Types

1. **Access Token**: Short-lived token (24 hours) for API requests
2. **Refresh Token**: Long-lived token (30 days) for obtaining new access tokens

### Authentication Flow

1. Register or login to receive tokens
2. Include access token in `Authorization` header for protected endpoints
3. When access token expires, use refresh token to get new access token
4. If refresh token expires, user must log in again

---

## API Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

---

## Error Codes

| Status Code | Meaning |
|-------------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input or missing required fields |
| 401 | Unauthorized - Missing or invalid authentication token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |
| 503 | Service Unavailable - Service temporarily unavailable |

---

## Rate Limiting

Rate limits are applied per user/IP address:

- **API Endpoints**: 100 requests per 15 minutes
- **General Endpoints**: 200 requests per 15 minutes

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

---

## Authentication Endpoints

### POST /auth/register

Register a new user account.

**Authentication**: None required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "county": "LA County"
}
```

**Validation Rules**:
- `email`: Required, valid email format
- `password`: Required, minimum 8 characters
- `name`: Required
- `county`: Optional

**Success Response** (201):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123abc",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "county": "LA County",
      "createdAt": "2025-01-06T10:00:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "message": "User registered successfully"
}
```

**Error Responses**:
- 400: Invalid input (email format, password length)
- 409: User with this email already exists

---

### POST /auth/login

Authenticate user and receive tokens.

**Authentication**: None required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123abc",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "message": "Login successful"
}
```

**Error Responses**:
- 400: Email and password are required
- 401: Invalid email or password
- 403: Account deactivated

---

### POST /auth/refresh

Refresh access token using refresh token.

**Authentication**: None required

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123abc",
      "email": "user@example.com",
      "role": "user"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "message": "Token refreshed successfully"
}
```

**Error Responses**:
- 400: Refresh token is required
- 401: Invalid or expired refresh token

---

### GET /auth/profile

Get authenticated user's profile information.

**Authentication**: Required

**Request Headers**:
```http
Authorization: Bearer <access_token>
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "user_123abc",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "county": "LA County",
    "language": "en",
    "createdAt": "2025-01-06T10:00:00Z"
  }
}
```

**Error Responses**:
- 401: Missing or invalid authentication token
- 404: User not found

---

### POST /auth/change-password

Change user's password.

**Authentication**: Required

**Request Body**:
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Password changed successfully. Please log in again."
}
```

**Error Responses**:
- 400: Current password and new password are required
- 400: New password must be at least 8 characters
- 401: Current password is incorrect

---

### POST /auth/logout

Logout user and invalidate refresh token.

**Authentication**: Required

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### POST /auth/logout-all

Logout user from all sessions.

**Authentication**: Required

**Success Response** (200):
```json
{
  "success": true,
  "message": "Logged out from all sessions successfully"
}
```

---

### GET /auth/verify

Verify if access token is valid.

**Authentication**: Required

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "userId": "user_123abc",
      "email": "user@example.com",
      "role": "user"
    }
  }
}
```

**Error Responses**:
- 401: Invalid or expired token

---

## Chat Endpoints

### POST /chat

Send a message to the chatbot and receive a response.

**Authentication**: Required

**Request Body**:
```json
{
  "message": "How do I apply for debris removal?",
  "context": "User viewing debris removal page",
  "pageUrl": "https://aldeia.com/debris-removal",
  "isFirstMessage": false,
  "conversationId": "conv_abc123",
  "userProfile": {
    "name": "John Doe",
    "language": "en",
    "county": "LA County"
  }
}
```

**Fields**:
- `message`: Required, user's message text
- `context`: Optional, additional context about page or situation
- `pageUrl`: Optional, URL of page where chat is initiated
- `isFirstMessage`: Optional, boolean indicating first message in conversation
- `conversationId`: Optional, ID of existing conversation
- `userProfile`: Optional, user profile information for personalization

**Success Response** (200):
```json
{
  "response": "To apply for debris removal, you need to fill out the application form available on the county website. The deadline for LA County is May 15, 2025.\n\nSource: LA County Debris Removal Guide (Page 2)",
  "confidence": 0.95,
  "bias": false,
  "uncertainty": false,
  "context": {
    "history": [
      {"sender": "user", "text": "How do I apply for debris removal?"},
      {"sender": "bot", "text": "To apply for debris removal..."}
    ],
    "pageContext": "User viewing debris removal page"
  },
  "grounded": true,
  "hallucination": false,
  "source": "LA County Debris Removal Guide",
  "chunk_index": 2,
  "distance": 0.15,
  "matches": [
    {
      "text": "Document text snippet...",
      "source": "LA County Guide",
      "chunk_index": 2,
      "score": 0.15
    }
  ],
  "intent": "process",
  "ambiguous": false,
  "history": [
    {"sender": "user", "text": "How do I apply for debris removal?"},
    {"sender": "bot", "text": "To apply for debris removal..."}
  ],
  "alternatives": [
    {
      "answer": "Alternative answer from different source...",
      "source": "Pasadena County Guide"
    }
  ],
  "notification": "LA County: Opt-out applications for debris removal close May 15, 2025."
}
```

**Response Fields**:
- `response`: Bot's response text
- `confidence`: Confidence score (0-1)
- `bias`: Boolean indicating if bias was detected
- `uncertainty`: Boolean indicating if response is uncertain
- `context`: Conversation context
- `grounded`: Boolean indicating if response is grounded in documents
- `hallucination`: Boolean indicating potential hallucination
- `source`: Source document name
- `intent`: Classified intent (e.g., 'process', 'status', 'financial')
- `ambiguous`: Boolean indicating if query was ambiguous
- `history`: Conversation history
- `alternatives`: Alternative perspectives from other sources
- `notification`: Proactive notification if applicable

**Error Responses**:
- 401: Authentication required
- 503: Service unavailable (ChromaDB loading)

---

### POST /chat/search

Search documents using vector similarity.

**Authentication**: Required

**Request Body**:
```json
{
  "query": "debris removal eligibility"
}
```

**Success Response** (200):
```json
{
  "matches": [
    {
      "text": "Eligibility criteria for debris removal...",
      "source": "LA County Debris Guide",
      "chunk_index": 5,
      "score": 0.12
    },
    {
      "text": "Property owners are eligible for...",
      "source": "Pasadena County Guide",
      "chunk_index": 3,
      "score": 0.18
    }
  ],
  "grounded": true,
  "hallucination": false
}
```

**Error Responses**:
- 400: Missing query
- 503: ChromaDB not available

---

### GET /chat/bias-logs

Get recent bias detection logs (Admin only).

**Authentication**: Required (Admin role)

**Permissions Required**: `VIEW_SYSTEM_LOGS`

**Success Response** (200):
```json
{
  "logs": [
    "[2025-01-06T10:00:00Z]\n{\"userMessage\":\"...\",\"response\":\"...\",\"source\":\"...\"}",
    "[2025-01-06T09:50:00Z]\n{\"userMessage\":\"...\",\"response\":\"...\"}"
  ]
}
```

---

### GET /chat/admin/analytics

Get analytics summary (Admin only).

**Authentication**: Required (Admin role)

**Permissions Required**: `READ_ADVANCED_ANALYTICS`

**Success Response** (200):
```json
{
  "summary": {
    "totalMessages": 5420,
    "totalUsers": 342,
    "totalConversations": 1250,
    "averageMessagesPerUser": 15.8,
    "intentDistribution": {
      "process": 35,
      "status": 25,
      "financial": 20,
      "information": 20
    }
  }
}
```

---

### GET /chat/admin/users

Get list of all users (Admin only).

**Authentication**: Required (Admin role)

**Permissions Required**: `ADMIN_API_ACCESS`

**Success Response** (200):
```json
{
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "county": "LA County",
      "language": "en",
      "role": "user",
      "is_active": true,
      "created_at": "2025-01-06T10:00:00Z"
    }
  ]
}
```

---

### GET /chat/admin/documents

Get list of all documents (Admin only).

**Authentication**: Required (Admin role)

**Permissions Required**: `MANAGE_CONTENT`

**Success Response** (200):
```json
{
  "documents": [
    {
      "path": "/path/to/document.pdf",
      "name": "LA County Debris Removal Guide.pdf",
      "county": "LA County",
      "indexed": true
    }
  ]
}
```

---

### POST /chat/admin/documents/reindex

Trigger document reindexing (Admin only).

**Authentication**: Required (Admin role)

**Permissions Required**: `MANAGE_CONTENT`

**Success Response** (200):
```json
{
  "message": "Document reindexing completed",
  "result": {
    "documentsProcessed": 25,
    "chunksCreated": 500,
    "timeElapsed": "45s"
  }
}
```

---

## Billing Endpoints

### GET /billing/plans

Get available subscription plans.

**Authentication**: None required

**Success Response** (200):
```json
{
  "plans": [
    {
      "tier": "free",
      "name": "Free Plan",
      "price": 0,
      "messagesLimit": 50,
      "features": [
        "50 messages per month",
        "Basic support",
        "Standard response time"
      ]
    },
    {
      "tier": "basic",
      "name": "Basic Plan",
      "price": 9.99,
      "messagesLimit": 500,
      "features": [
        "500 messages per month",
        "Email support",
        "Priority response time"
      ]
    },
    {
      "tier": "pro",
      "name": "Pro Plan",
      "price": 29.99,
      "messagesLimit": 2000,
      "features": [
        "2,000 messages per month",
        "Priority support",
        "Advanced analytics",
        "API access"
      ]
    },
    {
      "tier": "enterprise",
      "name": "Enterprise Plan",
      "price": 99.99,
      "messagesLimit": -1,
      "features": [
        "Unlimited messages",
        "24/7 dedicated support",
        "Custom integrations",
        "SLA guarantee"
      ]
    }
  ]
}
```

---

### GET /billing/subscription

Get user's current subscription details.

**Authentication**: Required

**Success Response** (200):
```json
{
  "subscription": {
    "id": "sub_123abc",
    "userId": 1,
    "tier": "basic",
    "status": "active",
    "stripeCustomerId": "cus_abc123",
    "stripeSubscriptionId": "sub_xyz789",
    "currentPeriodStart": "2025-01-01T00:00:00Z",
    "currentPeriodEnd": "2025-02-01T00:00:00Z",
    "messagesUsed": 120,
    "messagesLimit": 500,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-06T10:00:00Z"
  }
}
```

**Error Responses**:
- 404: Subscription not found

---

### POST /billing/checkout

Create a checkout session for subscription upgrade.

**Authentication**: Required

**Request Body**:
```json
{
  "tier": "pro"
}
```

**Valid Tiers**: `basic`, `pro`, `enterprise` (not `free`)

**Success Response** (200):
```json
{
  "sessionId": "cs_test_123abc",
  "url": "https://checkout.stripe.com/pay/cs_test_123abc"
}
```

**Error Responses**:
- 400: Invalid subscription tier
- 400: Cannot checkout for free tier

---

### POST /billing/portal

Create a billing portal session for managing subscription.

**Authentication**: Required

**Success Response** (200):
```json
{
  "url": "https://billing.stripe.com/session/xyz789"
}
```

---

### GET /billing/usage

Get user's usage statistics.

**Authentication**: Required

**Success Response** (200):
```json
{
  "usage": {
    "messagesUsed": 120,
    "messagesLimit": 500,
    "usagePercentage": 24,
    "unlimited": false
  }
}
```

**Error Responses**:
- 404: Subscription not found

---

### GET /billing/can-send-message

Check if user can send a message (within quota).

**Authentication**: Required

**Success Response** (200):
```json
{
  "canSend": true,
  "message": "You can send a message"
}
```

Or if limit reached:

```json
{
  "canSend": false,
  "message": "Message limit reached for your plan"
}
```

---

## Documents Endpoints

### GET /documents

Get list of documents with optional search and pagination.

**Authentication**: None required (public endpoint)

**Query Parameters**:
- `limit`: Number of documents to return (default: 50)
- `offset`: Number of documents to skip (default: 0)
- `search`: Search term for filename or content

**Example Request**:
```http
GET /documents?limit=20&offset=0&search=debris
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "doc_123abc",
        "filename": "LA County Debris Removal Guide.pdf",
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

---

### GET /documents/:id

Get specific document by ID.

**Authentication**: None required (public endpoint)

**Path Parameters**:
- `id`: Document ID

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "doc_123abc",
    "filename": "LA County Debris Removal Guide.pdf",
    "content": "Document content text...",
    "metadata": {
      "originalName": "debris_guide.pdf",
      "mimeType": "application/pdf",
      "size": 524288
    },
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

**Error Responses**:
- 404: Document not found

---

### POST /documents

Upload a new document.

**Authentication**: Required

**Request**: multipart/form-data

**Form Fields**:
- `document`: File (PDF only, max 10MB)
- `title`: Optional, document title
- `description`: Optional, document description

**Example Request** (using curl):
```bash
curl -X POST https://api.aldeia.com/api/documents \
  -H "Authorization: Bearer <access_token>" \
  -F "document=@/path/to/file.pdf" \
  -F "title=My Document" \
  -F "description=Document description"
```

**Success Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "doc_123abc",
    "filename": "My Document",
    "content": "Document uploaded via API",
    "metadata": {
      "originalName": "file.pdf",
      "mimeType": "application/pdf",
      "size": 524288
    },
    "createdAt": "2025-01-06T10:00:00Z"
  },
  "message": "Document uploaded successfully"
}
```

**Error Responses**:
- 400: No file uploaded
- 400: Only PDF files are allowed
- 401: Authentication required

---

### DELETE /documents/:id

Delete a document (Admin only).

**Authentication**: Required (Admin role)

**Path Parameters**:
- `id`: Document ID

**Success Response** (200):
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

**Error Responses**:
- 401: Authentication required
- 403: Insufficient permissions (must be admin)
- 404: Document not found

---

## Admin Endpoints

Admin endpoints require special permissions. See individual endpoints for specific permission requirements.

### Available Permissions

- `ADMIN_API_ACCESS`: Full admin access
- `READ_ADVANCED_ANALYTICS`: View analytics
- `VIEW_SYSTEM_LOGS`: View system and bias logs
- `MANAGE_CONTENT`: Upload, delete, and reindex documents
- `MANAGE_USERS`: Manage user accounts
- `MANAGE_SUBSCRIPTIONS`: Manage billing and subscriptions

---

## Webhooks

### POST /billing/webhook

Stripe webhook endpoint for handling subscription events.

**Authentication**: None required (validated via Stripe signature)

**Request Headers**:
```http
stripe-signature: t=1609459200,v1=abc123...
```

**Handled Events**:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Success Response** (200):
```json
{
  "received": true
}
```

**Error Responses**:
- 400: Missing stripe-signature header
- 400: Invalid signature

---

## Code Examples

### JavaScript/Node.js

```javascript
const API_BASE = 'https://api.aldeia.com/api';

// Register a user
async function register(email, password, name, county) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password, name, county })
  });
  return await response.json();
}

// Login and get tokens
async function login(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  return await response.json();
}

// Send a chat message
async function sendMessage(accessToken, message, conversationId) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      message,
      conversationId,
      isFirstMessage: !conversationId
    })
  });
  return await response.json();
}

// Get user profile
async function getProfile(accessToken) {
  const response = await fetch(`${API_BASE}/auth/profile`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return await response.json();
}

// Refresh access token
async function refreshToken(refreshToken) {
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refreshToken })
  });
  return await response.json();
}
```

### Python

```python
import requests

API_BASE = 'https://api.aldeia.com/api'

# Register a user
def register(email, password, name, county):
    response = requests.post(f'{API_BASE}/auth/register', json={
        'email': email,
        'password': password,
        'name': name,
        'county': county
    })
    return response.json()

# Login and get tokens
def login(email, password):
    response = requests.post(f'{API_BASE}/auth/login', json={
        'email': email,
        'password': password
    })
    return response.json()

# Send a chat message
def send_message(access_token, message, conversation_id=None):
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.post(f'{API_BASE}/chat',
        headers=headers,
        json={
            'message': message,
            'conversationId': conversation_id,
            'isFirstMessage': conversation_id is None
        })
    return response.json()

# Get user profile
def get_profile(access_token):
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.get(f'{API_BASE}/auth/profile', headers=headers)
    return response.json()

# Refresh access token
def refresh_token(refresh_token):
    response = requests.post(f'{API_BASE}/auth/refresh', json={
        'refreshToken': refresh_token
    })
    return response.json()
```

### cURL

```bash
# Register a user
curl -X POST https://api.aldeia.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!","name":"John Doe","county":"LA County"}'

# Login
curl -X POST https://api.aldeia.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!"}'

# Send chat message
curl -X POST https://api.aldeia.com/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"message":"How do I apply for debris removal?","isFirstMessage":false}'

# Get user profile
curl -X GET https://api.aldeia.com/api/auth/profile \
  -H "Authorization: Bearer <access_token>"

# Get subscription plans
curl -X GET https://api.aldeia.com/api/billing/plans

# Refresh token
curl -X POST https://api.aldeia.com/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh_token>"}'
```

---

## Best Practices

### Security

1. **Never expose tokens**: Keep access tokens and refresh tokens secure
2. **Use HTTPS**: Always use HTTPS in production
3. **Rotate tokens**: Refresh access tokens before they expire
4. **Logout on breach**: Call `/auth/logout-all` if account compromise is suspected
5. **Validate input**: Sanitize and validate all user input

### Performance

1. **Cache responses**: Cache non-sensitive responses when appropriate
2. **Pagination**: Use pagination for large datasets
3. **Rate limiting**: Respect rate limits to avoid throttling
4. **Batch requests**: Group related requests when possible

### Error Handling

1. **Check status codes**: Always check HTTP status codes
2. **Handle errors gracefully**: Provide user-friendly error messages
3. **Retry logic**: Implement exponential backoff for retries
4. **Log errors**: Log errors for debugging and monitoring

---

## Changelog

### Version 1.0.0 (January 6, 2025)

- Initial API documentation
- Authentication with JWT access and refresh tokens
- Chat endpoints with vector search
- Billing integration with Stripe
- Document management endpoints
- Admin endpoints with RBAC
- Rate limiting and security headers

---

## Support

For API support:
- **Email**: support@aldeia.com
- **Documentation**: https://docs.aldeia.com
- **Status Page**: https://status.aldeia.com

---

**Last Updated**: January 6, 2025
**Version**: 1.0.0 - Phase 8 Final Deliverables
