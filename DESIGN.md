# Technical Blueprint & Architecture Design: Movie Database, Reviews & Ratings Application

## 1. Overview & Technical Stack
- **Sprint**: Movie App Sprint 1 (Sprint ID: 26)
- **Feature Branch**: `feature-movie-reviews`
- **Application Type**: Client-Server Movie Catalog, Review & Rating Web Application
- **Frontend Tech Stack**: Semantic HTML5, Responsive Modern CSS3 (Dark cinematic aesthetic), Vanilla ES6+ JavaScript (Zero external frontend frameworks, zero build step)
- **Backend Tech Stack**: Node.js & Express REST API with In-Memory Data Store, Input Validation, and CORS support
- **Containerization**: Lightweight Nginx Alpine container serving static frontend assets on port `8080` (compatible with Google Cloud Run `cloudbuild.yaml`)
- **Execution Architecture**: 100% decoupled modular architecture partitioned across disjoint files. Athos, Porthos, and Aramis can build, test, and commit in parallel in **Wave 1** with zero merge conflicts.

---

## 2. Modular File Tree & Ownership

```text
.
├── DESIGN.md           # Architecture blueprint & contracts (ArchitectAlex)
├── server.js           # Express REST API, in-memory store, seed data, validation (SCRUM-127 - Porthos)
├── package.json        # Node.js backend dependencies and start scripts (SCRUM-127 - Porthos)
├── index.html          # Semantic HTML5 layout, catalog view, modal dialog, review form (SCRUM-129 - Athos)
├── styles.css          # Cinematic dark theme, responsive grid, modal, star widget (SCRUM-129 - Athos)
├── Dockerfile          # Nginx container configuration listening on port 8080 (SCRUM-129 - Athos)
├── nginx.conf          # Nginx server block routing static files & proxying /api/ (SCRUM-129 - Athos)
├── .dockerignore       # Build context exclusion file (SCRUM-129 - Athos)
├── api.js              # REST API client wrapper & offline/fallback data handler (SCRUM-130 - Aramis)
└── app.js              # UI controller, event bindings, star widget, dynamic DOM updates (SCRUM-130 - Aramis)
```

---

## 3. Backend REST API Specification (`server.js` & `package.json` - SCRUM-127)

### 3.1 Data Model & Seed Movies
Each movie record in the in-memory store contains:
```javascript
{
  id: 1,
  title: "Inception",
  year: 2010,
  genre: "Sci-Fi",
  director: "Christopher Nolan",
  posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500",
  synopsis: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
  ratings: [5, 4, 5, 5, 4], // Array of numbers (1-5)
  reviews: [
    {
      id: "rev-1",
      author: "Alice Johnson",
      rating: 5,
      comment: "A mind-bending cinematic masterpiece with breathtaking visual effects and score!",
      date: "2026-10-25T14:30:00.000Z"
    }
  ]
}
```
*Provide at least 6 diverse seed movies across distinct genres (e.g., Sci-Fi, Action, Drama, Crime, Animation, Thriller).*

### 3.2 Computed Movie Fields
When returning movies in `GET /api/movies` or `GET /api/movies/:id`, compute and include:
- `averageRating`: Numeric value rounded to 1 decimal place (e.g., `4.6`), or `0` if no ratings exist.
- `ratingCount`: Integer count of submitted ratings (`ratings.length`).
- `reviewCount`: Integer count of submitted reviews (`reviews.length`).

### 3.3 Endpoints Contract
Express application runs on `process.env.PORT || 3000` with `cors()` enabled and `express.json()` middleware.

1. **`GET /api/movies`**
   - **Query Params**:
     - `search` (optional): Case-insensitive substring match on movie `title`, `director`, or `synopsis`.
     - `genre` (optional): Case-insensitive match on movie `genre` (or `"all"` for all).
   - **Status**: `200 OK`
   - **Response Body**: Array of movie summary objects with computed fields (`id`, `title`, `year`, `genre`, `director`, `posterUrl`, `synopsis`, `averageRating`, `ratingCount`, `reviewCount`, `reviews`).

2. **`GET /api/movies/:id`**
   - **URL Param**: `:id` (numeric or string ID)
   - **Status**: `200 OK` on match; `404 Not Found` if id not found (`{ "error": "Movie not found" }`).
   - **Response Body**: Single movie object with complete `reviews` array and computed rating statistics.

3. **`POST /api/movies/:id/ratings`**
   - **URL Param**: `:id`
   - **Request Body**: `{ "rating": 5 }`
   - **Validation**: `rating` must be an integer between 1 and 5. Return `400 Bad Request` (`{ "error": "Rating must be an integer between 1 and 5" }`) if invalid. Return `404 Not Found` if movie ID does not exist.
   - **Behavior**: Appends rating to movie's `ratings` array.
   - **Status**: `200 OK`
   - **Response Body**: `{ "message": "Rating recorded successfully", "averageRating": 4.7, "ratingCount": 6 }`

4. **`POST /api/movies/:id/reviews`**
   - **URL Param**: `:id`
   - **Request Body**:
     ```json
     {
       "author": "Marcus Brody",
       "rating": 5,
       "comment": "Unbelievable storytelling and directing! A must-watch."
     }
     ```
   - **Validation**:
     - `author`: Non-empty string.
     - `comment`: Non-empty string.
     - `rating`: Integer between 1 and 5.
     - Return `400 Bad Request` (`{ "error": "Author, comment, and valid rating (1-5) are required" }`) if validation fails.
     - Return `404 Not Found` if movie ID not found.
   - **Behavior**:
     - Generates unique review `id` (e.g. `rev-${Date.now()}`), sets ISO string `date` (`new Date().toISOString()`).
     - Appends review object to movie's `reviews` array.
     - Appends `rating` to movie's `ratings` array.
   - **Status**: `201 Created`
   - **Response Body**:
     ```json
     {
       "message": "Review submitted successfully",
       "review": { "id": "rev-1730000000000", "author": "Marcus Brody", "rating": 5, "comment": "...", "date": "..." },
       "averageRating": 4.7,
       "ratingCount": 6,
       "reviewCount": 2
     }
     ```

5. **Static File Fallback / Health Check**:
   - `GET /health` or `GET /api/health` returns `{ "status": "ok" }`.
   - `app.use(express.static('.'))` allows serving static frontend assets directly from port 3000 for local standalone testing.

### 3.4 `package.json` Specifications
- Name: `movie-database-reviews-app`
- Main: `server.js`
- Scripts: `"start": "node server.js"`, `"dev": "node --watch server.js"`
- Dependencies: `express`, `cors`

---

## 4. Frontend DOM IDs, HTML Structure & Styling Contracts (`index.html` & `styles.css` - SCRUM-129)

### 4.1 HTML Structure (`index.html`) Contract
`index.html` must provide the exact IDs and element hierarchies:

- **Document Head**:
  - `<meta charset="UTF-8">`
  - `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
  - `<title>CineCritique - Movie Database & Reviews</title>`
  - `<link rel="stylesheet" href="styles.css">`

- **App Header & Navigation**:
  - Container: `<header class="app-header">`
  - Logo/Branding: `<div class="logo"><span class="logo-icon">🎬</span> CineCritique</div>`
  - Search & Filter Controls:
    - Search input: `<input type="text" id="search-input" placeholder="Search movies by title, director, keyword..." aria-label="Search movies">`
    - Genre filter dropdown: `<select id="genre-filter" aria-label="Filter by genre"><option value="all">All Genres</option></select>`

- **Status & Loading Feedback**:
  - `<div id="status-message" class="status-message hidden" aria-live="polite"></div>`
  - `<div id="loading-spinner" class="spinner hidden"></div>`

- **Movie Catalog Section**:
  - Container: `<main class="catalog-container">`
  - Section Header: `<h2 class="section-title">Explore Catalog</h2>`
  - Movies Grid Container: `<div id="movie-grid" class="movie-grid" role="region" aria-label="Movie Catalog"></div>`

- **Movie Card Template Structure** (Rendered dynamically into `#movie-grid`):
  ```html
  <article class="movie-card" data-movie-id="${movie.id}">
    <img class="movie-poster" src="${movie.posterUrl}" alt="${movie.title} poster" loading="lazy">
    <div class="movie-card-info">
      <span class="movie-card-genre">${movie.genre}</span>
      <h3 class="movie-card-title">${movie.title} <span class="movie-year">(${movie.year})</span></h3>
      <p class="movie-director">Directed by ${movie.director}</p>
      <div class="movie-card-rating">
        <span class="star-icon">★</span>
        <span class="rating-value">${movie.averageRating}</span>
        <span class="rating-count">(${movie.ratingCount} ratings)</span>
      </div>
      <button class="btn btn-secondary view-details-btn" data-movie-id="${movie.id}">View Reviews</button>
    </div>
  </article>
  ```

- **Movie Details & Review Modal**:
  - Modal Backdrop: `<div id="movie-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title">`
  - Modal Card: `<div class="modal-content">`
  - Modal Close Button: `<button id="close-modal-btn" class="modal-close-btn" aria-label="Close modal">&times;</button>`
  - Details Container: `<div id="modal-movie-details"></div>` (displays movie title, director, year, genre, poster, synopsis, average rating)
  - Review & Rating Section: `<div class="modal-review-section">`
    - Subheading: `<h3>Add Your Review</h3>`
    - Star Rating Input Widget:
      - Container: `<div id="rating-widget" class="rating-widget" role="radiogroup" aria-label="Star Rating">`
      - 5 interactive star buttons:
        - `<button type="button" class="star-btn" data-value="1" aria-label="1 star">★</button>`
        - `<button type="button" class="star-btn" data-value="2" aria-label="2 stars">★</button>`
        - `<button type="button" class="star-btn" data-value="3" aria-label="3 stars">★</button>`
        - `<button type="button" class="star-btn" data-value="4" aria-label="4 stars">★</button>`
        - `<button type="button" class="star-btn" data-value="5" aria-label="5 stars">★</button>`
    - Review Form:
      - `<form id="review-form">`
      - Hidden Rating Input: `<input type="hidden" id="review-rating" name="rating" value="0">`
      - Author Input: `<input type="text" id="review-author" placeholder="Your Name" required>`
      - Comment Input: `<textarea id="review-comment" placeholder="Share your thoughts about this movie..." rows="3" required></textarea>`
      - Submit Button: `<button type="submit" id="submit-review-btn" class="btn btn-primary">Submit Review</button>`
  - Existing Reviews Section:
    - Subheading: `<h3>Community Reviews (<span id="modal-review-count">0</span>)</h3>`
    - Review List: `<div id="modal-reviews-list" class="reviews-list"></div>`

- **Review Item Template Structure** (Rendered into `#modal-reviews-list`):
  ```html
  <div class="review-item">
    <div class="review-header">
      <strong class="review-author">${review.author}</strong>
      <span class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
      <time class="review-date">${formattedDate}</time>
    </div>
    <p class="review-comment">${review.comment}</p>
  </div>
  ```

- **Toast Notification**:
  - `<div id="toast" class="toast hidden" role="alert"></div>`

- **Script Inclusions** (Placed at the end of `<body>`):
  ```html
  <script src="api.js"></script>
  <script src="app.js"></script>
  ```

### 4.2 CSS Styling Contracts (`styles.css`)
- **Theme Variables**:
  ```css
  :root {
    --bg-dark: #0f172a;
    --surface-dark: #1e293b;
    --surface-hover: #334155;
    --border-color: #334155;
    --accent-red: #e50914;
    --gold-star: #fbbf24;
    --text-primary: #f8fafc;
    --text-muted: #94a3b8;
    --radius-md: 10px;
    --radius-lg: 16px;
    --transition: 0.2s ease;
  }
  ```
- **Grid Layout**: Responsive CSS Grid for `#movie-grid` using `repeat(auto-fill, minmax(260px, 1fr))` with 1.5rem gap.
- **Card Styling**: Poster aspect ratio `2 / 3` with `object-fit: cover`, smooth transform hover effect (`translateY(-4px)`), box shadow.
- **Star Rating Widget**: Golden stars (`--gold-star`), interactive hover highlighting (all stars up to hovered button glow), `.selected` class persists chosen rating.
- **Modal Dialog**: Fixed full-viewport overlay with backdrop blur, scrollable modal card, smooth open/close animation.
- **Utility Classes**: `.hidden { display: none !important; }`, `.btn`, `.btn-primary`, `.btn-secondary`.
- **Responsive**: Mobile-first fluid layout supporting screens from 320px to 4K displays.

---

## 5. Client API Wrapper & UI Controller (`api.js` & `app.js` - SCRUM-130)

### 5.1 API Client Interface (`api.js`)
Exposes `window.MovieAPI` with asynchronous methods. Handles dual-mode operation (connecting to Express backend if available, or seamlessly falling back to comprehensive in-memory seed data with localStorage persistence if accessed statically via Nginx on port 8080):
```javascript
const MovieAPI = {
  baseUrl: window.location.port === '8080' || window.location.port === '3000' ? '/api' : 'http://localhost:3000/api',

  // Fallback seed catalog in case REST API backend is not directly reached
  seedCatalog: [ /* ... at least 6 detailed movies ... */ ],

  async getMovies(params = {}) {
    // Attempt fetch(`${this.baseUrl}/movies?...`)
    // On failure, filter and return from local seed catalog
  },

  async getMovieById(id) {
    // Attempt fetch(`${this.baseUrl}/movies/${id}`)
    // On failure, find and return from local seed catalog
  },

  async submitRating(movieId, rating) {
    // Attempt POST `${this.baseUrl}/movies/${movieId}/ratings`
    // On failure, update local seed catalog ratings array and recalculate average
  },

  async submitReview(movieId, reviewData) {
    // Attempt POST `${this.baseUrl}/movies/${movieId}/reviews`
    // On failure, create review item, append to movie's reviews and ratings, update local seed catalog
  }
};
window.MovieAPI = MovieAPI;
```

### 5.2 Application Controller Contract (`app.js`)
On `DOMContentLoaded`:
1. **Catalog Initialization**:
   - Calls `MovieAPI.getMovies()`.
   - Extracts unique genres to populate `#genre-filter` dropdown.
   - Renders movie cards into `#movie-grid`.
2. **Search and Filtering**:
   - `input` event on `#search-input` and `change` event on `#genre-filter`.
   - Performs real-time filtering, updating `#movie-grid` with matching movie cards or friendly empty state message.
3. **Modal Dialog Open/Close**:
   - Event delegation on `#movie-grid` for `.view-details-btn` or card clicks.
   - Calls `MovieAPI.getMovieById(movieId)`, populates `#modal-movie-details`, `#modal-review-count`, and `#modal-reviews-list`.
   - Removes `.hidden` from `#movie-modal`.
   - Closes modal on `#close-modal-btn` click, clicking backdrop outside modal card, or pressing `Escape`.
4. **Interactive 5-Star Rating Widget**:
   - Mouse hover (`mouseenter`/`mouseleave`) on `.star-btn[data-value="N"]` highlights stars 1 through N with gold fill.
   - Click on `.star-btn[data-value="N"]`:
     - Sets `#review-rating` hidden input value to `N`.
     - Adds `.selected` class to stars 1..N.
5. **Review Submission Handling**:
   - Intercepts `submit` event on `#review-form`.
   - Validates that star rating >= 1, and author / comment fields are non-empty.
   - Submits via `MovieAPI.submitReview(activeMovieId, { author, rating, comment })`.
   - On success:
     - Prepends newly created review to `#modal-reviews-list`.
     - Updates `#modal-review-count` and modal rating statistics.
     - Refreshes movie card rating badge in `#movie-grid`.
     - Resets review form and star rating widget.
     - Triggers `#toast` notification ("Review submitted successfully!").
   - On error:
     - Shows error toast or status message.

---

## 6. Containerization & Deployment (`Dockerfile`, `nginx.conf`, `.dockerignore` - SCRUM-129)

### 6.1 `Dockerfile`
```dockerfile
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html/
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

### 6.2 `nginx.conf`
```nginx
server {
    listen 8080;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to Node Express backend if available
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6.3 `.dockerignore`
```text
.git
node_modules
npm-debug.log
DESIGN.md
cloudbuild.yaml
```

---

## 7. Task-to-File Mapping & Execution Waves

All sprint tasks are partitioned with **100% disjoint file ownership**. Athos, Porthos, and Aramis can execute simultaneously in **Wave 1 (Parallel)** with zero risk of merge conflicts:

| Task Key | Task Title | Developer | Target Files | Wave |
|---|---|---|---|---|
| `SCRUM-127` | Backend In-Memory Database & REST API Service | Porthos | `server.js`, `package.json` | **Wave 1 (Parallel)** |
| `SCRUM-129` | Frontend Responsive UI, Layout & Visual Styling | Athos | `index.html`, `styles.css`, `Dockerfile`, `nginx.conf`, `.dockerignore` | **Wave 1 (Parallel)** |
| `SCRUM-130` | Client-Side Controller, Dynamic Event Handling & API Integration | Aramis | `api.js`, `app.js` | **Wave 1 (Parallel)** |

### Developer Execution Guidance
- **Porthos (`SCRUM-127`)**:
  - Owns: `server.js`, `package.json`
  - Implement Express server on port 3000 with CORS and JSON parsing.
  - Seed in-memory movie array (>= 6 movies across diverse genres).
  - Provide endpoints: `GET /api/movies`, `GET /api/movies/:id`, `POST /api/movies/:id/ratings`, `POST /api/movies/:id/reviews`.
- **Athos (`SCRUM-129`)**:
  - Owns: `index.html`, `styles.css`, `Dockerfile`, `nginx.conf`, `.dockerignore`
  - Implement semantic HTML layout and exact DOM IDs detailed in Section 4.1.
  - Implement responsive dark cinematic stylesheet matching class contracts in Section 4.2.
  - Implement Nginx Alpine Dockerfile listening on port 8080, `nginx.conf`, and `.dockerignore`.
- **Aramis (`SCRUM-130`)**:
  - Owns: `api.js`, `app.js`
  - Implement `window.MovieAPI` communicating with backend endpoints and fallback seed catalog.
  - Implement `app.js` wiring up catalog display, search/filter inputs, modal controls, 5-star interactive rating widget, and dynamic review submission.
