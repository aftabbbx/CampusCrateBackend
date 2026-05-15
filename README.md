# CampusCrate Backend API Documentation

This documentation covers all the User Management and Authentication APIs. It explains the fields required, how to test them using Postman, the step-by-step testing flow, and the expected success and failure responses.

## 🔗 Base URL
`http://localhost:3400`

---

## 🚀 Testing Flow (Step-by-Step)
1. **Signup**: Call the `/user/signup` API to create a new account. An OTP will be sent to your email.
2. **Verify OTP**: Check your email, grab the OTP, and call the `/user/verify` API. Upon success, you will receive a `token` (JWT) and your account will be activated.
3. **Login**: For subsequent logins, use `/user/login` with your email and password to get a fresh `token` directly.
4. **Use Protected Routes**: Copy the `token` from the login or verify response. Go to Postman's **Authorization** tab, select **Bearer Token**, and paste your token. Now you can hit protected routes like getting all users, updating profile, etc.

---

## 🔓 Public Routes (No Token Required)

### 1. User Signup
Registers a new user and sends a 6-digit OTP to their email address.

*   **Method:** `POST`
*   **URL:** `/user/signup`
*   **Headers:** `Content-Type: application/json`
*   **Request Body:**
    ```json
    {
      "name": "Aftab Ali",
      "username": "aftab96",
      "email": "aftab.nextdot@gmail.com",
      "password": "Campus@123",
      "phone_number": "9876543210", 
      "semester": "5th" 
    }
    ```
    *(Note: `phone_number` and `semester` are optional)*

*   **✅ Success Response (201 Created):**
    ```json
    {
      "success": true,
      "message": "Signup successful. OTP sent to your email. Please verify."
    }
    ```
*   **❌ Failure Responses:**
    *   `400 Bad Request`: `{"success": false, "message": "Name, username, email and password are required"}`
    *   `409 Conflict`: `{"success": false, "message": "Email already exists"}` (or Username already exists)

---

### 2. Verify OTP
Verifies the OTP sent to the email and activates the account. Returns a JWT Token.

*   **Method:** `POST`
*   **URL:** `/user/verify`
*   **Headers:** `Content-Type: application/json`
*   **Request Body:**
    ```json
    {
      "email": "aftab.nextdot@gmail.com",
      "otp": "123456" 
    }
    ```

*   **✅ Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "OTP verified successfully",
      "token": "eyJhbGciOiJIUzI1NiIsInR5...",
      "user": {
        "_id": "64abcdef1234567890",
        "name": "Aftab Ali",
        "username": "aftab96",
        "email": "aftab.nextdot@gmail.com",
        "is_verified": true
      }
    }
    ```
*   **❌ Failure Responses:**
    *   `400 Bad Request`: `{"success": false, "message": "Invalid OTP"}` or `{"success": false, "message": "OTP has expired"}`
    *   `404 Not Found`: `{"success": false, "message": "User not found"}`

---

### 3. User Login
Logs in an already verified user and returns a JWT Token.

*   **Method:** `POST`
*   **URL:** `/user/login`
*   **Headers:** `Content-Type: application/json`
*   **Request Body:**
    ```json
    {
      "email": "aftab.nextdot@gmail.com",
      "password": "Campus@123"
    }
    ```

*   **✅ Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Login successful",
      "token": "eyJhbGciOiJIUzI1NiIsInR5...",
      "user": {
        "_id": "64abcdef1234567890",
        "name": "Aftab Ali",
        "username": "aftab96",
        "email": "aftab.nextdot@gmail.com",
        "is_verified": true
      }
    }
    ```
*   **❌ Failure Responses:**
    *   `401 Unauthorized`: `{"success": false, "message": "Invalid password"}`
    *   `403 Forbidden`: `{"success": false, "message": "Email not verified. Please complete signup verification."}`
    *   `404 Not Found`: `{"success": false, "message": "User not found. Please signup first."}`

---

### 4. Resend OTP
Resends an OTP to the user's email if they haven't verified yet or their OTP expired.

*   **Method:** `POST`
*   **URL:** `/user/resend-otp`
*   **Headers:** `Content-Type: application/json`
*   **Request Body:**
    ```json
    {
      "email": "aftab.nextdot@gmail.com",
      "purpose": "signup"
    }
    ```

*   **✅ Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "OTP resent successfully"
    }
    ```
*   **❌ Failure Responses:**
    *   `404 Not Found`: `{"success": false, "message": "User not found"}`

---

## 🔒 Protected Routes (Token Required)

> **IMPORTANT:** For all APIs below, you must pass the JWT token in Postman.
> Go to **Headers** tab -> add `Authorization` as key and `Bearer <your_token_here>` as value. OR use the **Authorization** tab -> Type: **Bearer Token**.

### 5. Get My Profile
Fetches the currently logged-in user's details.

*   **Method:** `GET`
*   **URL:** `/user/profile`

*   **✅ Success Response (200 OK):**
    ```json
    {
      "success": true,
      "user": {
        "_id": "64abcdef1234567890",
        "name": "Aftab Ali",
        "username": "aftab96",
        "email": "aftab.nextdot@gmail.com",
        "phone_number": "9876543210",
        "semester": "5th",
        "is_verified": true,
        "createdAt": "2024-05-15T10:00:00.000Z",
        "updatedAt": "2024-05-15T10:00:00.000Z"
      }
    }
    ```
*   **❌ Failure Responses:**
    *   `401 Unauthorized`: `{"success": false, "message": "Access denied. No token provided."}` or `{"success": false, "message": "Token expired. Please login again."}`

---

### 6. Get All Verified Users
Fetches a list of all verified users in the database (excluding passwords and OTP fields).

*   **Method:** `GET`
*   **URL:** `/user/all`

*   **✅ Success Response (200 OK):**
    ```json
    {
      "success": true,
      "count": 2,
      "users": [
        {
          "_id": "64abcdef1234567890",
          "name": "Aftab Ali",
          "username": "aftab96",
          "email": "aftab.nextdot@gmail.com",
          "is_verified": true
        },
        { 
          "_id": "64abcdef1234567891",
          ... 
        }
      ]
    }
    ```
*   **❌ Failure Responses:**
    *   `401 Unauthorized`: Token missing or invalid.

---

### 7. Update Profile
Updates the profile information of the logged-in user. Requires the User ID in the URL.

*   **Method:** `PUT`
*   **URL:** `/user/update/:id` *(Replace `:id` with your actual user ID)*
*   **Request Body:**
    ```json
    {
      "name": "Aftab Ali Updated",
      "phone_number": "9998887776",
      "semester": "6th",
      "bio": "I am a web developer.",
      "profile_image": "https://link-to-image.com/img.jpg"
    }
    ```
    *(Note: All fields are optional. Only send what you want to update.)*

*   **✅ Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Profile updated successfully",
      "user": {
        "_id": "64abcdef1234567890",
        "name": "Aftab Ali Updated",
        "phone_number": "9998887776",
        "semester": "6th",
        "bio": "I am a web developer.",
        "profile_image": "https://link-to-image.com/img.jpg",
        "username": "aftab96",
        "email": "aftab.nextdot@gmail.com",
        "is_verified": true
      }
    }
    ```
*   **❌ Failure Responses:**
    *   `403 Forbidden`: `{"success": false, "message": "Unauthorized. You can only update your own profile."}` (Occurs if you pass someone else's ID in the URL)

---

### 8. Change Password
Allows the logged-in user to change their password securely.

*   **Method:** `PUT`
*   **URL:** `/user/change-password`
*   **Request Body:**
    ```json
    {
      "currentPassword": "Campus@123",
      "newPassword": "Campus@New456"
    }
    ```

*   **✅ Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Password changed successfully"
    }
    ```
*   **❌ Failure Responses:**
    *   `400 Bad Request`: `{"success": false, "message": "New password must be at least 6 characters"}`
    *   `401 Unauthorized`: `{"success": false, "message": "Current password is incorrect"}`

---

### 9. Delete Account
Deletes the logged-in user's account permanently from the database. Requires the User ID in the URL.

*   **Method:** `DELETE`
*   **URL:** `/user/delete/:id` *(Replace `:id` with your user ID)*

*   **✅ Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Account deleted successfully"
    }
    ```
*   **❌ Failure Responses:**
    *   `403 Forbidden`: `{"success": false, "message": "Unauthorized. You can only delete your own account."}`
