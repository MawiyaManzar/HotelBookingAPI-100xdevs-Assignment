# 🏨 Hotel Booking API

A RESTful API for hotel booking management system built as a 100xdevs assignment. This API enables hotel owners to manage their properties and allows customers to search, book hotels, and submit reviews.

## 📋 Overview

This is a full-featured hotel booking system that supports:
- **User Authentication**: JWT-based authentication with role-based access control
- **Hotel Management**: Owners can create hotels and manage rooms
- **Booking System**: Customers can search, book, and cancel hotel reservations
- **Review System**: Customers can submit reviews after completed stays
- **Search & Filtering**: Advanced hotel search with filters for location, price, and ratings

## 🛠️ Tech Stack

- **Runtime**: [Bun](https://bun.com) v1.3.6
- **Framework**: Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Zod
- **Password Hashing**: bcrypt

## 🚀 Getting Started

### Prerequisites

- Bun runtime installed ([Install Bun](https://bun.sh))
- PostgreSQL database running
- Node.js (if not using Bun)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hotelBookingAPI
```

2. Install dependencies:
```bash
bun install
```

3. Set up environment variables:
Create a `.env` file in the root directory with:
```
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret_key
```

4. Run database migrations (if using Drizzle migrations):
```bash
bun run drizzle-kit push
```

5. Start the server:
```bash
bun run index.ts
```

The API will be available at `http://localhost:3003`

## 📘 API Endpoints

### Authentication

#### 1. **POST /api/auth/signup**

Create a new user account.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "phone": "+1234567890",
  "role": "customer" // or "owner"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "customer"
  }
}
```

---

#### 2. **POST /api/auth/login**

Authenticate user and return JWT token.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "customer"
  }
}
```

---

### Hotel Management (Owner Only)

#### 3. **POST /api/hotels**

Create a new hotel.

**Headers:** 
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "Grand Palace Hotel",
  "description": "Luxury 5-star hotel in the heart of the city",
  "city": "Mumbai",
  "country": "India",
  "amenities": ["wifi", "pool", "gym", "parking", "restaurant"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Grand Palace Hotel",
    "description": "Luxury 5-star hotel...",
    "city": "Mumbai",
    "country": "India",
    "amenities": ["wifi", "pool", "gym"],
    "ratings": "0.0",
    "totalreviews": 0
  }
}
```

---

#### 4. **POST /api/hotels/:hotelId/rooms**

Add a room to a hotel.

**Headers:** 
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "roomNumber": "101",
  "roomType": "Deluxe",
  "pricePerNight": "150.00",
  "maxOccupancy": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "hotelId": "uuid",
    "roomNumber": "101",
    "roomType": "Deluxe",
    "pricePerNight": "150.00",
    "maxOccupancy": 2
  }
}
```

---

### Hotel Search & Details

#### 5. **GET /api/hotels**

Search and filter hotels.

**Headers:** 
```
Authorization: Bearer <token>
```

**Query Params (optional):**
- `city` - Filter by city name
- `country` - Filter by country name
- `minPrice` - Minimum price per night
- `maxPrice` - Maximum price per night
- `minRating` - Minimum hotel rating (1-5)

**Example:**
```
GET /api/hotels?city=Mumbai&minPrice=100&maxPrice=500&minRating=4
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Grand Palace Hotel",
      "city": "Mumbai",
      "country": "India",
      "ratings": "4.5",
      "totalreviews": 120
    }
  ]
}
```

---

#### 6. **GET /api/hotels/:hotelId**

Get hotel details with rooms.

**Headers:** 
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Grand Palace Hotel",
    "description": "Luxury 5-star hotel...",
    "city": "Mumbai",
    "country": "India",
    "amenities": ["wifi", "pool"],
    "ratings": "4.5",
    "totalreviews": 120,
    "rooms": [
      {
        "id": "uuid",
        "roomNumber": "101",
        "roomType": "Deluxe",
        "pricePerNight": "150.00",
        "maxOccupancy": 2
      }
    ]
  }
}
```

---

### Bookings (Customer Only)

#### 7. **POST /api/bookings**

Create a booking.

**Headers:** 
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "roomId": "uuid",
  "checkInDate": "2024-12-25",
  "checkOutDate": "2024-12-30",
  "guests": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "roomId": "uuid",
    "hotelId": "uuid",
    "checkInDate": "2024-12-25",
    "checkOutDate": "2024-12-30",
    "guests": 2,
    "totalPrice": "750.00",
    "status": "confirmed"
  }
}
```

---

#### 8. **GET /api/bookings**

Get all bookings for current user.

**Headers:** 
```
Authorization: Bearer <token>
```

**Query Params (optional):**
- `status` - Filter by booking status (`confirmed` | `cancelled`)

**Example:**
```
GET /api/bookings?status=confirmed
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "roomId": "uuid",
      "hotelId": "uuid",
      "checkInDate": "2024-12-25",
      "checkOutDate": "2024-12-30",
      "guests": 2,
      "totalPrice": "750.00",
      "status": "confirmed"
    }
  ]
}
```

---

#### 9. **PUT /api/bookings/:bookingId/cancel**

Cancel a booking.

**Headers:** 
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "cancelled",
    "cancelledAt": "2024-12-20T10:30:00Z"
  }
}
```

---

### Reviews (Customer Only)

#### 10. **POST /api/reviews**

Submit hotel review after completed stay.

**Headers:** 
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "bookingId": "uuid",
  "rating": 5,
  "comment": "Excellent stay! Great service and amenities."
}
```

**Rules:**
- Review can only be submitted after checkout date
- Booking must be confirmed
- Updates hotel rating and total reviews count
- One review per booking

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "bookingId": "uuid",
    "hotelId": "uuid",
    "rating": 5,
    "comment": "Excellent stay!",
    "createdAt": "2024-12-31T10:00:00Z"
  }
}
```

---

## 🔐 Authentication & Authorization

### Authentication Flow

1. User signs up or logs in via `/api/auth/signup` or `/api/auth/login`
2. Server returns a JWT token
3. Client includes token in subsequent requests: `Authorization: Bearer <token>`
4. Protected routes validate the token using `authMiddleware`

### Role-Based Access Control

The API supports two user roles:

- **Customer**: Can search hotels, create bookings, cancel bookings, and submit reviews
- **Owner**: Can create hotels and add rooms to their hotels

Protected endpoints use middleware:
- `authMiddleware`: Validates JWT token
- `customerOnly`: Restricts access to customers only
- `ownerOnly`: Restricts access to owners only

---

## 🗄️ Database Schema

### Core Entities

- **Users**: User accounts with email, password, name, phone, and role
- **Hotels**: Hotel information with owner, location, amenities, ratings
- **Rooms**: Room details linked to hotels (room number, type, price, occupancy)
- **Bookings**: Reservation records with dates, guests, pricing, and status
- **Reviews**: Customer reviews linked to bookings and hotels

### Key Constraints

- Unique email per user
- Unique room number per hotel
- One review per booking
- Rating must be between 1-5
- Checkout date must be after check-in date
- Booking conflicts are prevented (no overlapping dates for same room)

---

## 📝 Project Structure

```
hotelBookingAPI/
├── src/
│   ├── auth/
│   │   ├── authMiddleware.ts    # JWT validation & role checks
│   │   ├── login.ts             # Login endpoint
│   │   └── signup.ts            # Signup endpoint
│   ├── bookings/
│   │   └── bookings.ts          # Booking CRUD operations
│   ├── db/
│   │   ├── index.ts             # Database connection
│   │   └── schema.ts            # Drizzle ORM schema
│   └── hotels/
│       └── hotel.ts              # Hotel & room management
├── index.ts                      # Express app entry point
├── drizzle.config.ts             # Drizzle configuration
└── package.json
```

---

## 🧪 Testing

Test the API using tools like:
- **Postman**
- **cURL**
- **Thunder Client** (VS Code extension)
- **HTTPie**

Example cURL request:
```bash
curl -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

---

## 📄 License

This project is created as part of the 100xdevs assignment.

---

## 👨‍💻 Development

Built with ❤️ using Bun and Express.js

For questions or issues, please refer to the 100xdevs course materials.