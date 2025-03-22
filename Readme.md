# Identity Reconciliation Service

This service helps identify and consolidate customer contact information across different purchases, even when customers use different email addresses and phone numbers for each transaction.

## Overview

The Identity Reconciliation Service provides an API endpoint that:

- Accepts contact information (email and/or phone number)
- Links related contacts together
- Returns consolidated contact information

## Features

- Creates new primary contacts when no matches are found
- Creates secondary contacts when matches are found
- Handles complex scenarios where primary contacts need to be reassigned
- Maintains a complete history of all contact information

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/your-username/identity-reconciliation.git
   cd identity-reconciliation
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

The server will run on port 3000 by default. You can change this by setting the `PORT` environment variable.

## API Endpoints

### POST /identify

Identifies and consolidates contact information.

**Request**:

```json
{
  "email": "example@email.com",
  "phoneNumber": "1234567890"
}
```

Both fields are optional, but at least one must be provided.

**Response**:

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["example@email.com", "another@email.com"],
    "phoneNumbers": ["1234567890", "9876543210"],
    "secondaryContactIds": [2, 3]
  }
}
```

## Database Schema

The service uses a database with the following schema:

```
Contact {
  id              Int
  phoneNumber     String?
  email           String?
  linkedId        Int?        // the ID of another Contact linked to this one
  linkPrecedence  "secondary"|"primary"  // "primary" if it's the first Contact in the link
  createdAt       DateTime
  updatedAt       DateTime
  deletedAt       DateTime?
}
```

## Examples

### Example 1: New Contact

**Request**:

```json
{
  "email": "test@example.com",
  "phoneNumber": "1234567890"
}
```

**Response**:

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["test@example.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": []
  }
}
```

### Example 2: Existing Contact with New Information

**Request**:

```json
{
  "email": "newemail@example.com",
  "phoneNumber": "1234567890"
}
```

**Response**:

```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["test@example.com", "newemail@example.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": [2]
  }
}
```

## Running Tests

Run the test suite with:

```
npm test
```

## Deployment

This service can be deployed to any Node.js hosting environment.

### Environment Variables

- `PORT`: The port on which the server will run (default: 3000)
- `DATABASE_URL`: The database connection URL (default: SQLite file)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
