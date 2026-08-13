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
│   │   ├── Message.js                  # Chat messages (resource-scoped threads)
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
| `_id` | String | Auto: `RSC-001`, `RSC-002`, ... |
| `title` | String | Required |
| `description` | String | |
| `category` | String | Book / Notes / Stationery / Project / Other |
| `type` | String | Free / Paid / Exchange |
| `price` | Number | 0 = Free |
| `condition` | String | New / Good / Fair |
| `image_url` | String | Cloudinary URL |
| `location` | String | Campus location |
| `owner_id` | String | Ref → User._id |
| `status` | String | `Available` / `Pending` / `Exchanged` / `Sold` |
| `is_deleted` | Boolean | Soft delete flag (default: false) |
| `deleted_at` | Date | Soft delete timestamp |

**Status values:**
- `Available` — listed, open for requests and chat
- `Pending` — a request has been accepted (locked by request flow)
- `Exchanged` — deal completed via platform request flow
- `Sold` — manually marked by owner (OLX-style toggle)

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
| `_id` | String | Auto: `MSG-001`, ... |
| `sender_id` | String | Ref → User |
| `receiver_id` | String | Ref → User |
| `message` | String | Message text |
| `message_type` | String | `text` / `image` / `voice` |
| `media_url` | String | Cloudinary URL (image/voice) |
| `resource_id` | String | Ref → Resource (optional — links message to a product) |
| `is_read` | Boolean | |
| `createdAt` | Date | |

> **Note:** `resource_id` enables resource-scoped conversation threads. Each (user pair + resource) forms its own separate chat thread, like OLX.

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

---

### Resources `/resource`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/resource/all` | No | All Available + Sold resources |
| GET | `/resource/search` | No | Search with filters (`?keyword=&category=&type=&condition=`) |
| GET | `/resource/user/my` | JWT | My listed resources |
| GET | `/resource/:id` | No | Single resource detail |
| POST | `/resource/create` | JWT + ProfileComplete | Create new listing |
| PUT | `/resource/update/:id` | JWT | Edit existing listing |
| DELETE | `/resource/delete/:id` | JWT | Soft delete (hidden, not erased) |
| PATCH | `/resource/:id/mark-sold` | JWT | Toggle Sold ↔ Available (owner only) |
| POST | `/resource/upload` | JWT + ProfileComplete | Upload resource image to Cloudinary |

**Mark as Sold rules:**
- Only the resource owner can toggle
- `Available` → `Sold` or `Sold` → `Available`
- Cannot toggle if status is `Pending` or `Exchanged` (managed by request flow)
- Sold resources still appear in `/resource/all` but with sold treatment on frontend

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

---

### Messages `/message`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/message/send` | JWT + ProfileComplete | Send a chat message |
| GET | `/message/conversations` | JWT | All conversation threads (grouped by user + resource) |
| GET | `/message/:userId?resource_id=RSC-001` | JWT | Chat history for specific user + resource thread |
| PUT | `/message/read/:userId?resource_id=RSC-001` | JWT | Mark thread messages as read |

**Send Message Body:**
```json
{
  "receiver_id": "USR-US-002",
  "message": "Hi, is the book available?",
  "message_type": "text",
  "resource_id": "RSC-001"
}
```

> **resource_id** is optional. If provided and the resource is `Sold`, the server returns `403` — chat is blocked for sold items.

**Conversation grouping:** Each `(sender + receiver + resource_id)` triplet is its own thread. A seller with 4 products gets 4 separate chat threads per buyer.

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
| POST | `/upload/audio` | JWT | Upload voice note to Cloudinary |

---

## Real-time (Socket.io)

Connected at `ws://localhost:3400`

| Event | Direction | Description |
|-------|-----------|-------------|
| `join` | Client → Server | User joins their personal room |
| `send-message` | Client → Server | Send message to another user |
| `receive-message` | Server → Client | Receive incoming message |
| `notification` | Server → Client | Real-time in-app notification |
| `typing` | Client → Server | User is typing |
| `stop-typing` | Client → Server | User stopped typing |
| `messages-read` | Client → Server | Messages marked as read |

---

## Custom ID System

Uses `Counter` model to auto-generate readable IDs:
- Users: `USR-US-001`, `USR-US-002`, ...
- Resources: `RSC-001`, `RSC-002`, ...
- Messages: `MSG-001`, `MSG-002`, ...

---

## Soft Delete

Resources are never permanently removed. On delete:
```js
resource.is_deleted = true;
resource.deleted_at = new Date();
await resource.save();
```
All list queries use `{ is_deleted: { $ne: true } }` to exclude deleted items.

---

## Mark as Sold (OLX-style)

Owner can manually toggle any listing between `Available` and `Sold`:
- `PATCH /resource/:id/mark-sold` — owner-only toggle
- Sold resources still appear in public listings but with faded UI treatment
- Active chats for a sold resource are disabled on the frontend
- New chat initiation for a sold resource is blocked server-side (403)
- Cannot mark sold if resource is `Pending` or `Exchanged`

---

## Profile Complete Middleware

Routes `/resource/create`, `/request/send`, `/message/send` require a complete profile (name, roll_number, department, year). Returns `403` with `profileIncomplete: true` if not complete.

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
