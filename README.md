# 🚀 Task API - Azure Functions + Cosmos DB

A backend API for task management built using **Azure Functions** and **Azure Cosmos DB**, following a clean architecture pattern (Function → Service → Repository).

---

# 📦 Tech Stack

* Node.js (TypeScript)
* Azure Functions v4
* Azure Cosmos DB (Emulator / Cloud)
* p-limit (for concurrency control)

---

# ⚙️ Setup & Run (Local)


## 1. Install Dependencies

```bash
npm install
```

---

## 2. Setup Environment Variables

Create a `.env` file:

```env
USE_COSMOS=true
COSMOS_DB_CONNECTION=AccountEndpoint=https://localhost:8081/;AccountKey=YOUR_KEY_HERE
```

---

## 3. Run Cosmos DB Emulator

Download and install:
https://learn.microsoft.com/en-us/azure/cosmos-db/local-emulator

Then start it.

---

## 4. Run Azurite (Storage Emulator)

```bash
npm install -g azurite
azurite
```

---

## 5. Run the Project

```bash
npm run dev
```

or

```bash
func start
```

---

# 🌐 Base URL

```
http://localhost:7071/api
```

---

# 📚 API Endpoints

---

## 🔹 1. Get All Tasks

### GET `/tasks`

### Query Parameters

| Param             | Type   | Description                 |
| ----------------- | ------ | --------------------------- |
| limit             | number | Number of items per request |
| continuationToken | string | Pagination token            |
| organizationId    | string | Filter by organization      |
| status            | string | Filter by status            |
| search            | string | Search by title             |

---

### Example

```bash
GET /api/tasks?limit=5
```

---

### Response

```json
{
  "success": true,
  "message": "Tasks fetched",
  "data": [...],
  "meta": {
    "continuationToken": "xxx",
    "hasMore": true
  }
}
```

---

## 🔹 2. Get Task by ID

### GET `/task/{id}/organizations/{organizationId}`

---

### Response

```json
{
  "success": true,
  "message": "Task retrieved",
  "data": {
    "id": "1",
    "title": "Task",
    "status": "todo",
    "organizationId": "1"
  }
}
```

---

## 🔹 3. Create Task

### POST `/newTask`

---

### Request Body

```json
{
  "title": "Learn Azure",
  "organizationId": "1",
  "status": "todo"
}
```

---

### Rules

* `title` is required
* `organizationId` is required
* Duplicate titles are not allowed within the same organization (case-insensitive)

---

### Response

```json
{
  "success": true,
  "message": "Task created",
  "data": {
    "id": "uuid",
    "title": "Learn Azure",
    "status": "todo",
    "organizationId": "1"
  }
}
```

---

## 🔹 4. Update Task

### PATCH `/task/{id}/organizations/{organizationId}`

---

### Request Body

```json
{
  "title": "Updated Title"
}
```

---

### Notes

* Supports partial updates (PATCH)
* Only specific fields are allowed to be updated

---

### Response

```json
{
  "success": true,
  "message": "Task updated",
  "data": { ... }
}
```

---

## 🔹 5. Delete Task

### DELETE `/task/{id}/organizations/{organizationId}`

---

### Response

```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

---

## 🔹 6. Bulk Delete Tasks

### DELETE `/tasks/bulk-delete`

---

### Request Body

```json
[
  { "id": "1", "organizationId": "1" },
  { "id": "2", "organizationId": "1" }
]
```

---

### Response

```json
{
  "success": true,
  "message": "Bulk delete completed",
  "meta": {
    "total": 2,
    "success": 2,
    "failed": 0
  },
  "errors": []
}
```

---

# 🧠 Features

* Full CRUD Task API
* Bulk delete with concurrency control
* Pagination using Cosmos DB continuation tokens
* Case-insensitive duplicate prevention
* Clean architecture (Function → Service → Repository)
* Standardized API responses

---


# 👨‍💻 Author

Ranu Agita F
