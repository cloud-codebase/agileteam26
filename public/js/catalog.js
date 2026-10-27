/**
 * Catalog & Rating Analytics Controller (SCRUM-116)
 * Handles movie catalog rendering, live search, genre filter, sorting,
 * modal details view, and rating analytics breakdown.
 */

(function () {
  'use strict';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fn.apply(this, args);
      }, delay);
    };
  }

  const CatalogController = {
    movies: [],
    currentFilters: {
      query: '',
      genre: 'all',
      sortBy: 'rating-desc'
    },

    /**
     * Initializes the catalog controls and fetches initial movie data
     */
    async init() {
      this.bindControls();
      await this.fetchAndRenderMovies();
    },

    /**
     * Binds search input, clear button, filter, sort, and modal close listeners
     */
    bindControls() {
      const searchInput = document.getElementById('search-input');
      const searchClearBtn = document.getElementById('search-clear-btn');
      const genreFilter = document.getElementById('genre-filter');
      const sortBy = document.getElementById('sort-by');
      const modalCloseBtn = document.getElementById('modal-close-btn');
      const modalBackdrop = document.getElementById('modal-backdrop');

      // Debounced search input
      if (searchInput) {
        const handleSearch = debounce(() => {
          this.currentFilters.query = searchInput.value.trim();
          this.fetchAndRenderMovies();
        }, 250);

        searchInput.addEventListener('input', handleSearch);
      }

      // Search clear button
      if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
          if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
          }
          this.currentFilters.query = '';
          this.fetchAndRenderMovies();
        });
      }

      // Genre filter dropdown
      if (genreFilter) {
        genreFilter.addEventListener('change', (e) => {
          this.currentFilters.genre = e.target.value;
          this.fetchAndRenderMovies();
        });
      }

      // Sort by dropdown
      if (sortBy) {
        sortBy.addEventListener('change', (e) => {
          this.currentFilters.sortBy = e.target.value;
          this.fetchAndRenderMovies();
        });
      }

      // Modal close button and backdrop
      if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => this.closeMovieModal());
      }
      if (modalBackdrop) {
        modalBackdrop.addEventListener('click', () => this.closeMovieModal());
      }

      // Escape key to close modal
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const modal = document.getElementById('movie-modal');
          if (modal && !modal.classList.contains('hidden')) {
            this.closeMovieModal();
          }
        }
      });
    },

    /**
     * Fetches movies from GET /api/movies with query, genre, and sort params, then renders grid
     */
    async fetchAndRenderMovies() {
      const spinner = document.getElementById('loading-spinner');
      const noResults = document.getElementById('no-results-msg');

      if (spinner) spinner.classList.remove('hidden');
      if (noResults) noResults.classList.add('hidden');

      const params = new URLSearchParams();

      if (this.currentFilters.query) {
        params.set('q', this.currentFilters.query);
      }

      if (this.currentFilters.genre && this.currentFilters.genre !== 'all') {
        params.set('genre', this.currentFilters.genre);
      }

      if (this.currentFilters.sortBy) {
        if (this.currentFilters.sortBy === 'rating-desc') {
          params.set('sortBy', 'rating');
          params.set('order', 'desc');
        } else if (this.currentFilters.sortBy === 'year-desc') {
          params.set('sortBy', 'year');
          params.set('order', 'desc');
        } else if (this.currentFilters.sortBy === 'title-asc') {
          params.set('sortBy', 'title');
          params.set('order', 'asc');
        }
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';

      try {
        const response = await fetch(`/api/movies${queryString}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch movies: HTTP ${response.status}`);
        }
        const data = await response.json();
        this.movies = Array.isArray(data) ? data : (data.data || []);
      } catch (err) {
        console.warn('API fetch failed or offline, checking local movies cache:', err);
        // If fetch fails (e.g. backend not ready yet), filter cached movies if available
        if (Array.isArray(this.movies) && this.movies.length > 0) {
          let filtered = [...this.movies];
          if (this.currentFilters.query) {
            const q = this.currentFilters.query.toLowerCase();
            filtered = filtered.filter(m =>
              (m.title && m.title.toLowerCase().includes(q)) ||
              (m.director && m.director.toLowerCase().includes(q)) ||
              (Array.isArray(m.cast) && m.cast.some(c => c.toLowerCase().includes(q)))
            );
          }
          if (this.currentFilters.genre && this.currentFilters.genre !== 'all') {
            filtered = filtered.filter(m => Array.isArray(m.genres) && m.genres.includes(this.currentFilters.genre));
          }
          if (this.currentFilters.sortBy === 'rating-desc') {
            filtered.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
          } else if (this.currentFilters.sortBy === 'year-desc') {
            filtered.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
          } else if (this.currentFilters.sortBy === 'title-asc') {
            filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
          }
          this.movies = filtered;
        }
      } finally {
        if (spinner) spinner.classList.add('hidden');
      }

      this.renderGrid(this.movies);

      if (noResults) {
        if (!this.movies || this.movies.length === 0) {
          noResults.classList.remove('hidden');
        } else {
          noResults.classList.add('hidden');
        }
      }
    },

    /**
     * Renders movie cards into #movie-grid
     * @param {Array} movies
     */
    renderGrid(movies) {
      const grid = document.getElementById('movie-grid');
      if (!grid) return;

      grid.innerHTML = '';

      if (!Array.isArray(movies) || movies.length === 0) {
        return;
      }

      movies.forEach((movie) => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.dataset.id = movie.id;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `${movie.title} details`);

        const avgScore = movie.avgRating !== undefined && movie.avgRating !== null
          ? Number(movie.avgRating).toFixed(1)
          : '0.0';

        const ratingsCount = movie.ratingsCount !== undefined
          ? movie.ratingsCount
          : (Array.isArray(movie.ratings) ? movie.ratings.length : 0);

        const genresHtml = (movie.genres || [])
          .map(g => `<span class="badge genre-badge">${escapeHtml(g)}</span>`)
          .join('');

        const posterSrc = movie.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400';

        card.innerHTML = `
          <div class="movie-poster-wrap">
            <img src="${escapeHtml(posterSrc)}" alt="${escapeHtml(movie.title)}" class="movie-card-poster" loading="lazy">
          </div>
          <div class="movie-card-content">
            <h3 class="movie-card-title">${escapeHtml(movie.title)}</h3>
            <div class="movie-card-meta">
              <span>${escapeHtml(String(movie.releaseYear || ''))}</span>
              <div class="movie-card-genres">${genresHtml}</div>
            </div>
            <p class="movie-card-director">Dir. ${escapeHtml(movie.director || 'Unknown')}</p>
            <div class="movie-card-rating">
              <span class="rating-star-icon">★</span>
              <span class="rating-score-val">${avgScore}</span>
              <span class="rating-count-val">(${ratingsCount} rating${ratingsCount === 1 ? '' : 's'})</span>
            </div>
          </div>
        `;

        card.addEventListener('click', () => this.openMovieModal(movie.id));
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.openMovieModal(movie.id);
          }
        });

        grid.appendChild(card);
      });
    },

    /**
     * Renders rating distribution analytics bars (5 down to 1 stars)
     * @param {Object} movie
     */
    renderRatingAnalytics(movie) {
      const avgScoreEl = document.getElementById('analytics-avg-rating');
      const totalVotesEl = document.getElementById('analytics-total-votes');
      const barsContainer = document.getElementById('rating-bars-container');

      if (!barsContainer) return;

      const avgScore = movie.avgRating !== undefined && movie.avgRating !== null
        ? Number(movie.avgRating).toFixed(1)
        : '0.0';

      if (avgScoreEl) {
        avgScoreEl.textContent = avgScore;
      }

      // Compute distribution map
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      if (movie.ratingDistribution) {
        for (let s = 1; s <= 5; s++) {
          distribution[s] = Number(movie.ratingDistribution[s]) || 0;
        }
      } else if (Array.isArray(movie.ratings)) {
        movie.ratings.forEach(r => {
          const score = Math.round(Number(r));
          if (distribution[score] !== undefined) {
            distribution[score]++;
          }
        });
      }

      const totalCalculated = Object.values(distribution).reduce((acc, count) => acc + count, 0);
      const total = movie.ratingsCount !== undefined ? movie.ratingsCount : totalCalculated;

      if (totalVotesEl) {
        totalVotesEl.textContent = `${total} rating${total === 1 ? '' : 's'}`;
      }

      barsContainer.innerHTML = '';

      // Render 5 down to 1 star bars
      for (let star = 5; star >= 1; star--) {
        const count = distribution[star] || 0;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

        const row = document.createElement('div');
        row.className = 'rating-bar-row';
        row.innerHTML = `
          <span class="bar-label">${star} ★</span>
          <div class="bar-track" role="progressbar" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
            <div class="bar-fill" style="width: ${percentage}%;"></div>
          </div>
          <span class="bar-count">${count} (${percentage}%)</span>
        `;
        barsContainer.appendChild(row);
      }
    },

    /**
     * Opens movie modal, populates details, computes rating analytics,
     * and delegates reviews loading to ReviewsController.
     * @param {string|number} movieId
     */
    async openMovieModal(movieId) {
      let movie = this.movies.find(m => String(m.id) === String(movieId));

      try {
        const response = await fetch(`/api/movies/${movieId}`);
        if (response.ok) {
          const data = await response.json();
          movie = data.data || data;
        }
      } catch (err) {
        console.warn('Could not fetch single movie details, using cached object:', err);
      }

      if (!movie) return;

      // Populate header info
      const titleEl = document.getElementById('modal-title');
      const posterEl = document.getElementById('modal-poster');
      const yearEl = document.getElementById('modal-year');
      const directorEl = document.getElementById('modal-director');
      const genresEl = document.getElementById('modal-genres');
      const synopsisEl = document.getElementById('modal-synopsis');
      const castEl = document.getElementById('modal-cast-names');

      if (titleEl) titleEl.textContent = movie.title || '';
      if (posterEl) {
        posterEl.src = movie.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400';
        posterEl.alt = movie.title || 'Movie Poster';
      }
      if (yearEl) yearEl.textContent = movie.releaseYear || '';
      if (directorEl) directorEl.textContent = movie.director || '';

      if (genresEl) {
        genresEl.innerHTML = (movie.genres || [])
          .map(g => `<span class="badge genre-badge">${escapeHtml(g)}</span>`)
          .join(' ');
      }

      if (synopsisEl) synopsisEl.textContent = movie.synopsis || '';

      if (castEl) {
        castEl.textContent = Array.isArray(movie.cast)
          ? movie.cast.join(', ')
          : (movie.cast || '');
      }

      // Render Rating Analytics Breakdown
      this.renderRatingAnalytics(movie);

      // Delegate reviews loading to window.ReviewsController if available
      if (window.ReviewsController && typeof window.ReviewsController.loadReviewsForMovie === 'function') {
        window.ReviewsController.loadReviewsForMovie(movieId, movie.reviews || []);
      }

      // Show modal dialog
      const modal = document.getElementById('movie-modal');
      if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      }
    },

    /**
     * Closes the movie details modal
     */
    closeMovieModal() {
      const modal = document.getElementById('movie-modal');
      if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
      }
    }
  };

  // Expose globally as required by contract
  window.CatalogController = CatalogController;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CatalogController.init());
  } else {
    CatalogController.init();
  }
})();
