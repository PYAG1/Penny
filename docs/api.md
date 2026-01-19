# AI Drive API Documentation

## Overview

The AI Drive API provides intelligent knowledge management capabilities, allowing users to upload, process, and search various types of content including images, URLs, notes, and documents. The API uses AI-powered semantic search to enable intelligent content discovery.

**Base URL**: `http://localhost:3000`

## Authentication

Currently, the API does not require authentication. This will be implemented in a future version using Better Auth.

## API Endpoints

### Images

#### Upload Images
```http
POST /api/images
Content-Type: multipart/form-data
```

**Description**: Upload one or more images for AI analysis and semantic search indexing.

**Request Body**:
- `image` (file, required): Image file(s) to upload
- `context` (string, optional): Additional context for image analysis

**Response**:
```json
{
  "success": true,
  "data": {
    "processed": 2,
    "successful": 2,
    "failed": 0,
    "results": [...]
  }
}
```

**Status Codes**:
- `200`: Images processed successfully
- `400`: Bad request (validation error or no images provided)
- `500`: Internal server error

---

### URLs

#### Process URL
```http
POST /api/urls
Content-Type: application/json
```

**Description**: Extract and analyze content from a URL (webpage or YouTube video).

**Request Body**:
```json
{
  "url": "https://example.com",
  "userNote": "Optional note about this content"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "content": {
      "id": "content-id",
      "type": "webpage",
      "title": "Page Title",
      "description": "Page description",
      "url": "https://example.com",
      "imageUrl": "https://example.com/image.jpg"
    },
    "chunksCreated": 5
  }
}
```

**Status Codes**:
- `200`: URL processed successfully
- `400`: Bad request (invalid URL or processing error)
- `500`: Internal server error

#### Get Failed Content
```http
GET /api/urls/failed
```

**Description**: Retrieve all content items that failed processing.

**Response**:
```json
{
  "success": true,
  "data": {
    "contents": [
      {
        "id": "content-id",
        "type": "webpage",
        "url": "https://example.com",
        "title": "Page Title",
        "errorMessage": "Failed to extract content",
        "createdAt": "2023-01-01T00:00:00Z",
        "processingAttempts": 3
      }
    ]
  }
}
```

#### Retry Failed Content
```http
POST /api/urls/retry/{id}
```

**Description**: Retry processing a failed content item.

**Path Parameters**:
- `id` (string): Content ID to retry

**Response**:
```json
{
  "success": true,
  "data": {
    "contentId": "content-id",
    "chunksCreated": 5
  }
}
```

**Status Codes**:
- `200`: Retry initiated successfully
- `404`: Content not found
- `400`: Content is not in failed state

---

### Search

#### Semantic Search
```http
GET /api/search?q=your-query&type=all&limit=20
```

**Description**: Search content using semantic similarity powered by AI embeddings.

**Query Parameters**:
- `q` (string, required): Search query
- `type` (string, optional): Filter by content type (`image`, `webpage`, `youtube`, `all`)
- `limit` (integer, optional): Maximum number of results (default: 20)

**Response**:
```json
{
  "success": true,
  "data": {
    "query": "your query",
    "total": 10,
    "results": [
      {
        "id": "content-id",
        "type": "webpage",
        "url": "https://example.com",
        "title": "Page Title",
        "description": "Page description",
        "imageUrl": "https://example.com/image.jpg",
        "similarity": 0.85,
        "matchedChunk": "Relevant text snippet",
        "matchedSection": "Section title",
        "metadata": {...},
        "createdAt": "2023-01-01T00:00:00Z"
      }
    ]
  }
}
```

**Status Codes**:
- `200`: Search completed successfully
- `400`: Bad request (missing query parameter)

#### Get Recent Content
```http
GET /api/search/recent?limit=20
```

**Description**: Retrieve recently added content.

**Query Parameters**:
- `limit` (integer, optional): Maximum number of results (default: 20)

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 10,
    "results": [
      {
        "id": "content-id",
        "type": "webpage",
        "url": "https://example.com",
        "title": "Page Title",
        "description": "Page description",
        "imageUrl": "https://example.com/image.jpg",
        "metadata": {...},
        "createdAt": "2023-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### Health Check

#### Basic Health Check
```http
GET /
```

**Description**: Basic health check endpoint.

**Response**:
```json
{
  "status": "ok",
  "service": "AI Drive Search API",
  "version": "1.0.0"
}
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Additional context (optional)"
}
```

### Common Error Status Codes

- `400`: Bad Request - Validation errors, missing required parameters
- `404`: Not Found - Resource not found
- `500`: Internal Server Error - Unexpected server errors

---

## Content Types

The API supports the following content types:

### Images
- File uploads processed through AI analysis
- Extracted metadata (dimensions, format, etc.)
- Semantic indexing for search

### Webpages
- URL content extraction using Firecrawl
- Text chunking and embedding generation
- Metadata extraction (title, description, author, etc.)

### YouTube Videos
- Video metadata extraction
- Caption processing for semantic search
- Channel and video information

### Notes (Planned)
- Text-based notes and documents
- Markdown and plaintext support
- Full semantic search integration

---

## Rate Limiting

Currently, no rate limiting is implemented. This will be added in a future version.

---

## SDK and Integration

### JavaScript/Bun Example

```javascript
// Upload an image
const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('context', 'Product screenshot');

const response = await fetch('/api/images', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result);
```

```javascript
// Process a URL
const response = await fetch('/api/urls', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com',
    userNote: 'Interesting article about AI'
  })
});

const result = await response.json();
console.log(result);
```

```javascript
// Search content
const response = await fetch('/api/search?q=artificial intelligence&type=all&limit=10');
const result = await response.json();
console.log(result.data.results);
```

---

## OpenAPI/Swagger Documentation

Interactive API documentation is available at:

- **Swagger UI**: `http://localhost:3000/docs`
- **OpenAPI Spec**: `http://localhost:3000/openapi.json`

The Swagger UI provides:
- Interactive API testing
- Request/response schema documentation
- Parameter validation
- Example requests and responses

---

## Development

### Running the API

```bash
bun run dev
```

The API will be available at `http://localhost:3000`.

### Database Setup

```bash
bun run db:setup
```

This will generate and run database migrations.

---

## Architecture

The API follows a layered architecture pattern:

```
Routes (Validation) → Controllers → Services → Repositories → Database
```

- **Routes**: Handle HTTP routing and request validation
- **Controllers**: Thin layer for HTTP request/response handling
- **Services**: Business logic and orchestration
- **Repositories**: Data access and database operations
- **Lib**: Utilities and helpers (AI, storage, extraction)

---

## Future Features

- Authentication and multi-user support
- Background job processing for async content handling
- Comprehensive error handling and logging
- Rate limiting and security middleware
- Folder/collection organization
- Notes and documents support
- Caching layer for performance optimization
- Comprehensive test suite
- API versioning