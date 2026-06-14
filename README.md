# CampusCrate — Backend API

Smart Student Resource Exchange Platform — REST API + Real-time Server

**Base URL (local):** `http://localhost:3400`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js v5 |
| Database | MongoDB Atlas (Mongoose v9) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Real-time | Socket.io v4 |
| Image Upload | Cloudinary + Multer |
| Email | Nodemailer + Brevo SMTP |
| Dev Server | Nodemon |

---

## Project Structure

```
CampusCrateBackend/
├── src/
│   ├── index.js                        # Entry point — Express + Socket.io setup
│   ├── config/
│   │   ├── db.config.js                # MongoDB Atlas connection
│   │   ├── server.config.js            # ENV loader
│   │   ├── cloudinary.js               # Cloudinary + Multer config
│   │   ├── email.config.js             # Nodemailer / Brevo SMTP transporter
│   │   └── socket.config.js            # Socket.io init + room management
│   ├── models/
│   │   ├── Counter.js                  # Auto-increment ID generator
│   │   ├── User.js                     # Student accounts
│   │   ├── Resource.js                 # Listings (books, notes, equipment)
│   │   ├── Request.js                  # Exchange/borrow requests
│   │   ├── Message.js                  # Chat messages
│   │   ├── Notification.js             # In-app notifications
│   │   └── Wishlist.js                 # Saved/favourited resources
│   ├── controllers/                    # Business logic (one file per model)
│   ├── middlewares/
│   │   ├── auth.middleware.js          # JWT verify → req.user
│   │   ├── admin.middleware.js         # Admin JWT verify
│   │   └── profileComplete.middleware.js  # Block incomplete profiles
│   ├── routes/                         # Express routers
│   └── utils/
│       ├── idGenerator.js              # Custom ID format (USR-US-001)
│       ├── generateOtp.js              # 6-digit OTP
│       └── emitNotification.js         # Socket.io notification helper
├── .env                                # Secrets — NEVER commit this
├── CHANGES.md                          # Change log
└── package.json
```

---

## Setup & Run

```bash
cd CampusCrateBackend
npm install
# create .env file with variables below
npm start        # → http://localhost:3400
```

Health check: `GET /ping` → `pong`

---

## Environment Variables (`.env`)

```env
PORT=3400
MONGO_URI=mongodb+srv://...

JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_brevo_smtp_user
SMTP_PASS=your_brevo_smtp_password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=CampusCrate

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Database Models

### User (`users` collection)
| Field | Type | Notes |
|-------|------|-------|
| `_id` | String | Auto: `USR-US-001`, `USR-US-002`, ... |
| `name` | String | Required |
| `email` | String | Unique |
| `password` | String | bcrypt hashed |
| `roll_number` | String | Unique college ID |
| `department` | String | |
| `year` | Number | |
| `profile_image` | String | Cloudinary URL |
| `bio` | String | |
| `is_verified` | Boolean | Email OTP verified |
| `otp` | String | Temp 6-digit OTP |
| `otp_expires` | Date | OTP expiry |
| `followers` | [String] | Array of User IDs |
| `following` | [String] | Array of User IDs |
| `last_active` | Date | |

### Resource (`resources` collection)
| Field | Type | Notes |
|-------|------|-------|
| `_id` | String | Auto: `RSC-US-001`, `RSC-US-002`, ... |
| `title` | String | Required |
| `description` | String | |
| `category` | String | Books / Notes / Equipment / Other |
| `price` | Number | 0 = Free |
| `condition` | String | New / Good / Fair |
| `image_url` | String | Cloudinary URL |
| `owner_id` | String | Ref → User._id |
| `status` | String | Available / Sold / Reserved |
| `is_deleted` | Boolean | Soft delete flag (default: false) |
| `deleted_at` | Date | Soft delete timestamp |

### Request (`requests` collection)
| Field | Type | Notes |
|-------|------|-------|
| `resource_id` | String | Ref → Resource |
| `sender_id` | String | Who sent the request |
| `receiver_id` | String | Resource owner |
| `status` | String | Pending / Accepted / Rejected / Completed |
| `message` | String | Optional note from sender |

### Message (`messages` collection)
| Field | Type | Notes |
|-------|------|-------|
| `sender_id` | String | Ref → User |
| `receiver_id` | String | Ref → User |
| `content` | String | Message text |
| `is_read` | Boolean | |
| `createdAt` | Date | |

### Notification (`notifications` collection)
| Field | Type | Notes |
|-------|------|-------|
| `user_id` | String | Who receives it |
| `title` | String | |
| `message` | String | |
| `type` | String | request / message / system |
| `is_read` | Boolean | |
| `ref_id` | String | Related resource/request ID |

### Wishlist (`wishlists` collection)
| Field | Type | Notes |
|-------|------|-------|
| `user_id` | String | Ref → User |
| `resource_ids` | [String] | Array of saved resource IDs |

---

## All API Routes

### Authentication Flow
```
1. POST /user/signup    → account created, OTP sent to email
2. POST /user/verify    → OTP verified → returns JWT token
3. POST /user/login     → returns JWT token (for repeat logins)
4. Protected routes     → Header: Authorization: Bearer <token>
```

---

### Users `/user`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/user/signup` | No | Register new student (sends OTP) |
| POST | `/user/login` | No | Login → returns JWT |
| POST | `/user/verify` | No | Verify email OTP → activates account |
| POST | `/user/resend-otp` | No | Resend OTP to email |
| GET | `/user/public/:rollNumber` | No | View any student's public profile |
| GET | `/user/all` | JWT | Get all users |
| GET | `/user/profile` | JWT | Get my profile |
| PUT | `/user/update/:id` | JWT | Update my profile |
| PUT | `/user/change-password` | JWT | Change password |
| DELETE | `/user/delete/:id` | JWT | Delete my account |
| POST | `/user/upload-profile-image` | JWT | Upload profile photo to Cloudinary |
| POST | `/user/follow/:id` | JWT | Follow a user |
| POST | `/user/unfollow/:id` | JWT | Unfollow a user |
| GET | `/user/followers/:id` | No | Get user's followers list |
| GET | `/user/following/:id` | No | Get user's following list |

**Signup Body:**
```json
{
  "name": "Aftab Ali",
  "email": "aftab@college.com",
  "password": "Campus@123",
  "roll_number": "CSE2021001"
}
```

**Login Body:**
```json
{
  "email": "aftab@college.com",
  "password": "Campus@123"
}
```

---

### Resources `/resource`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/resource/all` | No | All available resources |
| GET | `/resource/search?q=book&category=Books` | No | Search with filters |
| GET | `/resource/user/my` | JWT | My listed resources |
| GET | `/resource/:id` | No | Single resource detail |
| POST | `/resource/create` | JWT + ProfileComplete | Create new listing |
| PUT | `/resource/update/:id` | JWT | Edit existing listing |
| DELETE | `/resource/delete/:id` | JWT | Soft delete (hidden, not erased) |
| POST | `/resource/upload` | JWT + ProfileComplete | Upload resource image to Cloudinary |

**Create Resource Body:**
```json
{
  "title": "Engineering Mathematics Book",
  "description": "3rd sem, good condition",
  "category": "Books",
  "price": 150,
  "condition": "Good",
  "image_url": "https://cloudinary.com/..."
}
```

---

### Requests `/request`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/request/send` | JWT + ProfileComplete | Send buy/borrow request |
| GET | `/request/received` | JWT | Requests I received |
| GET | `/request/sent` | JWT | Requests I sent |
| PUT | `/request/:id/accept` | JWT | Accept a request |
| PUT | `/request/:id/reject` | JWT | Reject a request |
| PUT | `/request/:id/complete` | JWT | Mark exchange as completed |

**Send Request Body:**
```json
{
  "resource_id": "RSC-US-001",
  "message": "Is this still available?"
}
```

---

### Messages `/message`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/message/send` | JWT + ProfileComplete | Send a chat message |
| GET | `/message/conversations` | JWT | All conversation threads |
| GET | `/message/:userId` | JWT | Chat history with specific user |
| PUT | `/message/read/:userId` | JWT | Mark messages from user as read |

**Send Message Body:**
```json
{
  "receiver_id": "USR-US-002",
  "content": "Hi, is the book available?"
}
```

---

### Notifications `/notification`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/notification/all` | JWT | All my notifications |
| GET | `/notification/unread-count` | JWT | Count of unread notifications |
| PUT | `/notification/read-all` | JWT | Mark all as read |
| PUT | `/notification/:id/read` | JWT | Mark single notification as read |

---

### Wishlist `/wishlist`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/wishlist/toggle/:resourceId` | JWT | Add/remove from wishlist |
| GET | `/wishlist` | JWT | My wishlist (full resource objects) |
| GET | `/wishlist/ids` | JWT | Just the resource IDs in wishlist |
| GET | `/wishlist/check/:resourceId` | JWT | Is this resource in my wishlist? |

---

### Admin `/admin`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/admin/login` | No | Admin login |
| GET | `/admin/users` | Admin JWT | All users list |
| GET | `/admin/resources` | Admin JWT | All resources list |

---

### Upload `/upload`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/upload/image` | JWT | Upload image to Cloudinary |

---

## Real-time (Socket.io)

Connected at `ws://localhost:3400`

| Event | Direction | Description |
|-------|-----------|-------------|
| `join` | Client → Server | User joins their personal room |
| `sendMessage` | Client → Server | Send message to another user |
| `newMessage` | Server → Client | Receive incoming message |
| `notification` | Server → Client | Real-time in-app notification |
| `unreadCount` | Server → Client | Badge count update |

---

## Custom ID System

Uses `Counter` model to auto-generate readable IDs:
- Users: `USR-US-001`, `USR-US-002`, ...
- Resources: `RSC-US-001`, `RSC-US-002`, ...

---

## Soft Delete

Resources are never permanently removed. On delete:
```js
resource.is_deleted = true;
resource.deleted_at = new Date();
await resource.save();
```
All list queries use `{ is_deleted: { $ne: true } }` to exclude deleted items.
This handles both `is_deleted: false` and documents where the field doesn't exist yet.

---

## Profile Complete Middleware

Some routes (`/resource/create`, `/request/send`, `/message/send`) require the user to have a complete profile (name, roll_number, department, year filled in). If profile is incomplete, the API returns `403` with a message to complete profile first.

---

## Test Accounts

| Name | Email | Password |
|------|-------|----------|
| Rahul | rahul@college.com | password123 |
| Priya | priya@college.com | password123 |
| Aman | aman@college.com | password123 |
| Sneha | sneha@college.com | password123 |
| Vikram | vikram@college.com | password123 |

---

## GitHub

Repo: https://github.com/aftabbbx/CampusCrateBackend  
Branch: `main`
