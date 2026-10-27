# Technical Architecture & Design Blueprint: Movie Database & Review Platform V2

- **Sprint**: Sprint 2 (`sprint-1` evaluation cycle)
- **Feature Branch**: `feature-movie-v2`
- **Architecture Lead**: ArchitectAlex (Tech Lead)

---

## 1. Branch Name & Tech Stack Overview

- **Git Branch**: `feature-movie-v2`
- **Backend Architecture**: Node.js / Express lightweight in-memory REST API service.
- **Frontend Architecture**: Vanilla HTML5, CSS3, and modern Vanilla ES6+ JavaScript. No build step, bundling, or heavy frameworks required.
- **Containerization & Deployment**: Docker container serving on port `8080` (listening directly or via Nginx reverse proxy to Node API). Cloud Run ready.

---

## 2. Modular File Tree & File Ownership

To enable completely conflict-free parallel execution across developer teammates (**Athos**, **Porthos**, and **Aramis**), the repository files are partitioned into strict, disjoint ownership boundaries:

```
.
├── DESIGN.md                         # [Shared Blueprint - Root]
├── Dockerfile                        # [SCRUM-115] Nginx / Node container exposed on port 8080
├── nginx.conf                        # [SCRUM-115] Nginx configuration reverse proxying /api/
├── package.json                      # [SCRUM-115] Node dependencies & start scripts
├── server/
│   ├── db.js                         # [SCRUM-115] In-memory database, seed data, search/filter/sort/upvote methods
│   └── server.js                     # [SCRUM-115] Express REST API endpoints, routing, parameter validation
└── public/
    ├── index.html                    # [SCRUM-116] Main single-page application layout & modal shells
    ├── css/
    │   ├── catalog.css               # [SCRUM-116] Catalog grid, search/filter toolbar, analytics visual breakdown
    │   └── reviews.css               # [SCRUM-117] Review cards, helpful buttons, user avatar badges, toast styles
    └── js/
        ├── catalog.js                # [SCRUM-116] Movie catalog rendering, live search, genre filter, sort & analytics
        ├── reviews.js                # [SCRUM-117] Review rendering, helpful voting, form submission & DOM updates
        └── toast.js                  # [SCRUM-117] Standalone Toast notification utility (success/error alerts)
```

---

## 3. Parallel Waves & Task-to-File Mapping

| Task ID | Task Title | Owner Candidate | Wave | Target Files |
| :--- | :--- | :--- | :--- | :--- |
| **SCRUM-115** | Backend Advanced Search, Filtering, and Sorting Endpoints | Athos | **Wave 1 (Parallel)** | `server/db.js`, `server/server.js`, `package.json`, `Dockerfile`, `nginx.conf` |
| **SCRUM-116** | Frontend Search & Filter Controls and Rating Analytics | Aramis | **Wave 1 (Parallel)** | `public/index.html`, `public/css/catalog.css`, `public/js/catalog.js` |
| **SCRUM-117** | Interactive Review Helpful Votes and Feedback UX | Porthos | **Wave 1 (Parallel)** | `public/css/reviews.css`, `public/js/reviews.js`, `public/js/toast.js` |

*Note: Since each task operates strictly on isolated files, all three tasks execute in parallel in **Wave 1** without merge conflicts!*

---

## 4. DOM IDs, Selectors & Interface Contracts

### 4.1 HTML Skeleton & Element Contracts (`public/index.html`)

`public/index.html` must include the following element IDs and script/stylesheet references:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MovieHub - Ratings & Reviews</title>
  <link rel="stylesheet" href="css/catalog.css">
  <link rel="stylesheet" href="css/reviews.css">
</head>
<body>
  <!-- Header & Toolbar -->
  <header class="app-header">
    <div class="header-container">
      <h1 class="logo">🎬 MovieHub</h1>
      <div class="search-filter-bar">
        <div class="search-wrapper">
          <input type="text" id="search-input" placeholder="Search title, director, or cast..." autocomplete="off">
          <button type="button" id="search-clear-btn" title="Clear search">✕</button>
        </div>
        <div class="filter-wrapper">
          <select id="genre-filter">
            <option value="all">All Genres</option>
            <option value="Action">Action</option>
            <option value="Sci-Fi">Sci-Fi</option>
            <option value="Drama">Drama</option>
            <option value="Crime">Crime</option>
            <option value="Comedy">Comedy</option>
            <option value="Animation">Animation</option>
            <option value="Thriller">Thriller</option>
          </select>
          <select id="sort-by">
            <option value="rating-desc">Highest Rated ★</option>
            <option value="year-desc">Recently Released</option>
            <option value="title-asc">Alphabetical (A-Z)</option>
          </select>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="main-content">
    <div id="loading-spinner" class="spinner hidden"></div>
    <div id="no-results-msg" class="empty-state hidden">No movies match your search or filter criteria.</div>
    <div id="movie-grid" class="movie-grid"></div>
  </main>

  <!-- Movie Details Modal -->
  <div id="movie-modal" class="modal hidden" role="dialog" aria-modal="true">
    <div class="modal-backdrop" id="modal-backdrop"></div>
    <div class="modal-dialog">
      <button type="button" id="modal-close-btn" class="modal-close-btn" aria-label="Close">✕</button>
      
      <!-- Movie Summary Header -->
      <div id="modal-movie-header" class="modal-movie-header">
        <img id="modal-poster" src="" alt="Movie Poster" class="modal-poster">
        <div class="modal-header-info">
          <h2 id="modal-title"></h2>
          <div class="modal-meta">
            <span id="modal-year"></span> • <span id="modal-director"></span> • <span id="modal-genres" class="badge-list"></span>
          </div>
          <p id="modal-synopsis"></p>
          <p class="modal-cast"><strong>Cast:</strong> <span id="modal-cast-names"></span></p>
        </div>
      </div>

      <!-- Rating Analytics Breakdown -->
      <section id="rating-analytics" class="rating-analytics">
        <h3>Rating Breakdown</h3>
        <div class="analytics-summary">
          <div class="overall-rating">
            <span id="analytics-avg-rating" class="avg-score">0.0</span>
            <div class="star-display">★★★★★</div>
            <span id="analytics-total-votes" class="total-count">0 ratings</span>
          </div>
          <div id="rating-bars-container" class="rating-bars-container">
            <!-- 5 to 1 Star rows injected dynamically -->
          </div>
        </div>
      </section>

      <!-- Reviews Section -->
      <section id="reviews-section" class="reviews-section">
        <h3>Reviews & Community Feedback</h3>
        
        <!-- Add Review Form -->
        <form id="add-review-form" class="review-form">
          <h4>Leave a Review</h4>
          <div class="form-row">
            <input type="text" id="review-author-input" placeholder="Your Name" required maxlength="50">
            <select id="review-rating-input" required>
              <option value="5">5 ★ - Outstanding</option>
              <option value="4">4 ★ - Great</option>
              <option value="3">3 ★ - Good</option>
              <option value="2">2 ★ - Fair</option>
              <option value="1">1 ★ - Poor</option>
            </select>
          </div>
          <textarea id="review-comment-input" placeholder="Share your thoughts about this movie..." required maxlength="500"></textarea>
          <button type="submit" id="review-submit-btn" class="btn-submit">Post Review</button>
        </form>

        <!-- Dynamic Reviews List -->
        <div id="reviews-list" class="reviews-list"></div>
      </section>
    </div>
  </div>

  <!-- Toast Notification Container -->
  <div id="toast-container" class="toast-container" aria-live="polite"></div>

  <!-- Modular Scripts -->
  <script src="js/toast.js"></script>
  <script src="js/catalog.js"></script>
  <script src="js/reviews.js"></script>
</body>
</html>
```

---

## 5. JavaScript Interface & Module Contracts

### 5.1 Toast Notification Utility (`public/js/toast.js` - SCRUM-117)
Exported globally on `window.Toast`:
```javascript
window.Toast = {
  show(message, type = 'info', duration = 3000) {
    // type: 'success' | 'error' | 'info'
    // creates div.toast with class `toast-${type}` inside #toast-container
    // automatically fades out and removes after `duration` ms
  }
};
```

### 5.2 Reviews Controller Interface (`public/js/reviews.js` - SCRUM-117)
Exported globally on `window.ReviewsController`:
```javascript
window.ReviewsController = {
  activeMovieId: null,

  // Called by catalog.js when a movie modal is opened
  loadReviewsForMovie(movieId, reviews = []) {
    this.activeMovieId = movieId;
    this.renderReviewsList(reviews);
    this.bindFormListener();
  },

  // Calculates user initials from author name (e.g., "John Doe" -> "JD")
  getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  },

  // Formats ISO timestamp to human-friendly string (e.g. "Oct 27, 2026")
  formatDate(timestamp) {
    if (!timestamp) return 'Just now';
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? 'Just now' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  },

  // Renders review cards into #reviews-list
  // Each card must contain:
  // - .user-avatar with initials
  // - .review-header (author, timestamp, stars)
  // - .review-comment text
  // - button.btn-helpful with data-review-id="${review.id}" and span.helpful-count
  renderReviewsList(reviews) { ... },

  // Handles upvoting with instant UI update and POST /api/movies/:id/reviews/:reviewId/vote
  async handleUpvote(reviewId, buttonEl) { ... },

  // Handles review submission with input validation and POST /api/movies/:id/reviews
  async handleSubmitReview(e) { ... }
};
```

### 5.3 Catalog & Analytics Interface (`public/js/catalog.js` - SCRUM-116)
Exported globally on `window.CatalogController`:
```javascript
window.CatalogController = {
  movies: [],
  currentFilters: {
    query: '',
    genre: 'all',
    sortBy: 'rating-desc'
  },

  async init() {
    this.bindControls();
    await this.fetchAndRenderMovies();
  },

  // Debounced live search listener on #search-input
  // Change listener on #genre-filter and #sort-by
  bindControls() { ... },

  // Fetches movies from GET /api/movies with query params
  async fetchAndRenderMovies() { ... },

  // Renders cards in #movie-grid
  renderGrid(movies) { ... },

  // Opens movie modal, fetches details, calculates analytics, and calls ReviewsController
  async openMovieModal(movieId) {
    // 1. Fetch GET /api/movies/:id
    // 2. Populate #modal-title, #modal-poster, #modal-year, etc.
    // 3. Render rating analytics in #rating-bars-container:
    //    For stars 5 down to 1: calculate percentage = (count / total) * 100
    //    Render .rating-bar-row with .bar-fill width `${percentage}%`
    // 4. Pass reviews to window.ReviewsController.loadReviewsForMovie(movieId, movie.reviews);
    // 5. Remove 'hidden' class from #movie-modal
  },

  closeMovieModal() {
    // Adds 'hidden' class to #movie-modal
  }
};
```

---

## 6. Backend REST API Specifications (`server/server.js` & `server/db.js` - SCRUM-115)

### 6.1 Movie Data Structure
```typescript
interface Movie {
  id: string;
  title: string;
  director: string;
  cast: string[];
  genres: string[];
  releaseYear: number;
  posterUrl: string;
  synopsis: string;
  ratings: number[]; // e.g. [5, 4, 5, 3, 5]
  avgRating: number; // calculated to 1 decimal place
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  reviews: Review[];
}

interface Review {
  id: string;
  movieId: string;
  author: string;
  rating: number; // 1 to 5
  comment: string;
  helpfulVotes: number;
  timestamp: string; // ISO string
}
```

### 6.2 REST Endpoints & Contracts

#### `GET /api/movies`
- **Query Parameters**:
  - `q`: Search keyword across `title`, `director`, `cast` (case-insensitive substring).
  - `genre`: Genre filter (e.g. `'Action'`, `'Sci-Fi'`) or `'all'`.
  - `sortBy`: `'rating'` | `'year'` | `'title'` (default: `'rating'`).
  - `order`: `'asc'` | `'desc'` (default depends on sortBy: rating -> desc, year -> desc, title -> asc).
- **Response `200 OK`**:
```json
{
  "success": true,
  "count": 8,
  "data": [
    {
      "id": "m1",
      "title": "Inception",
      "director": "Christopher Nolan",
      "cast": ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page"],
      "genres": ["Action", "Sci-Fi", "Thriller"],
      "releaseYear": 2010,
      "posterUrl": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400",
      "synopsis": "A thief who steals corporate secrets through dream-sharing technology...",
      "avgRating": 4.8,
      "ratingsCount": 24,
      "ratingDistribution": { "1": 0, "2": 1, "3": 2, "4": 5, "5": 16 }
    }
  ]
}
```

#### `GET /api/movies/:id`
- **Response `200 OK`**: Returns full movie object including `reviews` array.
- **Response `404 Not Found`**: `{ "success": false, "error": "Movie not found" }`.

#### `POST /api/movies/:id/reviews`
- **Payload**:
```json
{
  "author": "Alice Smith",
  "rating": 5,
  "comment": "Visually stunning and mind-bending masterpiece!"
}
```
- **Validation**:
  - `author`: Non-empty string, trimmed length between 1 and 50 characters.
  - `rating`: Integer between 1 and 5.
  - `comment`: Non-empty string, trimmed length between 3 and 500 characters.
- **Response `201 Created`**:
```json
{
  "success": true,
  "data": {
    "id": "rev-1700000000",
    "movieId": "m1",
    "author": "Alice Smith",
    "rating": 5,
    "comment": "Visually stunning and mind-bending masterpiece!",
    "helpfulVotes": 0,
    "timestamp": "2026-10-27T10:00:00.000Z"
  }
}
```

#### `POST /api/movies/:id/reviews/:reviewId/vote`
- **Action**: Increments `helpfulVotes` by 1.
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "reviewId": "rev-1700000000",
    "helpfulVotes": 1
  }
}
```

#### `GET /api/health`
- **Response `200 OK`**: `{ "status": "ok", "uptime": 120.5 }`.

---

## 7. Containerization & Deployment Setup (`Dockerfile` & `nginx.conf`)

Listening on Port: **`8080`**.

### Standard `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 8080

ENV PORT=8080
CMD ["node", "server/server.js"]
```
*(In `server/server.js`, Express serves static assets from `public/` and mounts REST routes at `/api/`, listening on `process.env.PORT || 8080`)*

---

## 8. Verification & Test Plan

1. **Backend Integration Testing**:
   - Querying `GET /api/movies?q=Nolan` returns matching movies.
   - Querying `GET /api/movies?genre=Sci-Fi&sortBy=rating&order=desc` returns sorted Sci-Fi movies.
   - Submitting review via `POST /api/movies/:id/reviews` appends review and updates rating breakdown.
   - Upvoting review via `POST /api/movies/:id/reviews/:reviewId/vote` increments vote count.
2. **Frontend UI Testing**:
   - Typing in search box filters cards instantly with no UI jitter.
   - Changing genre dropdown filters movies correctly.
   - Opening modal displays rating breakdown bars matching calculated percentages.
   - Clicking 👍 Helpful increments counter immediately in DOM and triggers success toast.
   - Submitting review adds card to top of list and displays toast notification.
3. **Container Testing**:
   - `docker build -t moviehub .` builds cleanly.
   - `docker run -p 8080:8080 moviehub` starts on port 8080 and responds to `/api/health` and `/`.
