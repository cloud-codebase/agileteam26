/**
 * CineScope — Movie Database & Community Reviews Application
 * Pure Vanilla JavaScript (ES6+)
 * Integrates with Backend REST API:
 *   - GET  /api/movies
 *   - GET  /api/movies/:id
 *   - POST /api/movies/:id/ratings
 *   - POST /api/movies/:id/reviews
 *   - POST /api/movies/:id/comments
 *   - GET  /api/movies/genres
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
    genre: ["Sci-Fi", "Action", "Adventure"],
    genres: ["Sci-Fi", "Action", "Adventure"],
    synopsis: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster.",
    posterUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    averageRating: 4.8,
    totalRatings: 142,
    ratings: [5, 5, 4, 5, 5],
    reviews: [
      {
        id: "rev-1",
        author: "Sarah Connor",
        rating: 5,
        content: "An absolute masterpiece of modern cinema. Mind-bending concept executed to perfection.",
        createdAt: "2025-01-10T10:00:00.000Z"
      },
      {
        id: "rev-2",
        author: "Neo99",
        rating: 4,
        content: "Visually stunning and the Hans Zimmer score is phenomenal. Highly recommended!",
        createdAt: "2025-02-01T12:00:00.000Z"
      }
    ],
    comments: [
      {
        id: "com-1",
        author: "CinephileDan",
        content: "Did the spinning top fall at the end? What's your theory?",
        createdAt: "2025-02-14T14:30:00.000Z"
      },
      {
        id: "com-2",
        author: "Maya Lin",
        content: "The sound design in IMAX was simply unforgettable.",
        createdAt: "2025-02-15T16:45:00.000Z"
      }
    ]
  },
  {
    id: "2",
    title: "The Shawshank Redemption",
    year: 1994,
    director: "Frank Darabont",
    duration: "142 min",
    genre: ["Drama", "Crime"],
    genres: ["Drama", "Crime"],
    synopsis: "Over the course of several years, two convicts form a friendship, seeking solace and, eventually, redemption through basic compassion.",
    posterUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
    averageRating: 4.9,
    totalRatings: 310,
    ratings: [5, 5, 5, 5, 4],
    reviews: [
      {
        id: "rev-3",
        author: "Morgan Freeman Fan",
        rating: 5,
        content: "Hope is a good thing, maybe the best of things, and no good thing ever dies. Timeless.",
        createdAt: "2024-12-20T08:00:00.000Z"
      }
    ],
    comments: [
      {
        id: "com-3",
        author: "Red_Ellis",
        content: "One of the few movies that gets better with every single rewatch.",
        createdAt: "2025-01-05T09:15:00.000Z"
      }
    ]
  },
  {
    id: "3",
    title: "The Dark Knight",
    year: 2008,
    director: "Christopher Nolan",
    duration: "152 min",
    genre: ["Action", "Crime", "Drama"],
    genres: ["Action", "Crime", "Drama"],
    synopsis: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    posterUrl: "https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=600&q=80",
    averageRating: 4.9,
    totalRatings: 285,
    ratings: [5, 5, 5, 4, 5],
    reviews: [
      {
        id: "rev-4",
        author: "BruceW",
        rating: 5,
        content: "Heath Ledger's Joker is legendary. The pacing, atmosphere, and tension are unrivaled.",
        createdAt: "2025-01-18T18:00:00.000Z"
      }
    ],
    comments: [
      {
        id: "com-4",
        author: "Gordon_Jim",
        content: "The interrogation scene is the finest dramatic acting in comic book cinema.",
        createdAt: "2025-02-03T11:20:00.000Z"
      }
    ]
  },
  {
    id: "4",
    title: "Interstellar",
    year: 2014,
    director: "Christopher Nolan",
    duration: "169 min",
    genre: ["Sci-Fi", "Adventure", "Drama"],
    genres: ["Sci-Fi", "Adventure", "Drama"],
    synopsis: "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.",
    posterUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
    averageRating: 4.7,
    totalRatings: 198,
    ratings: [5, 4, 5, 5, 4],
    reviews: [
      {
        id: "rev-5",
        author: "Cooper_J",
        rating: 5,
        content: "Emotionally devastating and scientifically awe-inspiring. Love transcends time and space.",
        createdAt: "2025-01-22T20:10:00.000Z"
      }
    ],
    comments: [
      {
        id: "com-5",
        author: "Murph",
        content: "That docking scene still gives me goosebumps every time.",
        createdAt: "2025-02-10T22:00:00.000Z"
      }
    ]
  },
  {
    id: "5",
    title: "Pulp Fiction",
    year: 1994,
    director: "Quentin Tarantino",
    duration: "154 min",
    genre: ["Crime", "Drama"],
    genres: ["Crime", "Drama"],
    synopsis: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
    posterUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80",
    averageRating: 4.7,
    totalRatings: 220,
    ratings: [5, 4, 5, 5, 4],
    reviews: [
      {
        id: "rev-6",
        author: "Jules_W",
        rating: 5,
        content: "Iconic dialogues, eccentric soundtrack, and non-linear storytelling at its finest.",
        createdAt: "2025-01-12T15:00:00.000Z"
      }
    ],
    comments: [
      {
        id: "com-6",
        author: "VincentVega",
        content: "What do they call a Quarter Pounder with cheese in Paris?",
        createdAt: "2025-01-30T17:40:00.000Z"
      }
    ]
  },
  {
    id: "6",
    title: "Spirited Away",
    year: 2001,
    director: "Hayao Miyazaki",
    duration: "125 min",
    genre: ["Animation", "Adventure", "Fantasy"],
    genres: ["Animation", "Adventure", "Fantasy"],
    synopsis: "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, and where humans are changed into beasts.",
    posterUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80",
    averageRating: 4.8,
    totalRatings: 165,
    ratings: [5, 5, 5, 4, 5],
    reviews: [
      {
        id: "rev-7",
        author: "ChihiroFan",
        rating: 5,
        content: "Studio Ghibli's crown jewel. Rich in symbolism, breathtaking art, and pure imagination.",
        createdAt: "2025-02-04T13:20:00.000Z"
      }
    ],
    comments: [
      {
        id: "com-7",
        author: "Haku",
        content: "Joe Hisaishi's score 'One Summer's Day' is perfection.",
        createdAt: "2025-02-11T19:00:00.000Z"
      }
    ]
  },
  {
    id: "7",
    title: "Parasite",
    year: 2019,
    director: "Bong Joon-ho",
    duration: "132 min",
    genre: ["Drama", "Thriller"],
    genres: ["Drama", "Thriller"],
    synopsis: "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
    posterUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80",
    averageRating: 4.6,
    totalRatings: 175,
    ratings: [5, 4, 5, 4, 5],
    reviews: [
      {
        id: "rev-8",
        author: "FilmBuffK",
        rating: 5,
        content: "Masterfully crafted social thriller. Deserved every single Oscar it won.",
        createdAt: "2025-02-08T14:15:00.000Z"
      }
    ],
    comments: [
      {
        id: "com-8",
        author: "Jessica_Illinois",
        content: "The transition between the first and second half of the movie is astonishing.",
        createdAt: "2025-02-12T18:30:00.000Z"
      }
    ]
  },
  {
    id: "8",
    title: "The Matrix",
    year: 1999,
    director: "Lana Wachowski, Lilly Wachowski",
    duration: "136 min",
    genre: ["Sci-Fi", "Action"],
    genres: ["Sci-Fi", "Action"],
    synopsis: "When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence.",
    posterUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
    averageRating: 4.9,
    totalRatings: 240,
    ratings: [5, 5, 5, 5, 4],
    reviews: [
      {
        id: "rev-9",
        author: "Morpheus",
        rating: 5,
        content: "Take the red pill. A timeless cyberpunk masterpiece that redefined action cinema.",
        createdAt: "2025-01-01T12:00:00.000Z"
      }
    ],
    comments: [
      {
        id: "com-9",
        author: "Trinity",
        content: "Dodge this. Iconic from beginning to end.",
        createdAt: "2025-01-28T16:00:00.000Z"
      }
    ]
  }
];

// ============================================================================
// Application Controller
// ============================================================================
class MovieApp {
  constructor() {
    this.movies = [];
    this.selectedMovieId = null;
    this.apiAvailable = false;
    this.apiBaseUrl = '/api';

    // Interactive star ratings state
    this.selectedReviewRating = 5;
    this.userPreferredName = localStorage.getItem('cinescope_username') || '';

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
    await this.loadGenres();
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
          this.movies = data.map(m => this.normalizeMovie(m));
          this.apiAvailable = true;
          this.updateApiStatus(true);
          return;
        }
      }
      throw new Error('API returned empty or non-array response');
    } catch (err) {
      console.info('Backend API not responding; using fallback store.', err.message);
      this.movies = DEFAULT_MOVIES.map(m => this.normalizeMovie(m));
      this.apiAvailable = false;
      this.updateApiStatus(false);
    }
  }

  async loadGenres() {
    if (!this.apiAvailable) return;
    try {
      const response = await fetch(`${this.apiBaseUrl}/movies/genres`);
      if (response.ok) {
        const genres = await response.json();
        if (Array.isArray(genres) && genres.length > 0) {
          // Keep current selection
          const currentVal = this.genreSelect.value;
          this.genreSelect.innerHTML = `<option value="">All Genres</option>` +
            genres.map(g => `<option value="${this.escapeHTML(g)}">${this.escapeHTML(g)}</option>`).join('');
          this.genreSelect.value = currentVal;
        }
      }
    } catch (e) {
      // Keep static genres in HTML
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

  normalizeMovie(m) {
    const genres = Array.isArray(m.genre) ? m.genre : (Array.isArray(m.genres) ? m.genres : (m.genre ? [m.genre] : []));
    const poster = m.posterUrl || m.poster || '';
    const rating = m.averageRating !== undefined ? Number(m.averageRating) : (m.rating !== undefined ? Number(m.rating) : 0);
    const ratingsCount = m.totalRatings !== undefined ? Number(m.totalRatings) : (m.ratingsCount !== undefined ? Number(m.ratingsCount) : (Array.isArray(m.ratings) ? m.ratings.length : 0));
    const reviewsCount = m.reviewsCount !== undefined ? Number(m.reviewsCount) : (Array.isArray(m.reviews) ? m.reviews.length : 0);
    const commentsCount = m.commentsCount !== undefined ? Number(m.commentsCount) : (Array.isArray(m.comments) ? m.comments.length : 0);

    return {
      ...m,
      id: String(m.id),
      posterUrl: poster,
      poster: poster,
      genre: genres,
      genres: genres,
      averageRating: rating,
      rating: rating,
      totalRatings: ratingsCount,
      ratingsCount: ratingsCount,
      reviewsCount: reviewsCount,
      commentsCount: commentsCount,
      reviews: Array.isArray(m.reviews) ? m.reviews : [],
      comments: Array.isArray(m.comments) ? m.comments : [],
      ratings: Array.isArray(m.ratings) ? m.ratings : []
    };
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
        (movie.genres && movie.genres.some(g => g.toLowerCase().includes(query)));

      const matchGenre = !genre || (movie.genres && movie.genres.some(g => g.toLowerCase() === genre.toLowerCase()));

      return matchQuery && matchGenre;
    });

    // Sorting
    filtered.sort((a, b) => {
      const ratingA = Number(a.averageRating || a.rating) || 0;
      const ratingB = Number(b.averageRating || b.rating) || 0;
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
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const movieId = card.getAttribute('data-id');
          this.openModal(movieId);
        }
      });
    });
  }

  createMovieCardHTML(movie) {
    const ratingValue = Number(movie.averageRating || movie.rating || 0);
    const ratingDisplay = ratingValue > 0 ? ratingValue.toFixed(1) : 'New';
    const genrePills = movie.genres.slice(0, 3).map(g => `<span class="genre-pill">${this.escapeHTML(g)}</span>`).join('');
    const reviewsCount = movie.reviewsCount || (movie.reviews ? movie.reviews.length : 0);
    const ratingsCount = movie.totalRatings || (movie.ratings ? movie.ratings.length : 0);

    return `
      <article class="movie-card" data-id="${movie.id}" tabindex="0" role="button" aria-label="View details for ${this.escapeHTML(movie.title)}">
        <div class="card-poster-wrapper">
          <img 
            class="card-poster" 
            src="${this.escapeHTML(movie.posterUrl || movie.poster || '')}" 
            alt="${this.escapeHTML(movie.title)} poster"
            loading="lazy"
            onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'card-poster-fallback\\'><div class=\\'card-poster-fallback-icon\\'>🎬</div><strong>${this.escapeHTML(movie.title)}</strong></div>';"
          />
          <div class="card-badge-rating">
            <span>⭐</span>
            <span>${ratingDisplay}</span>
          </div>
          <div class="card-badge-year">${movie.year || 'N/A'}</div>
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

    // Try fetching freshest detail from API
    if (this.apiAvailable) {
      try {
        const res = await fetch(`${this.apiBaseUrl}/movies/${movieId}`);
        if (res.ok) {
          const freshData = await res.json();
          movie = this.normalizeMovie(freshData);
          const idx = this.movies.findIndex(m => String(m.id) === String(movieId));
          if (idx !== -1) this.movies[idx] = movie;
        }
      } catch (e) {
        console.warn('Could not fetch fresh movie detail from API:', e);
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
    this.selectedReviewRating = 5;
  }

  renderModalContent(movie) {
    const ratingValue = Number(movie.averageRating || movie.rating || 0);
    const ratingDisplay = ratingValue > 0 ? ratingValue.toFixed(1) : 'New';
    const reviews = Array.isArray(movie.reviews) ? movie.reviews : [];
    const comments = Array.isArray(movie.comments) ? movie.comments : [];
    const ratingsCount = movie.totalRatings || (movie.ratings ? movie.ratings.length : 0);

    const starsHtml = this.generateStarSymbols(ratingValue);

    this.modalBody.innerHTML = `
      <!-- Header Section -->
      <div class="detail-header">
        <div class="detail-poster-wrapper">
          <img 
            class="detail-poster" 
            src="${this.escapeHTML(movie.posterUrl || movie.poster || '')}" 
            alt="${this.escapeHTML(movie.title)}"
            onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'card-poster-fallback\\'><div class=\\'card-poster-fallback-icon\\'>🎬</div></div>';"
          />
        </div>
        <div class="detail-info">
          <h1 id="modal-movie-title" class="detail-title">${this.escapeHTML(movie.title)}</h1>
          <div class="detail-metadata">
            <span>📅 ${movie.year || 'N/A'}</span>
            <span>⏱️ ${this.escapeHTML(movie.duration || 'Feature Film')}</span>
            <span>🎬 Dir. ${this.escapeHTML(movie.director || 'N/A')}</span>
          </div>
          <div class="detail-genres">
            ${movie.genres.map(g => `<span class="genre-pill">${this.escapeHTML(g)}</span>`).join('')}
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
            <div class="rating-votes-count">Based on ${ratingsCount} community rating${ratingsCount === 1 ? '' : 's'}</div>
          </div>
        </div>

        <div class="rate-action-box">
          <div class="rate-label">Rate this movie (1-5 stars):</div>
          <div class="star-rating-input" id="quick-star-rating">
            ${[1, 2, 3, 4, 5].map(star => `
              <button class="star-btn" data-value="${star}" title="Rate ${star} star${star === 1 ? '' : 's'}" type="button">★</button>
            `).join('')}
          </div>
          <div id="quick-rating-status" style="font-size: 0.75rem; color: var(--accent-success); min-height: 1rem; margin-top: 0.2rem;"></div>
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
                <input 
                  type="text" 
                  id="review-author" 
                  class="form-control" 
                  placeholder="e.g. CinemaLover" 
                  value="${this.escapeHTML(this.userPreferredName)}" 
                  required 
                />
              </div>
              <div class="form-group">
                <label>Your Rating *</label>
                <div class="star-rating-input" id="form-star-rating">
                  ${[1, 2, 3, 4, 5].map(star => `
                    <button class="star-btn ${star <= 5 ? 'active' : ''}" data-value="${star}" type="button" title="${star} stars">★</button>
                  `).join('')}
                </div>
              </div>
              <div class="form-group">
                <label for="review-text">Review Content *</label>
                <textarea 
                  id="review-text" 
                  class="form-control" 
                  placeholder="Share your honest critique or feelings about the film..." 
                  required
                ></textarea>
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
                <input 
                  type="text" 
                  id="comment-author" 
                  class="form-control" 
                  placeholder="e.g. MovieBuff" 
                  value="${this.escapeHTML(this.userPreferredName)}" 
                  required 
                />
              </div>
              <div class="form-group">
                <label for="comment-text">Comment *</label>
                <textarea 
                  id="comment-text" 
                  class="form-control" 
                  placeholder="Ask a question, point out an easter egg, or share a thought..." 
                  required
                ></textarea>
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
      const starRating = Math.max(1, Math.min(5, Number(rev.rating) || 5));
      const stars = '★'.repeat(starRating) + '☆'.repeat(5 - starRating);
      const authorName = rev.author || rev.user || rev.userName || 'Anonymous';
      const authorInitial = authorName.charAt(0).toUpperCase();
      const content = rev.content || rev.text || rev.review || '';
      const dateRaw = rev.createdAt || rev.date;
      const dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent';

      return `
        <div class="feed-item">
          <div class="feed-header">
            <div class="feed-user">
              <span class="feed-user-avatar">${authorInitial}</span>
              <span>${this.escapeHTML(authorName)}</span>
            </div>
            <div style="display:flex; align-items:center; gap: 0.75rem;">
              <span style="color: var(--accent-gold); font-size: 0.95rem;">${stars}</span>
              <span class="feed-date">${dateStr}</span>
            </div>
          </div>
          <p class="feed-text">${this.escapeHTML(content)}</p>
        </div>
      `;
    }).join('');
  }

  renderCommentsList(comments) {
    if (!comments || comments.length === 0) {
      return `<div class="feed-empty">No comments yet. Start the conversation!</div>`;
    }

    return comments.map(com => {
      const authorName = com.author || com.user || com.userName || 'Anonymous';
      const authorInitial = authorName.charAt(0).toUpperCase();
      const content = com.content || com.text || com.comment || '';
      const dateRaw = com.createdAt || com.date;
      const dateStr = dateRaw ? new Date(dateRaw).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent';

      return `
        <div class="feed-item">
          <div class="feed-header">
            <div class="feed-user">
              <span class="feed-user-avatar">${authorInitial}</span>
              <span>${this.escapeHTML(authorName)}</span>
            </div>
            <span class="feed-date">${dateStr}</span>
          </div>
          <p class="feed-text">${this.escapeHTML(content)}</p>
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

    // Quick Rating interactive stars widget (AC 1)
    const quickStarContainer = this.modalBody.querySelector('#quick-star-rating');
    const quickStatus = this.modalBody.querySelector('#quick-rating-status');

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
          stars.forEach(s => s.classList.toggle('active', Number(s.getAttribute('data-value')) <= val));
          if (quickStatus) quickStatus.textContent = 'Submitting rating...';
          await this.submitRating(movie.id, val);
          if (quickStatus) quickStatus.textContent = `You rated this film ${val} ★`;
        });
      });
    }

    // Form Rating stars in Review Form (AC 1 & AC 2)
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

    // Review form submission with input validation (AC 2 & AC 3)
    const reviewForm = this.modalBody.querySelector('#review-form');
    if (reviewForm) {
      reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const authorInput = this.modalBody.querySelector('#review-author');
        const textInput = this.modalBody.querySelector('#review-text');
        const author = authorInput.value.trim();
        const content = textInput.value.trim();
        const rating = this.selectedReviewRating || 5;

        // Input Validation
        if (!author) {
          this.showToast('Please enter your name or handle.', 'error');
          authorInput.focus();
          return;
        }
        if (!content) {
          this.showToast('Please enter your review content.', 'error');
          textInput.focus();
          return;
        }
        if (content.length < 3) {
          this.showToast('Review must be at least 3 characters long.', 'error');
          textInput.focus();
          return;
        }

        // Remember author name
        this.userPreferredName = author;
        try { localStorage.setItem('cinescope_username', author); } catch (e) {}

        const submitBtn = this.modalBody.querySelector('#btn-submit-review');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        await this.submitReview(movie.id, { author, content, rating });

        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Review';
        textInput.value = '';

        // Reset stars to 5
        this.selectedReviewRating = 5;
        if (formStarContainer) {
          formStarContainer.querySelectorAll('.star-btn').forEach(s => s.classList.add('active'));
        }
      });
    }

    // Comment form submission with input validation (AC 2 & AC 3)
    const commentForm = this.modalBody.querySelector('#comment-form');
    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const authorInput = this.modalBody.querySelector('#comment-author');
        const textInput = this.modalBody.querySelector('#comment-text');
        const author = authorInput.value.trim();
        const content = textInput.value.trim();

        // Input Validation
        if (!author) {
          this.showToast('Please enter your name or handle.', 'error');
          authorInput.focus();
          return;
        }
        if (!content) {
          this.showToast('Please enter your comment.', 'error');
          textInput.focus();
          return;
        }

        // Remember author name
        this.userPreferredName = author;
        try { localStorage.setItem('cinescope_username', author); } catch (e) {}

        const submitBtn = this.modalBody.querySelector('#btn-submit-comment');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        await this.submitComment(movie.id, { author, content });

        submitBtn.disabled = false;
        submitBtn.textContent = 'Post Comment';
        textInput.value = '';
      });
    }
  }

  // ============================================================================
  // Submission Handlers (Rating, Review, Comment)
  // ============================================================================
  async submitRating(movieId, ratingVal) {
    const movie = this.movies.find(m => String(m.id) === String(movieId));
    const userId = this.userPreferredName || 'user_' + Math.random().toString(36).substring(7);

    let apiSucceeded = false;
    let newAverage = null;
    let newTotal = null;

    if (this.apiAvailable) {
      try {
        const res = await fetch(`${this.apiBaseUrl}/movies/${movieId}/ratings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating: ratingVal, userId: userId, user: userId })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.averageRating !== undefined) newAverage = json.averageRating;
          if (json.totalRatings !== undefined) newTotal = json.totalRatings;
          apiSucceeded = true;
        }
      } catch (err) {
        console.warn('API rating request failed, falling back to local update.', err);
      }
    }

    if (movie) {
      if (apiSucceeded && newAverage !== null) {
        movie.averageRating = Number(newAverage);
        movie.rating = Number(newAverage);
        movie.totalRatings = Number(newTotal);
        movie.ratingsCount = Number(newTotal);
      } else {
        // Fallback local calculation
        if (!Array.isArray(movie.ratings)) movie.ratings = [];
        movie.ratings.push(ratingVal);
        movie.totalRatings = (movie.totalRatings || 0) + 1;
        movie.ratingsCount = movie.totalRatings;
        const sum = movie.ratings.reduce((acc, r) => acc + (typeof r === 'object' ? r.rating : Number(r)), 0);
        movie.averageRating = parseFloat((sum / movie.ratings.length).toFixed(1));
        movie.rating = movie.averageRating;
      }

      this.updateRatingDisplayInModal(movie);
      this.render(); // Update background catalog card
      this.showToast(`Rating of ${ratingVal} ★ submitted!`, 'success');
    }
  }

  async submitReview(movieId, { author, content, rating }) {
    const movie = this.movies.find(m => String(m.id) === String(movieId));
    let createdReview = null;
    let apiSucceeded = false;

    if (this.apiAvailable) {
      try {
        const res = await fetch(`${this.apiBaseUrl}/movies/${movieId}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author, content, text: content, rating })
        });
        if (res.ok) {
          const json = await res.json();
          createdReview = json.review;
          if (json.averageRating !== undefined && movie) {
            movie.averageRating = Number(json.averageRating);
            movie.rating = Number(json.averageRating);
          }
          if (json.totalRatings !== undefined && movie) {
            movie.totalRatings = Number(json.totalRatings);
            movie.ratingsCount = Number(json.totalRatings);
          }
          apiSucceeded = true;
        }
      } catch (err) {
        console.warn('API review request failed, falling back to local creation.', err);
      }
    }

    if (!createdReview) {
      createdReview = {
        id: 'rev_' + Date.now(),
        movieId: String(movieId),
        author: author,
        content: content,
        text: content,
        rating: rating,
        createdAt: new Date().toISOString()
      };
      if (movie) {
        if (!Array.isArray(movie.ratings)) movie.ratings = [];
        movie.ratings.push(rating);
        movie.totalRatings = (movie.totalRatings || 0) + 1;
        movie.ratingsCount = movie.totalRatings;
        const sum = movie.ratings.reduce((acc, r) => acc + (typeof r === 'object' ? r.rating : Number(r)), 0);
        movie.averageRating = parseFloat((sum / movie.ratings.length).toFixed(1));
        movie.rating = movie.averageRating;
      }
    }

    if (movie) {
      if (!Array.isArray(movie.reviews)) movie.reviews = [];
      movie.reviews.unshift(createdReview);
      movie.reviewsCount = movie.reviews.length;

      // Immediately append/prepend to reviews list (AC 3)
      const reviewsList = this.modalBody.querySelector('#reviews-list');
      if (reviewsList) {
        reviewsList.innerHTML = this.renderReviewsList(movie.reviews);
      }

      // Update reviews tab button counter
      const tabBtn = this.modalBody.querySelector('#tab-btn-reviews');
      if (tabBtn) tabBtn.textContent = `Reviews (${movie.reviews.length})`;

      this.updateRatingDisplayInModal(movie);
      this.render(); // update background catalog card
      this.showToast('Your review has been published!', 'success');
    }
  }

  async submitComment(movieId, { author, content }) {
    const movie = this.movies.find(m => String(m.id) === String(movieId));
    let createdComment = null;

    if (this.apiAvailable) {
      try {
        const res = await fetch(`${this.apiBaseUrl}/movies/${movieId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author, content, text: content })
        });
        if (res.ok) {
          const json = await res.json();
          createdComment = json.comment;
        }
      } catch (err) {
        console.warn('API comment request failed, falling back to local creation.', err);
      }
    }

    if (!createdComment) {
      createdComment = {
        id: 'c_' + Date.now(),
        movieId: String(movieId),
        author: author,
        content: content,
        text: content,
        createdAt: new Date().toISOString()
      };
    }

    if (movie) {
      if (!Array.isArray(movie.comments)) movie.comments = [];
      movie.comments.unshift(createdComment);
      movie.commentsCount = movie.comments.length;

      // Immediately append/prepend to comments list (AC 3)
      const commentsList = this.modalBody.querySelector('#comments-list');
      if (commentsList) {
        commentsList.innerHTML = this.renderCommentsList(movie.comments);
      }

      // Update comments tab button counter
      const tabBtn = this.modalBody.querySelector('#tab-btn-comments');
      if (tabBtn) tabBtn.textContent = `Comments (${movie.comments.length})`;

      this.showToast('Comment posted successfully!', 'success');
    }
  }

  updateRatingDisplayInModal(movie) {
    const ratingValue = Number(movie.averageRating || movie.rating || 0);
    const scoreNum = this.modalBody.querySelector('.rating-number');
    const starsRender = this.modalBody.querySelector('.stars-render');
    const votesCount = this.modalBody.querySelector('.rating-votes-count');

    if (scoreNum) scoreNum.textContent = ratingValue > 0 ? ratingValue.toFixed(1) : 'New';
    if (starsRender) starsRender.innerHTML = this.generateStarSymbols(ratingValue);
    if (votesCount) {
      const count = movie.totalRatings || (movie.ratings ? movie.ratings.length : 0);
      votesCount.textContent = `Based on ${count} community rating${count === 1 ? '' : 's'}`;
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
