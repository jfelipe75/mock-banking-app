# Error Handling Architecture

This document explains how errors are translated into user-friendly messages throughout the Bank application.

---

## Overview

The application uses a **layered error handling architecture** that transforms raw database and system errors into structured, user-friendly messages before they reach the client.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ERROR FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   DATABASE (PostgreSQL)                                                      │
│        │                                                                     │
│        │  Raw error: { code: '23505', constraint: 'users_username_unique' } │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────┐                               │
│   │  TRANSLATION LAYER                      │                               │
│   │  server/utils/translateDatabaseError.js │                               │
│   │                                         │                               │
│   │  Converts database errors to domain     │                               │
│   │  errors (AuthError, etc.)               │                               │
│   └─────────────────────────────────────────┘                               │
│        │                                                                     │
│        │  AuthError { code: 'USER_ALREADY_EXISTS', statusCode: 409 }        │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────┐                               │
│   │  MODEL LAYER                            │                               │
│   │  server/models/User.js                  │                               │
│   │                                         │                               │
│   │  Catches DB errors, uses translator,    │                               │
│   │  throws domain errors                   │                               │
│   └─────────────────────────────────────────┘                               │
│        │                                                                     │
│        │  throw translateDatabaseError(err)                                 │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────┐                               │
│   │  CONTROLLER LAYER                       │                               │
│   │  server/controllers/authControllers.js  │                               │
│   │                                         │                               │
│   │  Catches errors, forwards to Express    │                               │
│   │  via next(err)                          │                               │
│   └─────────────────────────────────────────┘                               │
│        │                                                                     │
│        │  next(err)                                                          │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────┐                               │
│   │  GLOBAL ERROR HANDLER                   │                               │
│   │  server/middleware/errorHandler.js      │                               │
│   │                                         │                               │
│   │  Formats final JSON response            │                               │
│   │  Sets HTTP status code                  │                               │
│   └─────────────────────────────────────────┘                               │
│        │                                                                     │
│        │  HTTP 409: { success: false, error: '...', message: '...' }        │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────┐                               │
│   │  CLIENT (React)                         │                               │
│   │  frontend/src/adapters/apiClient.js     │                               │
│   │                                         │                               │
│   │  Parses JSON, extracts message,         │                               │
│   │  throws Error with user-friendly text   │                               │
│   └─────────────────────────────────────────┘                               │
│        │                                                                     │
│        │  Error: "An account with this email already exists."               │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────┐                               │
│   │  UI COMPONENTS                          │                               │
│   │  pages/Login.jsx, pages/SignUp.jsx      │                               │
│   │                                         │                               │
│   │  Displays error.message to user         │                               │
│   └─────────────────────────────────────────┘                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer-by-Layer Explanation

### 1. Database Layer (PostgreSQL)

PostgreSQL throws raw errors with cryptic codes.

**Example raw error:**
```javascript
{
  code: '23505',
  constraint: 'users_username_unique',
  detail: 'Key (username)=(john@example.com) already exists.',
  // ... other internal fields
}
```

These errors are NOT user-friendly and should NEVER be sent to the client.

---

### 2. Translation Layer

**File:** `server/utils/translateDatabaseError.js`

This module maps PostgreSQL error codes to domain-specific errors.

**What it does:**
- Inspects the PostgreSQL error code (e.g., `23505` = unique violation)
- Checks the constraint name to determine what failed
- Returns an appropriate `AuthError` instance

**Code example:**
```javascript
const CONSTRAINT_ERROR_MAP = {
  'users_username_unique': () => AuthError.userAlreadyExists(),
};

function translateDatabaseError(err) {
  // Unique constraint violation
  if (err.code === '23505' && CONSTRAINT_ERROR_MAP[err.constraint]) {
    return CONSTRAINT_ERROR_MAP[err.constraint]();
  }
  
  return err; // Unknown error, return as-is
}
```

**Input:** Raw PostgreSQL error  
**Output:** `AuthError` instance (or original error if not recognized)

---

### 3. Domain Error Classes

**File:** `server/errors/AuthError.js`

Custom error class for authentication-related errors.

**Structure:**
```javascript
class AuthError extends Error {
  constructor(code, message, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.code = code;             // Machine-readable: 'USER_ALREADY_EXISTS'
    this.statusCode = statusCode; // HTTP status: 409
    // message is human-readable: 'An account with this email already exists.'
  }
}
```

**Static factory methods (where user-friendly messages are defined):**

| Method | Code | Status | User-Friendly Message |
|--------|------|--------|----------------------|
| `userNotFound()` | `USER_NOT_FOUND` | 404 | User with this email does not exist. |
| `invalidCredentials()` | `INVALID_CREDENTIALS` | 401 | Invalid email or password. |
| `userAlreadyExists()` | `USER_ALREADY_EXISTS` | 409 | An account with this email already exists. |
| `unauthenticated()` | `UNAUTHENTICATED` | 401 | Authentication required. Please log in. |
| `invalidCsrfToken()` | `CSRF_TOKEN_INVALID` | 403 | Invalid or missing CSRF token. |
| `sessionExpired()` | `SESSION_EXPIRED` | 401 | Your session has expired. Please log in again. |
| `missingCredentials()` | `MISSING_CREDENTIALS` | 400 | Username and password are required. |

**⭐ This is where user-friendly messages are defined on the server side.**

---

### 4. Model Layer

**File:** `server/models/User.js`

Models wrap database operations and use the translator.

**Example:**
```javascript
static async create(username, password) {
  try {
    const result = await knex.raw(query, [username, passwordHash]);
    return new User(result.rows[0]);
  } catch (err) {
    // Translate database error to domain error
    throw translateDatabaseError(err);
  }
}
```

**Input:** Database operation that may fail  
**Output:** Success → User object, Failure → throws `AuthError`

---

### 5. Controller Layer

**File:** `server/controllers/authControllers.js`

Controllers handle HTTP requests and forward errors to Express.

**Example:**
```javascript
exports.registerUser = async (req, res, next) => {
  const { username, password } = req.body;
  
  // Validation errors return directly with structured response
  if (!username || !password) {
    return res.status(400).send({
      success: false,
      error: 'MISSING_CREDENTIALS',
      message: 'Username and password required'
    });
  }

  try {
    const user = await User.create(username, password);
    req.session.userId = user.id;
    res.send(user);
  } catch (err) {
    // Forward AuthError to global handler
    next(err);
  }
};
```

**Key points:**
- Validation errors → return response directly with user-friendly message
- Database/domain errors → forward via `next(err)`

---

### 6. Global Error Handler

**File:** `server/middleware/errorHandler.js`

Final server-side layer that formats all errors into consistent JSON responses.

**Example:**
```javascript
const errorHandler = (err, req, res, next) => {
  // Handle known AuthError instances
  if (err instanceof AuthError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: err.message  // User-friendly message from AuthError
    });
  }

  // Unknown errors → log and return generic message
  console.error('[ErrorHandler] Unexpected error:', err);
  return res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR'
  });
};
```

**Output format (always consistent):**
```json
{
  "success": false,
  "error": "USER_ALREADY_EXISTS",
  "message": "An account with this email already exists."
}
```

---

### 7. Frontend API Client

**File:** `frontend/src/adapters/apiClient.js`

Extracts user-friendly messages from server responses.

**Example:**
```javascript
export const apiFetch = async (url, options = {}) => {
  const response = await fetch(url, fetchOptions);
  
  if (!response.ok) {
    // Parse error response to extract user-friendly message
    let errorMessage = 'An error occurred. Please try again.';
    
    const errorData = await response.json();
    if (errorData.message) {
      errorMessage = errorData.message;  // Extract the user-friendly message
    }
    
    const error = new Error(errorMessage);
    error.status = response.status;
    error.code = errorData.error;
    throw error;
  }
  
  return [responseData, null];
};
```

**⭐ This is where user-friendly messages are extracted on the client side.**

**Input:** HTTP response with error JSON  
**Output:** JavaScript `Error` with `error.message` containing user-friendly text

---

### 8. UI Components

**Files:** `frontend/src/pages/Login.jsx`, `frontend/src/pages/SignUp.jsx`

Display error messages to users.

**Example:**
```jsx
const [errorText, setErrorText] = useState('');

const handleSubmit = async (event) => {
  event.preventDefault();
  try {
    const [user, error] = await logUserIn({ email, password });
    if (error) {
      setErrorText(error.message); // Display user-friendly message
      return;
    }
    // Success handling...
  } catch (err) {
    setErrorText('An unexpected error occurred. Please try again.');
  }
};

return (
  <form>
    {/* Form fields */}
    
    {errorText && (
      <div className="auth-error" role="alert" aria-live="polite">
        {errorText}
      </div>
    )}
  </form>
);
```

---

## Complete Example Flow

**Scenario:** User tries to register with an email that already exists.

| Step | Layer | File | What Happens |
|------|-------|------|--------------|
| 1 | Client | `SignUp.jsx` | User submits signup form with `john@example.com` |
| 2 | Client | `auth-adapter.js` | Calls `registerUser({ email, password })` |
| 3 | Client | `apiClient.js` | Sends POST to `/api/auth/register` |
| 4 | Server | `authControllers.js` | `registerUser()` calls `User.create()` |
| 5 | Server | `User.js` | Executes INSERT query |
| 6 | Database | PostgreSQL | Throws `{ code: '23505', constraint: 'users_username_unique' }` |
| 7 | Server | `User.js` | Catches error, calls `translateDatabaseError(err)` |
| 8 | Server | `translateDatabaseError.js` | Returns `AuthError.userAlreadyExists()` |
| 9 | Server | `User.js` | Throws the `AuthError` |
| 10 | Server | `authControllers.js` | Catches error, calls `next(err)` |
| 11 | Server | `errorHandler.js` | Detects `AuthError`, returns JSON response |
| 12 | Network | HTTP | 409: `{ success: false, error: 'USER_ALREADY_EXISTS', message: 'An account...' }` |
| 13 | Client | `apiClient.js` | Parses JSON, throws `Error('An account with this email already exists.')` |
| 14 | Client | `auth-adapter.js` | Returns `[null, error]` |
| 15 | Client | `SignUp.jsx` | Sets `errorText` to `error.message` |
| 16 | UI | Browser | User sees: "An account with this email already exists." |

---

## Key Translation Points Summary

### Where are user-friendly messages DEFINED?

| Location | File | Purpose |
|----------|------|---------|
| **Server** | `server/errors/AuthError.js` | Static methods define messages for auth errors |
| **Server** | `server/controllers/authControllers.js` | Direct validation error responses |

### Where are user-friendly messages FORMATTED?

| Location | File | Purpose |
|----------|------|---------|
| **Server** | `server/middleware/errorHandler.js` | Formats final JSON with `message` field |

### Where are user-friendly messages EXTRACTED?

| Location | File | Purpose |
|----------|------|---------|
| **Client** | `frontend/src/adapters/apiClient.js` | Parses `message` from error response |

### Where are user-friendly messages DISPLAYED?

| Location | File | Purpose |
|----------|------|---------|
| **Client** | `frontend/src/pages/Login.jsx` | Shows `error.message` in UI |
| **Client** | `frontend/src/pages/SignUp.jsx` | Shows `error.message` in UI |

---

## Security Considerations

### What is NEVER exposed to clients:
- ❌ SQL queries
- ❌ Database constraint names
- ❌ Stack traces
- ❌ Internal PostgreSQL error codes
- ❌ Password hashes
- ❌ Database structure details

### What IS sent to clients:
- ✅ User-friendly messages (defined in `AuthError.js`)
- ✅ Machine-readable error codes (for programmatic handling)
- ✅ Appropriate HTTP status codes

---

## Adding New Error Types

### Step 1: Add to AuthError class
```javascript
// server/errors/AuthError.js
static accountLocked() {
  return new AuthError(
    'ACCOUNT_LOCKED',
    'This account has been temporarily locked. Please try again later.',
    423
  );
}
```

### Step 2: Add constraint mapping (if database-related)
```javascript
// server/utils/translateDatabaseError.js
const CONSTRAINT_ERROR_MAP = {
  'users_username_unique': () => AuthError.userAlreadyExists(),
  'users_account_locked': () => AuthError.accountLocked(), // New
};
```

### Step 3: Use in controller or model
```javascript
if (user.isLocked) {
  throw AuthError.accountLocked();
}
```

The error will automatically flow through the handler and display correctly on the client.

---

## File Reference

| File | Role in Error Flow |
|------|-------------------|
| `server/errors/AuthError.js` | **Defines** user-friendly messages |
| `server/utils/translateDatabaseError.js` | **Translates** DB errors → domain errors |
| `server/models/User.js` | **Uses** translator, throws domain errors |
| `server/controllers/authControllers.js` | **Forwards** errors via `next(err)` |
| `server/middleware/errorHandler.js` | **Formats** final JSON response |
| `frontend/src/adapters/apiClient.js` | **Extracts** message from response |
| `frontend/src/pages/Login.jsx` | **Displays** error to user |
| `frontend/src/pages/SignUp.jsx` | **Displays** error to user |

---

## Note on Legacy Code

The file `frontend/src/utils/fetchingUtils.js` contains an older `fetchHandler` that does NOT extract user-friendly messages:

```javascript
// OLD - Does not extract message
if (!ok) throw new Error(`Fetch failed with status - ${status}`, { cause: status });
```

The new `apiClient.js` properly extracts messages:

```javascript
// NEW - Extracts user-friendly message
const errorData = await response.json();
throw new Error(errorData.message || 'An error occurred.');
```

All auth-related adapters have been updated to use `apiClient.js`.
