# EventPulse Testing Documentation

## Overview

This document explains the testing setup implemented for the EventPulse backend application using Vitest and Supertest. The testing framework was added to validate API reliability, backend logic correctness, request validation, authentication flow, and utility functions.

The testing setup includes:

* Unit Testing
* Integration/API Testing
* Validation Testing
* Error Handling Testing
* Mocked Database Responses

A total of **17 automated test cases** were implemented and executed successfully.

---

# Technologies Used

| Technology | Purpose                                      |
| ---------- | -------------------------------------------- |
| Vitest     | JavaScript testing framework                 |
| Supertest  | API endpoint testing                         |
| cross-env  | Environment variable handling during testing |

---

# Installed Packages

The following packages were installed:

```bash
npm install -D vitest supertest cross-env
```

---

# Package.json Configuration

The following test scripts were added inside `package.json`:

```json
"scripts": {
  "test": "cross-env NODE_ENV=test vitest run",
  "test:watch": "vitest",
  "coverage": "vitest run --coverage"
}
```

## Purpose of Scripts

| Script             | Purpose                                    |
| ------------------ | ------------------------------------------ |
| npm test           | Executes all automated tests               |
| npm run test:watch | Runs tests continuously during development |
| npm run coverage   | Generates code coverage report             |

---

# Folder Structure

The following testing folder structure was implemented:

```text
server/
 ├── tests/
 │    ├── auth.test.js
 │    ├── bookings.test.js
 │    ├── distance.test.js
 │    ├── events.test.js
 │    └── health.test.js
```

---

# Testing Categories Implemented

## 1. Unit Testing

Unit testing was implemented for utility functions.

### File Tested

```text
server/utils/distance.js
```

### Test Cases

| Test Case                      | Description                                  |
| ------------------------------ | -------------------------------------------- |
| Null location validation       | Checks behavior when coordinates are missing |
| Same location validation       | Confirms zero distance calculation           |
| Real-world distance validation | Validates calculated distance between cities |

### Purpose

Ensures utility functions produce accurate outputs independently.

---

# 2. Authentication API Testing

Authentication APIs were tested using mocked database responses.

### File Tested

```text
server/routes/auth.js
```

### Test Cases

| Test Case                   | Expected Result   |
| --------------------------- | ----------------- |
| Invalid email during signup | Returns HTTP 400  |
| Short password validation   | Returns HTTP 400  |
| Duplicate email signup      | Returns HTTP 409  |
| Invalid login password      | Returns HTTP 401  |
| Successful login            | Returns JWT token |

### Purpose

Ensures secure authentication flow and proper validation handling.

---

# 3. Booking API Testing

Booking functionality was tested thoroughly because it contains critical business logic.

### File Tested

```text
server/routes/bookings.js
```

### Test Cases

| Test Case                | Expected Result  |
| ------------------------ | ---------------- |
| Missing booking data     | Returns HTTP 400 |
| Invalid event ID         | Returns HTTP 404 |
| Invalid showtime         | Returns HTTP 400 |
| Seat overflow validation | Returns HTTP 400 |

### Purpose

Ensures booking integrity, seat validation, and request correctness.

---

# 4. Event API Testing

Event discovery and filtering APIs were tested.

### File Tested

```text
server/routes/events.js
```

### Test Cases

| Test Case                  | Expected Result                           |
| -------------------------- | ----------------------------------------- |
| Unauthorized access        | Returns HTTP 401                          |
| Fetch approved events      | Returns valid event list                  |
| Search filter validation   | Returns matching events                   |
| Category filter validation | Returns empty list for unmatched category |

### Purpose

Validates event retrieval logic and filtering mechanisms.

---

# 5. Health API Testing

Health API testing ensures backend availability.

# 6.Functional Testing
Functional testing was performed manually to validate complete end-to-end workflows and ensure that all major EventPulse features behave correctly from an end-user perspective.

Functional Testing Scenarios
User Authentication
Verified successful user signup using valid credentials.
Verified login functionality with correct email and password.
Verified invalid login handling for incorrect passwords.
Verified JWT token generation after successful authentication.

Event Discovery
Verified retrieval of approved events from backend APIs.
Verified keyword-based event search functionality.
Verified category-based event filtering.
Verified detailed event information display.

Booking System
Verified successful event booking for available seats.
Verified validation for invalid booking requests.
Verified seat overflow handling when requested seats exceed availability.
Verified invalid showtime validation handling.
Favorites and Reviews
Verified adding and removing events from favorites.
Verified successful review submission functionality.
Verified rating validation logic.

Notifications and Real-Time Features
Verified booking notification generation.
Verified real-time viewer count updates using Socket.io.
Verified live event room communication functionality.

Admin Dashboard
Verified pending event approval functionality.
Verified event rejection functionality.
Verified event moderation workflow.
Backend Health Validation
Verified backend health endpoint response.
Verified successful API status response handling.


### File Tested

```text
/api/health
```

### Test Cases

| Test Case         | Expected Result     |
| ----------------- | ------------------- |
| API health status | Returns status = ok |

### Purpose

Ensures backend service availability.

---

# Mocking Strategy

Database calls were mocked to isolate backend logic from actual MySQL connections.

## Mocked Components

* Database pool
* Sequelize configuration
* Socket.io functions
* JWT secrets

### Example

```js
vi.mock("../db/pool.js", () => ({
  getPool: vi.fn(async () => ({
    execute: mockExecute,
  })),
}));
```

---

# Environment Configuration for Testing

To prevent actual server startup and database connection during tests, conditional startup logic was added in `server/index.js`.

## Added Logic

```js
if (process.env.NODE_ENV !== "test") {
  startServer().catch((error) => {
    console.error("Failed to start EventPulse API.");
    console.error(error);
    process.exit(1);
  });
}
```

### Purpose

* Prevents real MySQL connection during testing
* Prevents server conflicts
* Isolates API logic testing

---

# Running Tests

## Execute All Tests

```bash
npm test
```

## Run Coverage

```bash
npm run coverage
```

---

# Final Test Results

The final test execution produced the following output:

```bash
Test Files  5 passed
Tests       17 passed
```

---

# Benefits of Testing Added

The implemented testing framework improves:

* Backend reliability
* API correctness
* Request validation
* Error handling
* Maintainability
* Code quality
* Debugging efficiency
* Future scalability

---

# Key Learnings

During implementation, several important backend testing concepts were learned:

* API integration testing
* Request/response validation
* Mocking external dependencies
* Isolating backend logic
* Automated testing workflows
* Error handling validation
* Environment-specific configuration

---

# Conclusion

The EventPulse backend testing framework successfully validates critical APIs and backend utilities through automated testing. The implemented testing structure ensures reliable backend functionality, proper request validation, and improved software quality while following modern backend testing practices.
