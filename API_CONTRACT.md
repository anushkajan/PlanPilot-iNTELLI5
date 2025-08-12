# iNTELLI5 Event Management Tool – API Contracts

This document outlines the API contracts for the **iNTELLI5** event management tool, based on the user flow and features previously discussed.  
These contracts define the **endpoints, request/response formats, and functionalities** required to build the frontend and backend of the application.

---

## 1. Authentication
Handles user **sign-up**, **login**, and **password management**.

### 1.1. User Sign Up
- **Endpoint:** `/api/auth/signup`  
- **Method:** `POST`  
- **Description:** Creates a new user account.

Request Body
```json
{
  "name": "string",
  "email": "string",
  "password": "string"
}
```
Response Body

```json
{
  "token": "string",
  "user": {
    "id": "string",
    "name": "string",
    "email": "string"
  }
}
```

### 1.2 User Login
- **Endpoint:** `/api/auth/login`
- **Method:** `POST`
- **Description:** Authenticates a user and returns a token.

Request Body
```json
{
  "email": "string",
  "password": "string"
}
```
Response Body
```json
{
  "token": "string",
  "user": {
    "id": "string",
    "name": "string",
    "email": "string"
  }
}
```

## 2. Events
Endpoints for creating, retrieving, updating, and deleting events.
Authentication required.

### 2.1. Create a New Event
- **Endpoint:** `/api/events`
- **Method:** `POST`
- **Description:** Creates a new event for the authenticated user.

Request Body
```json
{
  "name": "string",
  "type": "string",
  "date": "Date",
  "description": "string"
}
```
Response Body
```json
{
  "id": "string",
  "name": "string",
  "type": "string",
  "date": "Date",
  "description": "string",
  "hostId": "string"
}
```

### 2.2. Get All Events for User
- **Endpoint:** `/api/events`
- **Method:** `GET`
- **Description:** Retrieves a list of all events created by or shared with the authenticated user.

Response Body
```json
[
  {
    "id": "string",
    "name": "string",
    "type": "string",
    "date": "Date",
    "progress": "number"
  }
]
```

### 2.3. Get a Specific Event
- **Endpoint:** `/api/events/:eventId`
- **Method:** `GET`
- **Description:** Retrieves detailed information for a single event.

Response Body
```json
{
  "id": "string",
  "name": "string",
  "type": "string",
  "date": "Date",
  "description": "string",
  "hostId": "string",
  "collaborators": ["userId1", "userId2"],
  "vendors": ["vendorId1", "vendorId2"]
}
```


## 3. Tasks
Manages tasks associated with a specific event.

### 3.1. Create a New Task
- **Endpoint:** `/api/events/:eventId/tasks`
- **Method:** `POST`
- **Description:** Adds a new task to an event.

Request Body
```json
{
  "name": "string",
  "description": "string",
  "assigneeId": "string | null",
  "dueDate": "Date",
  "status": "string"
}
```
Response Body
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "assigneeId": "string",
  "dueDate": "Date",
  "status": "string",
  "eventId": "string"
}
```

### 3.2. Get All Tasks for an Event
- **Endpoint:** `/api/events/:eventId/tasks`
- **Method:** `GET`
- **Description:** Retrieves all tasks for a given event, with optional filtering.

Response Body
```json
[
  {
    "id": "string",
    "name": "string",
    "assigneeId": "string",
    "status": "string",
    "dueDate": "Date"
  }
]
```

## 4. Guests
Handles the guest list and RSVP management.

### 4.1. Add a New Guest
- **Endpoint:** `/api/events/:eventId/guests`
- **Method:** `POST`
- **Description:** Adds a single guest to the event's guest list.

Request Body
```json
{
  "name": "string",
  "email": "string",
  "plusOne": "number",
  "notes": "string"
}
```

Response Body
```json
{
  "id": "string",
  "name": "string",
  "rsvpStatus": "string"
}
```

### 4.2. Get Guest List
- **Endpoint:** /`api/events/:eventId/guests`
- **Method:** `GET`
- **Description:** Retrieves the full guest list for an event.

Response Body
```json
[
  {
    "id": "string",
    "name": "string",
    "email": "string",
    "rsvpStatus": "string",
    "plusOne": "number"
  }
]
```

## 5. Vendors
Manages vendors linked to an event.

### 5.1. Add a New Vendor
- **Endpoint:** `/api/events/:eventId/vendors`
- **Method:** `POST`
- **Description:** Adds a new vendor to an event.

Request Body
```json
{
  "companyName": "string",
  "contactName": "string",
  "email": "string",
  "serviceProvided": "string"
}
```
Response Body
```json
{
  "id": "string",
  "companyName": "string",
  "serviceProvided": "string"
}
```


## 5.2. Get All Vendors for an Event
- **Endpoint:** `/api/events/:eventId/vendors`
- **Method:** `GET`
- **Description:** Retrieves the list of all vendors associated with an event.

Response Body
```json
[
  {
    "id": "string",
    "companyName": "string",
    "contactName": "string",
    "email": "string",
    "serviceProvided": "string"
  }
]
```

## 6. Budget / Expenses
Tracks event finances.

### 6.1. Add a New Expense
- **Endpoint:** `/api/events/:eventId/expenses`
- **Method:** `POST`
- **Description:** Records a new expense for the event budget.

Request Body
```json
{
  "name": "string",
  "category": "string",
  "amount": "number",
  "isPaid": "boolean"
}
```
Response Body
```json
{
  "id": "string",
  "name": "string",
  "amount": "number",
  "isPaid": "boolean"
}
```
