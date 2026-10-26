# CineScope — Movie Database & Community Review Platform

A full-stack client-server application featuring an in-memory movie database, Express/Node.js REST API, responsive Vanilla JavaScript frontend, and production-ready Docker container with Nginx reverse proxy listening on port 8080.

## Architecture

- **Backend:** Node.js with Express (and zero-dependency HTTP fallback), exposing RESTful endpoints for movies, ratings, reviews, and comments.
- **Database:** Modular, thread-safe in-memory data store with pre-seeded movie data.
- **Frontend:** Pure HTML5, modern CSS3 (Flexbox/Grid), and Vanilla JavaScript (ES6+). Interactive star rating widgets, review submission, discussion comments, search, and genre filtering.
- **Containerization:** Alpine-based Docker container combining Nginx serving static assets and reverse-proxying API calls to Node.js backend, exposing port 8080.

## Running with Docker

### Build and Run with Docker
```bash
# Build the Docker image
docker build -t movie-review-app .

# Run the container exposing port 8080
docker run -p 8080:8080 movie-review-app
```

### Or using Docker Compose
```bash
docker compose up --build
```

Access the application in your browser:
- Web App UI: `http://localhost:8080`
- REST API: `http://localhost:8080/api/movies`
- Healthcheck: `http://localhost:8080/health`

## Local Development (Without Docker)

### Install dependencies
```bash
npm install
```

### Run Server
```bash
npm start
```
By default, the server runs on `http://localhost:3000`.

### Run Automated Tests
```bash
npm test
```

## REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/movies` | List all movies (supports `?search=` and `?genre=`) |
| `GET` | `/api/movies/:id` | Get movie details by ID with reviews, ratings, and comments |
| `POST` | `/api/movies` | Create a new movie |
| `PUT` | `/api/movies/:id` | Update movie details |
| `DELETE` | `/api/movies/:id` | Delete a movie |
| `GET` | `/api/movies/:id/ratings` | List all ratings for a movie |
| `POST` | `/api/movies/:id/ratings` | Submit movie rating (1–5 stars) |
| `GET` | `/api/movies/:id/reviews` | List all reviews for a movie |
| `POST` | `/api/movies/:id/reviews` | Submit a review |
| `GET` | `/api/movies/:id/comments` | List all comments for a movie |
| `POST` | `/api/movies/:id/comments` | Submit a comment |
| `GET` | `/api/genres` | List distinct movie genres |
| `GET` | `/health` | Service healthcheck |
