/**
 * CineScope — Movie Database & Community Reviews Application
 * Pure Vanilla JavaScript (ES6+)
 */

// ============================================================================
// Fallback Seed Data (Used if API backend is not yet accessible)
// ============================================================================
const DEFAULT_MOVIES = [
  {
    id: "1",
    title: "Inception",
    year: 2010,
    director: "Christopher Nolan",
    duration: "148 min",
    genres: ["Sci-Fi", "Action", "Adventure"],
    synopsis: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster.",
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    rating: 4.8,
    ratingsCount: 142,
    ratings: [5, 5, 4, 5, 5],
    reviews: [
      {
        id: "rev-1",
        author: "Sarah Connor",
        rating: 5,
        text: "An absolute masterpiece of modern cinema. Mind-bending concept executed to perfection.",
        date: "2025-01-10"
      },
      {
        id: "rev-2",
        author: "Neo99",
        rating: 4,
        text: "Visually stunning and the Hans Zimmer score is phenomenal. Highly recommended!",
        date: "2025-02-01"
      }
    ],
    comments: [
      {
        id: "com-1",
        author: "CinephileDan",
        text: "Did the spinning top fall at the end? What's your theory?",
        date: "2025-02-14"
      },
      {
        id: "com-2",
        author: "Maya Lin",
        text: "The sound design in IMAX was simply unforgettable.",
        date: "2025-02-15"
      }
    ]
  },
  {
    id: "2",
    title: "The Shawshank Redemption",
    year: 1994,
    director: "Frank Darabont",
    duration: "142 min",
    genres: ["Drama", "Crime"],
    synopsis: "Over the course of several years, two convicts form a friendship, seeking solace and, eventually, redemption through basic compassion.",
    poster: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
    rating: 4.9,
    ratingsCount: 310,
    ratings: [5, 5, 5, 5, 4],
    reviews: [
      {
        id: "rev-3",
        author: "Morgan Freeman Fan",
        rating: 5,
        text: "Hope is a good thing, maybe the best of things, and no good thing ever dies. Timeless.",
        date: "2024-12-20"
      }
    ],
    comments: [
      {
        id: "com-3",
        author: "Red_Ellis",
        text: "One of the few movies that gets better with every single rewatch.",
        date: "2025-01-05"
      }
    ]
  },
  {
    id: "3",
    title: "The Dark Knight",
    year: 2008,
    director: "Christopher Nolan",
    duration: "152 min",
    genres: ["Action", "Crime", "Drama"],
    synopsis: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    poster: "https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=600&q=80",
    rating: 4.9,
    ratingsCount: 285,
    ratings: [5, 5, 5, 4, 5],
    reviews: [
      {
        id: "rev-4",
        author: "BruceW",
        rating: 5,
        text: "Heath Ledger's Joker is legendary. The pacing, atmosphere, and tension are unrivaled.",
        date: "2025-01-18"
      }
    ],
    comments: [
      {
        id: "com-4",
        author: "Gordon_Jim",
        text: "The interrogation scene is the finest dramatic acting in comic book cinema.",
        date: "2025-02-03"
      }
    ]
  },
  {
    id: "4",
    title: "Interstellar",
    year: 2014,
    director: "Christopher Nolan",
    duration: "169 min",
    genres: ["Sci-Fi", "Adventure", "Drama"],
    synopsis: "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.",
    poster: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
    rating: 4.7,
    ratingsCount: 198,
    ratings: [5, 4, 5, 5, 4],
    reviews: [
      {
        id: "rev-5",
        author: "Cooper_J",
        rating: 5,
        text: "Emotionally devastating and scientifically awe-inspiring. Love transcends time and space.",
        date: "2025-01-22"
      }
    ],
    comments: [
      {
        id: "com-5",
        author: "Murph",
        text: "That docking scene still gives me goosebumps every time.",
        date: "2025-02-10"
      }
    ]
  },
  {
    id: "5",
    title: "Pulp Fiction",
    year: 1994,
    director: "Quentin Tarantino",
    duration: "154 min",
    genres: ["Crime", "Drama"],
    synopsis: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
    poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80",
    rating: 4.7,
    ratingsCount: 220,
    ratings: [5, 4, 5, 5, 4],
    reviews: [
      {
        id: "rev-6",
        author: "Jules_W",
        rating: 5,
        text: "Iconic dialogues, eccentric soundtrack, and non-linear storytelling at its finest.",
        date: "2025-01-12"
      }
    ],
    comments: [
      {
        id: "com-6",
        author: "VincentVega",
        text: "What do they call a Quarter Pounder with cheese in Paris?",
        date: "2025-01-30"
      }
    ]
  },
  {
    id: "6",
    title: "Spirited Away",
    year: 2001,
    director: "Hayao Miyazaki",
    duration: "125 min",
    genres: ["Animation", "Adventure"],
    synopsis: "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, and where humans are changed into beasts.",
    poster: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80",
    rating: 4.8,
    ratingsCount: 165,
    ratings: [5, 5, 5, 4, 5],
    reviews: [
      {
        id: "rev-7",
        author: "ChihiroFan",
        rating: 5,
        text: "Studio Ghibli's crown jewel. Rich in symbolism, breathtaking art, and pure imagination.",
        date: "2025-02-04"
      }
    ],
    comments: [
      {
        id: "com-7",
        author: "Haku",
        text: "Joe Hisaishi's score 'One Summer's Day' is perfection.",
        date: "2025-02-11"
      }
    ]
  },
  {
    id: "7",
    title: "Parasite",
    year: 2019,
    director: "Bong Joon-ho",
    duration: "132 min",
    genres: ["Drama", "Thriller"],
    synopsis: "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
    poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80",
    rating: 4.6,
    ratingsCount: 175,
    ratings: [5, 4, 5, 4, 5],
    reviews: [
      {
        id: "rev-8",
        author: "FilmBuffK",
        rating: 5,
        text: "Masterfully crafted social thriller. Deserved every single Oscar it won.",
        date: "2025-02-08"
      }
    ],
    comments: [
      {
        id: "com-8",
        author: "Jessica_Illinois",
        text: "The transition between the first and second half of the movie is astonishing.",
        date: "2025-02-12"
      }
    ]
  },
  {
    id: "8",
    title: "Casablanca",
    year: 1942,
    director: "Michael Curtiz",
    duration: "102 min",
    genres: ["Romance", "Drama"],
    synopsis: "A cynical expatriate American cafe owner struggles to decide whether or not to help his former lover and her fugitive husband escape the Nazis in French Morocco.",
    poster: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=600&q=80",
    rating: 4.5,
    ratingsCount: 110,
    ratings: [5, 4, 4, 5, 4],
    reviews: [
      {
        id: "rev-9",
        author: "Rick_Blaine",
        rating: 5,
        text: "Here's looking at you, kid. One of the greatest screenplays ever written.",
        date: "2025-01-01"
      }
    ],
    comments: [
      {
        id: "com-9",
        author: "Ilsa_Lund",
        text: "Play it once, Sam. For old times' sake.",
        date: "2025-01-28"
      }
    ]
  }
];

// ============================================================================
// Application State & Controller
// ============================================================================
class MovieApp {
  constructor() {
    this.movies = [];
    this.selectedMovieId = null;
    this.apiAvailable = false;
    this.apiBaseUrl = '/api';

    // Form states
    this.selectedReviewRating = 5;
    this.selectedQuickRating = 0;

    // DOM Elements
    this.movieGrid = document.getElementById('movie-grid');
    this.emptyState = document.getElementById('empty-state');
    this.searchInput = document.getElementById('search-input');
    this.clearSearchBtn = document.getElementById('clear-search-btn');
    this.genreSelect = document.getElementById('genre-select');
    this.sortSelect = document.getElementById('sort-select');
    this.resultsCount = document.getElementById('results-count');
    this.resetFiltersBtn = document.getElementById('reset-filters-btn');
    this.emptyResetBtn = document.getElementById('empty-reset-btn');
    this.apiStatusBadge = document.getElementById('api-status-badge');
    this.modal = document.getElementById('movie-modal');
    this.modalBackdrop = document.getElementById('modal-backdrop');
    this.modalCloseBtn = document.getElementById('modal-close-btn');
    this.modalBody = document.getElementById('modal-body');
    this.toastContainer = document.getElementById('toast-container');
    this.brandHome = document.getElementById('brand-home');

    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadMovies();
    this.render();
  }

  // ============================================================================
  // Event Bindings
  // ============================================================================
  bindEvents() {
    // Search input
    this.searchInput.addEventListener('input', () => {
      this.clearSearchBtn.style.display = this.searchInput.value.trim() ? 'block' : 'none';
      this.render();
    });

    this.clearSearchBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.clearSearchBtn.style.display = 'none';
      this.render();
      this.searchInput.focus();
    });

    // Filters & Sorting
    this.genreSelect.addEventListener('change', () => this.render());
    this.sortSelect.addEventListener('change', () => this.render());

    // Reset filters
    this.resetFiltersBtn.addEventListener('click', () => this.resetFilters());
    this.emptyResetBtn.addEventListener('click', () => this.resetFilters());
    this.brandHome.addEventListener('click', () => this.resetFilters());

    // Modal Close
    this.modalCloseBtn.addEventListener('click', () => this.closeModal());
    this.modalBackdrop.addEventListener('click', () => this.closeModal());

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display !== 'none') {
        this.closeModal();
      }
    });
  }

  resetFilters() {
    this.searchInput.value = '';
    this.clearSearchBtn.style.display = 'none';
    this.genreSelect.value = '';
    this.sortSelect.value = 'rating-desc';
    this.render();
  }

  // ============================================================================
  // Data Loading & API Integration
  // ============================================================================
  async loadMovies() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/movies`, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          this.movies = data;
          this.apiAvailable = true;
          this.updateApiStatus(true);
          return;
        }
      }
      throw new Error('API returned non-array or empty list');
    } catch (err) {
      // Graceful fallback to client-side data
      console.info('Backend REST API not reachable or empty. Using in-memory client seed data.', err.message);
      this.movies = JSON.parse(JSON.stringify(DEFAULT_MOVIES));
      this.apiAvailable = false;
      this.updateApiStatus(false);
    }
  }

  updateApiStatus(isOnline) {
    if (!this.apiStatusBadge) return;
    if (isOnline) {
      this.apiStatusBadge.className = 'badge badge-success';
      this.apiStatusBadge.textContent = 'REST API Connected';
    } else {
      this.apiStatusBadge.className = 'badge badge-info';
      this.apiStatusBadge.textContent = 'In-Memory Store (Local)';
    }
  }

  // ============================================================================
  // Filtering & Sorting
  // ============================================================================
  getFilteredMovies() {
    const query = this.searchInput.value.trim().toLowerCase();
    const genre = this.genreSelect.value;
    const sort = this.sortSelect.value;

    let filtered = this.movies.filter(movie => {
      const matchQuery = !query || 
        movie.title.toLowerCase().includes(query) ||
        (movie.director && movie.director.toLowerCase().includes(query)) ||
        (movie.synopsis && movie.synopsis.toLowerCase().includes(query)) ||
        (Array.isArray(movie.genres) && movie.genres.some(g => g.toLowerCase().includes(query)));

      const matchGenre = !genre || (Array.isArray(movie.genres) && movie.genres.includes(genre));

      return matchQuery && matchGenre;
    });

    // Sorting
    filtered.sort((a, b) => {
      const ratingA = Number(a.rating) || 0;
      const ratingB = Number(b.rating) || 0;
      const yearA = Number(a.year) || 0;
      const yearB = Number(b.year) || 0;
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();

      switch (sort) {
        case 'rating-desc':
          return ratingB - ratingA;
        case 'rating-asc':
          return ratingA - ratingB;
        case 'year-desc':
          return yearB - yearA;
        case 'year-asc':
          return yearA - yearB;
        case 'title-asc':
          return titleA.localeCompare(titleB);
        default:
          return 0;
      }
    });

    return filtered;
  }

  // ============================================================================
  // Rendering Catalog
  // ============================================================================
  render() {
    const movies = this.getFilteredMovies();
    const hasActiveFilter = Boolean(this.searchInput.value.trim() || this.genreSelect.value);

    // Update metadata counts
    this.resultsCount.textContent = `Showing ${movies.length} of ${this.movies.length} movies`;
    this.resetFiltersBtn.style.display = hasActiveFilter ? 'inline-block' : 'none';

    if (movies.length === 0) {
      this.movieGrid.innerHTML = '';
      this.movieGrid.style.display = 'none';
      this.emptyState.style.display = 'block';
      return;
    }

    this.emptyState.style.display = 'none';
    this.movieGrid.style.display = 'grid';

    this.movieGrid.innerHTML = movies.map(movie => this.createMovieCardHTML(movie)).join('');

    // Attach click listeners to cards
    this.movieGrid.querySelectorAll('.movie-card').forEach(card => {
      card.addEventListener('click', () => {
        const movieId = card.getAttribute('data-id');
        this.openModal(movieId);
      });
    });
  }

  createMovieCardHTML(movie) {
    const ratingDisplay = movie.rating !== undefined ? Number(movie.rating).toFixed(1) : 'N/A';
    const genresList = Array.isArray(movie.genres) ? movie.genres : [];
    const genrePills = genresList.slice(0, 3).map(g => `<span class="genre-pill">${this.escapeHTML(g)}</span>`).join('');
    const reviewsCount = Array.isArray(movie.reviews) ? movie.reviews.length : 0;
    const ratingsCount = movie.ratingsCount || (Array.isArray(movie.ratings) ? movie.ratings.length : 0);

    return `
      <article class="movie-card" data-id="${movie.id}" tabindex="0" role="button" aria-label="View details for ${this.escapeHTML(movie.title)}">
        <div class="card-poster-wrapper">
          <img 
            class="card-poster" 
            src="${this.escapeHTML(movie.poster || '')}" 
            alt="${this.escapeHTML(movie.title)} poster"
            loading="lazy"
            onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'card-poster-fallback\\'><div class=\\'card-poster-fallback-icon\\'>🎬</div><strong>${this.escapeHTML(movie.title)}</strong></div>';"
          />
          <div class="card-badge-rating">
            <span>⭐</span>
            <span>${ratingDisplay}</span>
          </div>
          <div class="card-badge-year">${movie.year || 'Unknown'}</div>
        </div>
        <div class="card-body">
          <h2 class="card-title">${this.escapeHTML(movie.title)}</h2>
          <div class="card-genres">${genrePills}</div>
          <p class="card-synopsis">${this.escapeHTML(movie.synopsis || 'No synopsis available.')}</p>
          <div class="card-footer">
            <span class="card-reviews-count">${reviewsCount} review${reviewsCount === 1 ? '' : 's'} · ${ratingsCount} ratings</span>
            <button class="btn-card-action" aria-hidden="true">
              Details <span>→</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  // ============================================================================
  // Modal / Movie Details View
  // ============================================================================
  async openModal(movieId) {
    this.selectedMovieId = movieId;
    let movie = this.movies.find(m => String(m.id) === String(movieId));

    // Try fetching freshest detail from API if available
    if (this.apiAvailable) {
      try {
        const res = await fetch(`${this.apiBaseUrl}/movies/${movieId}`);
        if (res.ok) {
          movie = await res.json();
          // Update in local cache
          const idx = this.movies.findIndex(m => String(m.id) === String(movieId));
          if (idx !== -1) this.movies[idx] = movie;
        }
      } catch (e) {
        console.warn('Failed to fetch detailed movie from API, using cached data.', e);
      }
    }

    if (!movie) return;

    this.renderModalContent(movie);
    this.modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.modal.style.display = 'none';
    document.body.style.overflow = '';
    this.selectedMovieId = null;
    this.selectedQuickRating = 0;
    this.selectedReviewRating = 5;
  }

  renderModalContent(movie) {
    const ratingDisplay = movie.rating !== undefined ? Number(movie.rating).toFixed(1) : 'N/A';
    const genresList = Array.isArray(movie.genres) ? movie.genres : [];
    const reviews = Array.isArray(movie.reviews) ? movie.reviews : [];
    const comments = Array.isArray(movie.comments) ? movie.comments : [];
    const ratingsCount = movie.ratingsCount || (Array.isArray(movie.ratings) ? movie.ratings.length : 0);

    const starsHtml = this.generateStarSymbols(Number(movie.rating) || 0);

    this.modalBody.innerHTML = `
      <!-- Header Section -->
      <div class="detail-header">
        <div class="detail-poster-wrapper">
          <img 
            class="detail-poster" 
            src="${this.escapeHTML(movie.poster || '')}" 
            alt="${this.escapeHTML(movie.title)}"
            onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'card-poster-fallback\\'><div class=\\'card-poster-fallback-icon\\'>🎬</div></div>';"
          />
        </div>
        <div class="detail-info">
          <h1 id="modal-movie-title" class="detail-title">${this.escapeHTML(movie.title)}</h1>
          <div class="detail-metadata">
            <span>📅 ${movie.year || 'N/A'}</span>
            <span>⏱️ ${this.escapeHTML(movie.duration || 'N/A')}</span>
            <span>🎬 Dir. ${this.escapeHTML(movie.director || 'N/A')}</span>
          </div>
          <div class="detail-genres">
            ${genresList.map(g => `<span class="genre-pill">${this.escapeHTML(g)}</span>`).join('')}
          </div>
          <div class="detail-synopsis-title">Synopsis</div>
          <p class="detail-synopsis">${this.escapeHTML(movie.synopsis || 'No synopsis available.')}</p>
        </div>
      </div>

      <!-- Aggregate Rating & Quick Rate Card -->
      <div class="aggregate-rating-box">
        <div class="rating-score-display">
          <div class="rating-number">${ratingDisplay}</div>
          <div class="rating-stars-and-count">
            <div class="stars-render">${starsHtml}</div>
            <div class="rating-votes-count">Based on ${ratingsCount} community ratings</div>
          </div>
        </div>

        <div class="rate-action-box">
          <div class="rate-label">Rate this movie:</div>
          <div class="star-rating-input" id="quick-star-rating">
            ${[1, 2, 3, 4, 5].map(star => `
              <button class="star-btn" data-value="${star}" title="${star} stars" type="button">★</button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="modal-tabs">
        <button class="tab-btn active" id="tab-btn-reviews" data-tab="reviews-tab">
          Reviews (${reviews.length})
        </button>
        <button class="tab-btn" id="tab-btn-comments" data-tab="comments-tab">
          Comments (${comments.length})
        </button>
      </div>

      <!-- Reviews Tab Pane -->
      <div class="tab-pane active" id="reviews-tab">
        <!-- Review Submission Form -->
        <div class="form-card">
          <h3 class="form-title">✍️ Leave a Review</h3>
          <form id="review-form">
            <div class="form-row">
              <div class="form-group">
                <label for="review-author">Your Name / Handle *</label>
                <input type="text" id="review-author" class="form-control" placeholder="e.g. CinemaLover" required />
              </div>
              <div class="form-group">
                <label>Your Rating *</label>
                <div class="star-rating-input" id="form-star-rating">
                  ${[1, 2, 3, 4, 5].map(star => `
                    <button class="star-btn ${star <= 5 ? 'active' : ''}" data-value="${star}" type="button">★</button>
                  `).join('')}
                </div>
              </div>
              <div class="form-group">
                <label for="review-text">Review Content *</label>
                <textarea id="review-text" class="form-control" placeholder="Share your honest critique or feelings about the film..." required></textarea>
              </div>
              <div class="form-actions">
                <span></span>
                <button type="submit" class="btn btn-primary" id="btn-submit-review">Submit Review</button>
              </div>
            </div>
          </form>
        </div>

        <!-- Reviews List -->
        <div class="feed-list" id="reviews-list">
          ${this.renderReviewsList(reviews)}
        </div>
      </div>

      <!-- Comments Tab Pane -->
      <div class="tab-pane" id="comments-tab">
        <!-- Comment Submission Form -->
        <div class="form-card">
          <h3 class="form-title">💬 Join the Discussion</h3>
          <form id="comment-form">
            <div class="form-row">
              <div class="form-group">
                <label for="comment-author">Your Name / Handle *</label>
                <input type="text" id="comment-author" class="form-control" placeholder="e.g. MovieBuff" required />
              </div>
              <div class="form-group">
                <label for="comment-text">Comment *</label>
                <textarea id="comment-text" class="form-control" placeholder="Ask a question, point out an easter egg, or share a thought..." required></textarea>
              </div>
              <div class="form-actions">
                <span></span>
                <button type="submit" class="btn btn-primary" id="btn-submit-comment">Post Comment</button>
              </div>
            </div>
          </form>
        </div>

        <!-- Comments List -->
        <div class="feed-list" id="comments-list">
          ${this.renderCommentsList(comments)}
        </div>
      </div>
    `;

    this.bindModalInteractiveElements(movie);
  }

  renderReviewsList(reviews) {
    if (!reviews || reviews.length === 0) {
      return `<div class="feed-empty">No reviews yet. Be the first to review this movie!</div>`;
    }

    return reviews.map(rev => {
      const stars = '★'.repeat(Math.max(1, Math.min(5, rev.rating || 5))) + '☆'.repeat(5 - Math.max(1, Math.min(5, rev.rating || 5)));
      const authorInitial = (rev.author || rev.user || 'A').charAt(0).toUpperCase();
      const authorName = rev.author || rev.user || 'Anonymous';
      const dateStr = rev.date ? new Date(rev.date).toLocaleDateString() : 'Just now';

      return `
        <div class="feed-item">
          <div class="feed-header">
            <div class="feed-user">
              <span class="feed-user-avatar">${authorInitial}</span>
              <span>${this.escapeHTML(authorName)}</span>
            </div>
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="color: var(--accent-gold); font-size: 0.9rem;">${stars}</span>
              <span class="feed-date">${dateStr}</span>
            </div>
          </div>
          <p class="feed-text">${this.escapeHTML(rev.text || rev.comment || '')}</p>
        </div>
      `;
    }).join('');
  }

  renderCommentsList(comments) {
    if (!comments || comments.length === 0) {
      return `<div class="feed-empty">No comments yet. Start the conversation!</div>`;
    }

    return comments.map(com => {
      const authorInitial = (com.author || com.user || 'A').charAt(0).toUpperCase();
      const authorName = com.author || com.user || 'Anonymous';
      const dateStr = com.date ? new Date(com.date).toLocaleDateString() : 'Just now';

      return `
        <div class="feed-item">
          <div class="feed-header">
            <div class="feed-user">
              <span class="feed-user-avatar">${authorInitial}</span>
              <span>${this.escapeHTML(authorName)}</span>
            </div>
            <span class="feed-date">${dateStr}</span>
          </div>
          <p class="feed-text">${this.escapeHTML(com.text || com.comment || '')}</p>
        </div>
      `;
    }).join('');
  }

  // ============================================================================
  // Modal Interactivity: Tabs, Ratings & Submissions
  // ============================================================================
  bindModalInteractiveElements(movie) {
    // Tabs switcher
    const tabBtns = this.modalBody.querySelectorAll('.tab-btn');
    const tabPanes = this.modalBody.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        const pane = this.modalBody.querySelector(`#${targetId}`);
        if (pane) pane.classList.add('active');
      });
    });

    // Quick Rating stars
    const quickStarContainer = this.modalBody.querySelector('#quick-star-rating');
    if (quickStarContainer) {
      const stars = quickStarContainer.querySelectorAll('.star-btn');
      stars.forEach(starBtn => {
        starBtn.addEventListener('mouseenter', () => {
          const val = Number(starBtn.getAttribute('data-value'));
          stars.forEach(s => s.classList.toggle('hovered', Number(s.getAttribute('data-value')) <= val));
        });

        starBtn.addEventListener('mouseleave', () => {
          stars.forEach(s => s.classList.remove('hovered'));
        });

        starBtn.addEventListener('click', async () => {
          const val = Number(starBtn.getAttribute('data-value'));
          this.selectedQuickRating = val;
          stars.forEach(s => s.classList.toggle('active', Number(s.getAttribute('data-value')) <= val));
          await this.submitRating(movie.id, val);
        });
      });
    }

    // Form Rating stars in Review Form
    const formStarContainer = this.modalBody.querySelector('#form-star-rating');
    if (formStarContainer) {
      const formStars = formStarContainer.querySelectorAll('.star-btn');
      this.selectedReviewRating = 5;

      formStars.forEach(starBtn => {
        starBtn.addEventListener('mouseenter', () => {
          const val = Number(starBtn.getAttribute('data-value'));
          formStars.forEach(s => s.classList.toggle('hovered', Number(s.getAttribute('data-value')) <= val));
        });

        formStars.addEventListener('mouseleave', () => {
          formStars.forEach(s => s.classList.remove('hovered'));
        });

        starBtn.addEventListener('click', () => {
          this.selectedReviewRating = Number(starBtn.getAttribute('data-value'));
          formStars.forEach(s => s.classList.toggle('active', Number(s.getAttribute('data-value')) <= this.selectedReviewRating));
        });
      });
    }

    // Review form submission
    const reviewForm = this.modalBody.querySelector('#review-form');
    if (reviewForm) {
      reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const author = this.modalBody.querySelector('#review-author').value.trim();
        const text = this.modalBody.querySelector('#review-text').value.trim();
        const rating = this.selectedReviewRating || 5;

        if (!author || !text) {
          this.showToast('Please fill in both name and review content.', 'error');
          return;
        }

        const submitBtn = this.modalBody.querySelector('#btn-submit-review');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        await this.submitReview(movie.id, { author, text, rating });

        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Review';
        reviewForm.reset();
        // Reset stars to 5
        this.selectedReviewRating = 5;
        if (formStarContainer) {
          formStarContainer.querySelectorAll('.star-btn').forEach(s => s.classList.add('active'));
        }
      });
    }

    // Comment form submission
    const commentForm = this.modalBody.querySelector('#comment-form');
    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const author = this.modalBody.querySelector('#comment-author').value.trim();
        const text = this.modalBody.querySelector('#comment-text').value.trim();

        if (!author || !text) {
          this.showToast('Please fill in both name and comment.', 'error');
          return;
        }

        const submitBtn = this.modalBody.querySelector('#btn-submit-comment');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        await this.submitComment(movie.id, { author, text });

        submitBtn.disabled = false;
        submitBtn.textContent = 'Post Comment';
        commentForm.reset();
      });
    }
  }

  // ============================================================================
  // Submission Handlers (Rating, Review, Comment)
  // ============================================================================
  async submitRating(movieId, ratingVal) {
    let success = false;
    if (this.apiAvailable) {
      try {
        const res = await fetch(`${this.apiBaseUrl}/movies/${movieId}/ratings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: ratingVal, user: 'User' })
        });
        if (res.ok) {
          success = true;
        }
      } catch (err) {
        console.warn('API rating submission failed, falling back to local update.', err);
      }
    }

    // Update locally
    const movie = this.movies.find(m => String(m.id) === String(movieId));
    if (movie) {
      if (!Array.isArray(movie.ratings)) movie.ratings = [];
      movie.ratings.push(ratingVal);
      movie.ratingsCount = (movie.ratingsCount || 0) + 1;

      // Recalculate average
      const sum = movie.ratings.reduce((acc, r) => acc + Number(r), 0);
      movie.rating = parseFloat((sum / movie.ratings.length).toFixed(1));

      // Refresh aggregate rating UI in modal
      const scoreNum = this.modalBody.querySelector('.rating-number');
      const starsRender = this.modalBody.querySelector('.stars-render');
      const votesCount = this.modalBody.querySelector('.rating-votes-count');

      if (scoreNum) scoreNum.textContent = movie.rating.toFixed(1);
      if (starsRender) starsRender.innerHTML = this.generateStarSymbols(movie.rating);
      if (votesCount) votesCount.textContent = `Based on ${movie.ratingsCount} community ratings`;

      this.render(); // update background card
      this.showToast(`Thank you! Rated ${ratingVal} ★`, 'success');
    }
  }

  async submitReview(movieId, { author, text, rating }) {
    const newReview = {
      id: `rev-${Date.now()}`,
      author: author,
      user: author,
      text: text,
      comment: text,
      rating: rating,
      date: new Date().toISOString()
    };

    if (this.apiAvailable) {
      try {
        const res = await fetch(`${this.apiBaseUrl}/movies/${movieId}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newReview)
        });
        if (res.ok) {
          const created = await res.json();
          if (created && created.id) {
            newReview.id = created.id;
          }
        }
      } catch (err) {
        console.warn('API review submission failed, falling back to local update.', err);
      }
    }

    // Local update
    const movie = this.movies.find(m => String(m.id) === String(movieId));
    if (movie) {
      if (!Array.isArray(movie.reviews)) movie.reviews = [];
      movie.reviews.unshift(newReview);

      // Also record rating if not already done
      if (!Array.isArray(movie.ratings)) movie.ratings = [];
      movie.ratings.push(rating);
      movie.ratingsCount = (movie.ratingsCount || 0) + 1;
      const sum = movie.ratings.reduce((acc, r) => acc + Number(r), 0);
      movie.rating = parseFloat((sum / movie.ratings.length).toFixed(1));

      // Update reviews list DOM
      const reviewsList = this.modalBody.querySelector('#reviews-list');
      if (reviewsList) {
        reviewsList.innerHTML = this.renderReviewsList(movie.reviews);
      }

      // Update tab counter
      const tabBtn = this.modalBody.querySelector('#tab-btn-reviews');
      if (tabBtn) tabBtn.textContent = `Reviews (${movie.reviews.length})`;

      // Refresh score UI
      const scoreNum = this.modalBody.querySelector('.rating-number');
      const starsRender = this.modalBody.querySelector('.stars-render');
      const votesCount = this.modalBody.querySelector('.rating-votes-count');
      if (scoreNum) scoreNum.textContent = movie.rating.toFixed(1);
      if (starsRender) starsRender.innerHTML = this.generateStarSymbols(movie.rating);
      if (votesCount) votesCount.textContent = `Based on ${movie.ratingsCount} community ratings`;

      this.render();
      this.showToast('Your review has been published!', 'success');
    }
  }

  async submitComment(movieId, { author, text }) {
    const newComment = {
      id: `com-${Date.now()}`,
      author: author,
      user: author,
      text: text,
      comment: text,
      date: new Date().toISOString()
    };

    if (this.apiAvailable) {
      try {
        const res = await fetch(`${this.apiBaseUrl}/movies/${movieId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newComment)
        });
        if (res.ok) {
          const created = await res.json();
          if (created && created.id) {
            newComment.id = created.id;
          }
        }
      } catch (err) {
        console.warn('API comment submission failed, falling back to local update.', err);
      }
    }

    // Local update
    const movie = this.movies.find(m => String(m.id) === String(movieId));
    if (movie) {
      if (!Array.isArray(movie.comments)) movie.comments = [];
      movie.comments.unshift(newComment);

      const commentsList = this.modalBody.querySelector('#comments-list');
      if (commentsList) {
        commentsList.innerHTML = this.renderCommentsList(movie.comments);
      }

      const tabBtn = this.modalBody.querySelector('#tab-btn-comments');
      if (tabBtn) tabBtn.textContent = `Comments (${movie.comments.length})`;

      this.showToast('Comment posted successfully!', 'success');
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================
  generateStarSymbols(rating) {
    const rounded = Math.round(rating);
    const clamped = Math.max(0, Math.min(5, rounded));
    return '★'.repeat(clamped) + '☆'.repeat(5 - clamped);
  }

  escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  showToast(message, type = 'info') {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${this.escapeHTML(message)}</span>`;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  window.cineScopeApp = new MovieApp();
});
