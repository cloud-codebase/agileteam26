# Technical Blueprint & Architecture Design: Movie Review & Rating Web Application

## 1. Overview & Technical Stack
- **Feature Branch**: `feature-movie-app`
- **Application Type**: Full-Stack Client-Server Movie Review & Rating Application
- **Frontend Stack**: Vanilla HTML5, CSS3, Modern ES6+ JavaScript (Zero external frontend frameworks or build steps)
- **Backend Stack**: Node.js & Express REST API with In-Memory Data Store, Input Validation, and CORS support
- **Containerization**: Lightweight Nginx container listening on port `8080` serving static frontend assets and routing API requests
- **Design Philosophy**: Strict file separation and decoupled contract boundaries enabling parallel implementation by Athos, Porthos, and Aramis without merge conflicts.

---

## 2. Modular File Tree & Task Ownership
```text
.
├── DESIGN.md           # Architecture blueprint & technical contracts (ArchitectAlex)
├── server.js           # Express REST API, in-memory store, seed data, validation (SCRUM-123)
├── package.json        # Node.js backend dependencies and start scripts (SCRUM-123)
├── index.html          # Semantic HTML5 layout, catalog view, modal, review form (SCRUM-124)
├── styles.css          # Cinematic dark theme, responsive grid, modal & star styles (SCRUM-124)
├── Dockerfile          # Nginx container configuration listening on port 8080 (SCRUM-124)
├── nginx.conf          # Nginx server block routing static files & proxying /api/ (SCRUM-124)
├── .dockerignore       # Ignored files for Docker build context (SCRUM-124)
├── api.js              # Client-side REST API wrapper and HTTP communication (SCRUM-125)
└── app.js              # UI controller, event bindings, star widget, dynamic DOM updates (SCRUM-125)
```

---

## 3. Backend REST API Specification (`server.js` - SCRUM-123)

### 3.1 Data Model & Seed Movies
Each movie record in the in-memory array contains:
```javascript
{
  id: 1,
  title: "Inception",
  year: 2010,
  genre: "Sci-Fi",
  director: "Christopher Nolan",
  posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500",
  synopsis: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
  ratings: [5, 4, 5, 5, 4], // Array of numeric ratings (1-5)
  reviews: [
    {
      id: "rev-1",
      author: "Alice",
      rating: 5,
      comment: "A mind-bending cinematic masterpiece with stunning visuals!",
      date: "2026-10-25T12:00:00Z"
    }
  ]
}
```
*Provide at least 5 diverse seed movies across genres (e.g., Sci-Fi, Drama, Action, Animation, Thriller).*

### 3.2 Computed Movie Fields
When returning movies in `GET /api/movies` or `GET /api/movies/:id`, compute:
- `averageRating`: Rounded to 1 decimal place (e.g., `4.6`), or `0` if no ratings.
- `ratingCount`: Total count of ratings (`ratings.length`).
- `reviewCount`: Total count of reviews (`reviews.length`).

### 3.3 Endpoints Contract
Express app runs on `process.env.PORT || 3000` with `cors()` enabled and `express.json()` middleware.

1. `GET /api/movies`
   - **Query Params**: Optional `?genre=Sci-Fi` or `?search=Inception`
   - **Status**: `200 OK`
   - **Response Body**: Array of movie summary objects (all movie fields, computed `averageRating`, `ratingCount`, `reviewCount`).

2. `GET /api/movies/:id`
   - **Status**: `200 OK` on match; `404 Not Found` if id not found (`{ "error": "Movie not found" }`).
   - **Response Body**: Single movie object with complete `reviews` array and computed ratings.

3. `POST /api/movies/:id/ratings`
   - **Request Body**: `{ "rating": 5 }`
   - **Validation**: `rating` must be an integer between 1 and 5. Return `400 Bad Request` if invalid.
   - **Behavior**: Appends rating to movie's `ratings` array.
   - **Status**: `200 OK`
   - **Response Body**: `{ "message": "Rating submitted successfully", "averageRating": 4.7, "ratingCount": 6 }`

4. `POST /api/movies/:id/reviews`
   - **Request Body**:
     ```json
     {
       "author": "Marcus",
       "rating": 5,
       "comment": "Unbelievable storytelling and directing!"
     }
     ```
   - **Validation**: `author` (non-empty string), `comment` (non-empty string), `rating` (integer 1-5). Return `400 Bad Request` if missing or invalid.
   - **Behavior**:
     - Generates unique review `id` (e.g. `rev-${Date.now()}`), sets ISO string `date`.
     - Appends review to `reviews` array.
     - Also pushes `rating` to movie's `ratings` array.
   - **Status**: `201 Created`
   - **Response Body**:
     ```json
     {
       "message": "Review added successfully",
       "review": { "id": "rev-...", "author": "Marcus", "rating": 5, "comment": "...", "date": "..." },
       "averageRating": 4.7,
       "ratingCount": 6,
       "reviewCount": 2
     }
     ```

5. Static File Fallback (Optional convenience for dev):
   - `app.use(express.static('.'))` allows serving frontend directly from port 3000 if accessed directly.

---

## 4. Frontend DOM IDs, HTML Structure & Styling Contracts (`index.html` & `styles.css` - SCRUM-124)

### 4.1 HTML Structure (`index.html`) Contract
`index.html` must provide the exact IDs and element hierarchies:

- **App Header & Navigation**:
  - Container: `<header class="app-header">`
  - Logo/Title: `<div class="logo"><span class="logo-icon">🎬</span> CineCritique</div>`
  - Search bar input: `<input type="text" id="search-input" placeholder="Search movies by title, director...">`
  - Genre filter dropdown: `<select id="genre-filter"><option value="all">All Genres</option></select>`

- **Status & Loading Indicator**:
  - `<div id="status-message" class="status-message hidden" aria-live="polite"></div>`
  - `<div id="loading-spinner" class="spinner hidden"></div>`

- **Movie Catalog Section**:
  - Container: `<main class="catalog-container">`
  - Section Header: `<h2 class="section-title">Now Showing</h2>`
  - Movies Grid: `<div id="movie-grid" class="movie-grid" role="region" aria-label="Movie Catalog"></div>`

- **Movie Card Template / Render Contract** (Populated dynamically into `#movie-grid`):
  ```html
  <div class="movie-card" data-movie-id="${movie.id}">
    <img class="movie-poster" src="${movie.posterUrl}" alt="${movie.title} poster" loading="lazy">
    <div class="movie-card-info">
      <div class="movie-card-genre">${movie.genre}</div>
      <h3 class="movie-card-title">${movie.title} (${movie.year})</h3>
      <div class="movie-card-rating">
        <span class="star-icon">★</span>
        <span class="rating-value">${movie.averageRating}</span>
        <span class="rating-count">(${movie.ratingCount} ratings)</span>
      </div>
      <button class="btn btn-secondary view-details-btn" data-movie-id="${movie.id}">View Reviews</button>
    </div>
  </div>
  ```

- **Movie Details & Review Modal**:
  - Modal Backdrop: `<div id="movie-modal" class="modal hidden" role="dialog" aria-modal="true">`
  - Modal Content: `<div class="modal-content">`
  - Close button: `<button id="close-modal-btn" class="modal-close-btn" aria-label="Close modal">&times;</button>`
  - Details Container: `<div id="modal-movie-details"></div>`
    - Title, director, year, genre badge, synopsis, current average rating display.
  - Review & Rating Section: `<div class="modal-review-section">`
    - Subtitle: `<h3>Add Your Review</h3>`
    - Star Rating Input Container:
      - `<div id="rating-widget" class="rating-widget" role="radiogroup" aria-label="Star Rating">`
      - 5 interactive star buttons:
        - `<button type="button" class="star-btn" data-value="1" aria-label="1 star">★</button>`
        - `<button type="button" class="star-btn" data-value="2" aria-label="2 stars">★</button>`
        - `<button type="button" class="star-btn" data-value="3" aria-label="3 stars">★</button>`
        - `<button type="button" class="star-btn" data-value="4" aria-label="4 stars">★</button>`
        - `<button type="button" class="star-btn" data-value="5" aria-label="5 stars">★</button>`
    - Review Form:
      - `<form id="review-form">`
      - Hidden rating input: `<input type="hidden" id="review-rating" name="rating" value="0">`
      - Author input: `<input type="text" id="review-author" placeholder="Your Name" required>`
      - Comment input: `<textarea id="review-comment" placeholder="Write your review here..." rows="3" required></textarea>`
      - Submit button: `<button type="submit" id="submit-review-btn" class="btn btn-primary">Submit Review</button>`
  - Existing Reviews Section:
    - Subtitle: `<h3>User Reviews (<span id="modal-review-count">0</span>)</h3>`
    - Reviews list container: `<div id="modal-reviews-list" class="reviews-list"></div>`

- **Toast Notification**:
  - `<div id="toast" class="toast hidden" role="alert"></div>`

- **Script Inclusions**:
  ```html
  <script src="api.js"></script>
  <script src="app.js"></script>
  ```

### 4.2 CSS Styling Contracts (`styles.css`)
- **Theme**: Modern cinematic dark palette (`--bg: #0f172a`, `--surface: #1e293b`, `--surface-hover: #334155`, `--accent: #e50914`, `--gold: #fbbf24`, `--text: #f8fafc`, `--text-muted: #94a3b8`).
- **Catalog Grid (`.movie-grid`)**: Responsive CSS Grid (`display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.5rem;`).
- **Movie Cards (`.movie-card`)**: Rounded corners (`border-radius: 12px`), smooth hover transforms (`transform: translateY(-4px); box-shadow: 0 10px 25px rgba(0,0,0,0.5)`), poster aspect-ratio (`2 / 3`), overflow hidden.
- **Star Rating Widget (`.rating-widget`, `.star-btn`)**: Large golden stars, hover highlighting (fills stars up to hovered position), `.selected` class for chosen rating.
- **Modal (`.modal`, `.modal-content`)**: Fixed overlay backdrop with blur, centered card with max-width `700px`, scrollable content, smooth open transition.
- **Toast (`.toast`)**: Fixed bottom-right notification pill with slide-in animation, success/error color variants.
- **Responsive**: Mobile-friendly down to 320px viewport.

---

## 5. Client-Side API Integration & UI Controller (`api.js` & `app.js` - SCRUM-125)

### 5.1 API Client Interface (`api.js`)
Exposes `window.MovieAPI` with asynchronous methods:
```javascript
const MovieAPI = {
  // Automatically detects if running behind Nginx or direct Express
  baseUrl: window.location.port === '8080' || window.location.port === '3000' ? '/api' : 'http://localhost:3000/api',

  async getMovies(params = {}) {
    // Returns array of movies
  },

  async getMovieById(id) {
    // Returns single movie details with reviews
  },

  async submitRating(movieId, rating) {
    // Sends POST /api/movies/:id/ratings
  },

  async submitReview(movieId, reviewData) {
    // Sends POST /api/movies/:id/reviews
  }
};
window.MovieAPI = MovieAPI;
```

### 5.2 Application Controller Contract (`app.js`)
On `DOMContentLoaded`:
1. **Catalog Rendering**:
   - Calls `MovieAPI.getMovies()`, populates `#genre-filter` with unique genres.
   - Renders movie cards into `#movie-grid`.
2. **Search & Filter**:
   - Input listener on `#search-input` and change listener on `#genre-filter`.
   - Filters movies in-place or requests filtered list, updates `#movie-grid`.
3. **Modal Handling**:
   - Clicking `.view-details-btn` or card opens `#movie-modal`.
   - Fetches full details via `MovieAPI.getMovieById(movieId)`.
   - Renders movie summary, existing reviews in `#modal-reviews-list`, and resets rating widget & form.
   - Clicking `#close-modal-btn` or modal backdrop closes the modal.
4. **Interactive 5-Star Rating Widget**:
   - Mouse hover over `.star-btn[data-value="N"]` highlights stars 1 through N.
   - Click on `.star-btn[data-value="N"]` sets `#review-rating` input value to N and adds `.selected` class to stars 1..N.
5. **Review Submission**:
   - Intercepts `#review-form` submit event.
   - Validates that a star rating >= 1 is selected, author and comment are non-empty.
   - Calls `MovieAPI.submitReview(activeMovieId, { author, rating, comment })`.
   - On success:
     - Prepend new review to `#modal-reviews-list`.
     - Update `#modal-review-count` and movie rating summary.
     - Reset form and star widget.
     - Display success notification via `showToast('Review submitted successfully!')`.
     - Update corresponding card in `#movie-grid` with updated `averageRating`.
   - On error: Displays error message in toast or `#status-message`.

---

## 6. Containerization & Deployment (`Dockerfile` & `nginx.conf` - SCRUM-124)

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

    # Proxy API calls to Node Express backend if running in same container/host
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

All tasks operate on completely disjoint target files. Athos, Porthos, and Aramis can develop, test, and commit in **Wave 1 in parallel** without any merge conflicts:

| Task Key | Task Title | Developer | Target Files | Wave |
|---|---|---|---|---|
| `SCRUM-123` | Backend REST API Service with In-Memory Movie Database | Porthos | `server.js`, `package.json` | **Wave 1 (Parallel)** |
| `SCRUM-124` | Frontend UI Structure, Modern Styling & Movie Catalog Views | Athos | `index.html`, `styles.css`, `Dockerfile`, `nginx.conf`, `.dockerignore` | **Wave 1 (Parallel)** |
| `SCRUM-125` | Client-Server API Integration, Rating Widget & Interactive Review Flow | Aramis | `api.js`, `app.js` | **Wave 1 (Parallel)** |

### Developer Execution Instructions
- **Porthos (SCRUM-123)**:
  - Implement `server.js` and `package.json` with dependencies (`express`, `cors`).
  - Provide seed data with at least 5 movies with full fields.
  - Expose `GET /api/movies`, `GET /api/movies/:id`, `POST /api/movies/:id/ratings`, and `POST /api/movies/:id/reviews`.
  - Ensure CORS is enabled and port `3000` is default.
- **Athos (SCRUM-124)**:
  - Build `index.html` with semantic containers and exact element IDs specified in Section 4.1.
  - Implement `styles.css` with dark cinematic aesthetic, responsive movie card grid, modal styling, star widget visual states, and toast notifications.
  - Provide `Dockerfile`, `nginx.conf`, and `.dockerignore` listening on port `8080`.
- **Aramis (SCRUM-125)**:
  - Implement `api.js` wrapping the REST endpoints with clear Promise-based helper functions (`window.MovieAPI`).
  - Implement `app.js` managing catalog rendering, search/genre filters, modal open/close, star widget interaction, form submission, and live review appending.
