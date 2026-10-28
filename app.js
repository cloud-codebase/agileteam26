/**
 * Movie Review & Rating Application Controller
 * Handles catalog rendering, filters, modal management, star widget & review submissions
 * Implements the contract defined in DESIGN.md (SCRUM-125)
 */

(function () {
  'use strict';

  // Application State
  let allMovies = [];
  let activeMovieId = null;
  let toastTimeout = null;
  let searchDebounceTimeout = null;

  /**
   * Helper to escape HTML characters to prevent XSS injection
   */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Shows a toast notification
   * @param {string} message
   * @param {'success'|'error'} type
   */
  function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.classList.remove('hidden');

    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
    toastTimeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, 3500);
  }

  /**
   * Shows or hides the loading spinner
   * @param {boolean} show
   */
  function showLoading(show) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
      if (show) {
        spinner.classList.remove('hidden');
      } else {
        spinner.classList.add('hidden');
      }
    }
  }

  /**
   * Updates the status message banner
   * @param {string} message
   * @param {boolean} isError
   */
  function showStatusMessage(message, isError = false) {
    const statusEl = document.getElementById('status-message');
    if (!statusEl) return;

    if (message) {
      statusEl.textContent = message;
      statusEl.className = `status-message ${isError ? 'status-error' : 'status-info'}`;
      statusEl.classList.remove('hidden');
    } else {
      statusEl.textContent = '';
      statusEl.classList.add('hidden');
    }
  }

  /**
   * Populates the genre filter dropdown with unique genres from movies
   * @param {Array} movies
   */
  function populateGenreFilter(movies) {
    const genreFilter = document.getElementById('genre-filter');
    if (!genreFilter) return;

    const currentSelection = genreFilter.value || 'all';
    genreFilter.innerHTML = '<option value="all">All Genres</option>';

    const genres = Array.from(new Set(movies.map(m => m.genre).filter(Boolean))).sort();
    genres.forEach(genre => {
      const option = document.createElement('option');
      option.value = genre;
      option.textContent = genre;
      if (genre === currentSelection) {
        option.selected = true;
      }
      genreFilter.appendChild(option);
    });
  }

  /**
   * Renders movie cards into #movie-grid according to the exact DESIGN.md card template
   * @param {Array} movies
   */
  function renderCatalog(movies) {
    const grid = document.getElementById('movie-grid');
    if (!grid) return;

    if (!movies || movies.length === 0) {
      grid.innerHTML = '<div class="no-movies-message">No movies found matching your criteria.</div>';
      return;
    }

    grid.innerHTML = movies.map(movie => `
      <div class="movie-card" data-movie-id="${escapeHtml(movie.id)}">
        <img class="movie-poster" src="${escapeHtml(movie.posterUrl)}" alt="${escapeHtml(movie.title)} poster" loading="lazy">
        <div class="movie-card-info">
          <div class="movie-card-genre">${escapeHtml(movie.genre)}</div>
          <h3 class="movie-card-title">${escapeHtml(movie.title)} (${escapeHtml(movie.year)})</h3>
          <div class="movie-card-rating">
            <span class="star-icon">★</span>
            <span class="rating-value">${movie.averageRating !== undefined ? movie.averageRating : 0}</span>
            <span class="rating-count">(${movie.ratingCount !== undefined ? movie.ratingCount : 0} ratings)</span>
          </div>
          <button class="btn btn-secondary view-details-btn" data-movie-id="${escapeHtml(movie.id)}">View Reviews</button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Generates HTML for a single review item
   * @param {Object} review
   * @returns {string}
   */
  function createReviewItemHtml(review) {
    const ratingStars = '★'.repeat(review.rating) + '☆'.repeat(Math.max(0, 5 - review.rating));
    let formattedDate = review.date || 'Recent';
    try {
      if (review.date) {
        const d = new Date(review.date);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }
      }
    } catch (e) {
      // Keep original date string
    }

    return `
      <div class="review-item" data-review-id="${escapeHtml(review.id || '')}">
        <div class="review-header">
          <strong class="review-author">${escapeHtml(review.author)}</strong>
          <span class="review-rating" aria-label="${review.rating} of 5 stars">${ratingStars}</span>
          <span class="review-date">${escapeHtml(formattedDate)}</span>
        </div>
        <p class="review-comment">${escapeHtml(review.comment)}</p>
      </div>
    `;
  }

  /**
   * Renders movie details inside the modal
   * @param {Object} movie
   */
  function renderMovieDetails(movie) {
    const detailsEl = document.getElementById('modal-movie-details');
    if (!detailsEl) return;

    detailsEl.innerHTML = `
      <div class="modal-movie-header">
        <img class="modal-movie-poster" src="${escapeHtml(movie.posterUrl)}" alt="${escapeHtml(movie.title)} poster">
        <div class="modal-movie-info">
          <div class="modal-movie-genre">${escapeHtml(movie.genre)}</div>
          <h2 class="modal-movie-title">${escapeHtml(movie.title)} (${escapeHtml(movie.year)})</h2>
          <p class="modal-movie-director"><strong>Director:</strong> ${escapeHtml(movie.director)}</p>
          <div class="modal-movie-rating">
            <span class="star-icon">★</span>
            <span class="rating-value">${movie.averageRating !== undefined ? movie.averageRating : 0}</span>
            <span class="rating-count">(${movie.ratingCount !== undefined ? movie.ratingCount : 0} ratings)</span>
          </div>
          <p class="modal-movie-synopsis">${escapeHtml(movie.synopsis)}</p>
        </div>
      </div>
    `;
  }

  /**
   * Renders the list of reviews inside the modal
   * @param {Array} reviews
   */
  function renderReviewsList(reviews = []) {
    const listEl = document.getElementById('modal-reviews-list');
    const countEl = document.getElementById('modal-review-count');
    if (!listEl) return;

    if (countEl) {
      countEl.textContent = reviews.length;
    }

    if (reviews.length === 0) {
      listEl.innerHTML = '<p class="no-reviews">No reviews yet. Be the first to add your review!</p>';
      return;
    }

    listEl.innerHTML = reviews.map(review => createReviewItemHtml(review)).join('');
  }

  /**
   * Highlights stars 1 through value on hover
   * @param {number} value
   */
  function highlightStars(value) {
    const starButtons = document.querySelectorAll('#rating-widget .star-btn');
    starButtons.forEach(btn => {
      const val = parseInt(btn.getAttribute('data-value'), 10);
      if (val <= value) {
        btn.classList.add('hovered');
      } else {
        btn.classList.remove('hovered');
      }
    });
  }

  /**
   * Clears hover state on stars
   */
  function clearHighlightStars() {
    const starButtons = document.querySelectorAll('#rating-widget .star-btn');
    starButtons.forEach(btn => {
      btn.classList.remove('hovered');
    });
  }

  /**
   * Sets the selected rating value and adds .selected class to stars 1..N
   * @param {number} value
   */
  function selectRating(value) {
    const ratingInput = document.getElementById('review-rating');
    if (ratingInput) {
      ratingInput.value = value;
    }

    const starButtons = document.querySelectorAll('#rating-widget .star-btn');
    starButtons.forEach(btn => {
      const val = parseInt(btn.getAttribute('data-value'), 10);
      if (val <= value) {
        btn.classList.add('selected');
        btn.setAttribute('aria-checked', 'true');
      } else {
        btn.classList.remove('selected');
        btn.setAttribute('aria-checked', 'false');
      }
    });
  }

  /**
   * Resets the star rating widget back to 0
   */
  function resetRatingWidget() {
    const ratingInput = document.getElementById('review-rating');
    if (ratingInput) {
      ratingInput.value = '0';
    }

    clearHighlightStars();
    const starButtons = document.querySelectorAll('#rating-widget .star-btn');
    starButtons.forEach(btn => {
      btn.classList.remove('selected');
      btn.setAttribute('aria-checked', 'false');
    });
  }

  /**
   * Resets the review form and rating widget
   */
  function resetReviewForm() {
    const form = document.getElementById('review-form');
    if (form) {
      form.reset();
    }
    resetRatingWidget();
  }

  /**
   * Opens the movie details and review modal for a specific movie ID
   * @param {number|string} movieId
   */
  async function openMovieModal(movieId) {
    activeMovieId = movieId;
    const modal = document.getElementById('movie-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }

    resetReviewForm();

    const detailsEl = document.getElementById('modal-movie-details');
    const reviewsListEl = document.getElementById('modal-reviews-list');
    const countEl = document.getElementById('modal-review-count');

    if (detailsEl) {
      detailsEl.innerHTML = '<div class="modal-loading">Loading movie details...</div>';
    }
    if (reviewsListEl) {
      reviewsListEl.innerHTML = '';
    }
    if (countEl) {
      countEl.textContent = '...';
    }

    try {
      const movie = await window.MovieAPI.getMovieById(movieId);
      renderMovieDetails(movie);
      renderReviewsList(movie.reviews || []);
    } catch (err) {
      console.error('Error fetching movie details:', err);
      if (detailsEl) {
        detailsEl.innerHTML = `<div class="modal-error">Failed to load movie details: ${escapeHtml(err.message)}</div>`;
      }
      showToast(`Failed to load movie: ${err.message}`, 'error');
    }
  }

  /**
   * Closes the movie modal
   */
  function closeMovieModal() {
    const modal = document.getElementById('movie-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
    activeMovieId = null;
    resetReviewForm();
  }

  /**
   * Handles search and genre filtering logic
   */
  function setupSearchAndFilter() {
    const searchInput = document.getElementById('search-input');
    const genreFilter = document.getElementById('genre-filter');

    const handleFilter = async () => {
      const search = searchInput ? searchInput.value.trim() : '';
      const genre = genreFilter ? genreFilter.value : 'all';

      showLoading(true);
      showStatusMessage('');

      try {
        const filteredMovies = await window.MovieAPI.getMovies({ search, genre });
        renderCatalog(filteredMovies);
      } catch (err) {
        console.warn('API filter request failed, falling back to local memory filter:', err);
        let filtered = allMovies;
        if (genre && genre !== 'all') {
          filtered = filtered.filter(m => m.genre && m.genre.toLowerCase() === genre.toLowerCase());
        }
        if (search) {
          const query = search.toLowerCase();
          filtered = filtered.filter(m =>
            (m.title && m.title.toLowerCase().includes(query)) ||
            (m.director && m.director.toLowerCase().includes(query)) ||
            (m.synopsis && m.synopsis.toLowerCase().includes(query))
          );
        }
        renderCatalog(filtered);
      } finally {
        showLoading(false);
      }
    };

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(handleFilter, 250);
      });
    }

    if (genreFilter) {
      genreFilter.addEventListener('change', () => {
        handleFilter();
      });
    }
  }

  /**
   * Sets up modal interaction events (click card, click view button, close button, backdrop, Escape key)
   */
  function setupModalListeners() {
    const modal = document.getElementById('movie-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    const movieGrid = document.getElementById('movie-grid');

    if (movieGrid) {
      movieGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.movie-card');
        if (card) {
          const movieId = card.getAttribute('data-movie-id');
          if (movieId) {
            openMovieModal(movieId);
          }
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        closeMovieModal();
      });
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeMovieModal();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
        closeMovieModal();
      }
    });
  }

  /**
   * Sets up interactive star rating widget events
   */
  function setupRatingWidget() {
    const widget = document.getElementById('rating-widget');
    if (!widget) return;

    const starButtons = widget.querySelectorAll('.star-btn');
    starButtons.forEach(btn => {
      const value = parseInt(btn.getAttribute('data-value'), 10);

      btn.addEventListener('mouseenter', () => {
        highlightStars(value);
      });

      btn.addEventListener('focus', () => {
        highlightStars(value);
      });

      btn.addEventListener('click', () => {
        selectRating(value);
      });
    });

    widget.addEventListener('mouseleave', () => {
      clearHighlightStars();
    });
  }

  /**
   * Sets up review form submission handling
   */
  function setupReviewForm() {
    const form = document.getElementById('review-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!activeMovieId) {
        showToast('Please select a movie to review.', 'error');
        return;
      }

      const ratingInput = document.getElementById('review-rating');
      const authorInput = document.getElementById('review-author');
      const commentInput = document.getElementById('review-comment');
      const submitBtn = document.getElementById('submit-review-btn');

      const rating = parseInt(ratingInput ? ratingInput.value : '0', 10);
      const author = authorInput ? authorInput.value.trim() : '';
      const comment = commentInput ? commentInput.value.trim() : '';

      if (!rating || rating < 1 || rating > 5) {
        showToast('Please select a star rating (1-5 stars)', 'error');
        return;
      }

      if (!author) {
        showToast('Please enter your name', 'error');
        if (authorInput) authorInput.focus();
        return;
      }

      if (!comment) {
        showToast('Please enter your review comment', 'error');
        if (commentInput) commentInput.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
      }

      try {
        const response = await window.MovieAPI.submitReview(activeMovieId, { author, rating, comment });

        // Prepend new review to #modal-reviews-list
        const listEl = document.getElementById('modal-reviews-list');
        if (listEl) {
          const noReviews = listEl.querySelector('.no-reviews');
          if (noReviews) {
            listEl.innerHTML = '';
          }
          const reviewData = response.review || {
            id: `rev-${Date.now()}`,
            author,
            rating,
            comment,
            date: new Date().toISOString()
          };
          const temp = document.createElement('div');
          temp.innerHTML = createReviewItemHtml(reviewData);
          if (temp.firstElementChild) {
            listEl.prepend(temp.firstElementChild);
          }
        }

        // Update #modal-review-count
        const countEl = document.getElementById('modal-review-count');
        if (countEl) {
          if (response.reviewCount !== undefined) {
            countEl.textContent = response.reviewCount;
          } else {
            const prev = parseInt(countEl.textContent, 10) || 0;
            countEl.textContent = prev + 1;
          }
        }

        // Update modal movie rating display
        const modalRatingVal = document.querySelector('#modal-movie-details .rating-value');
        const modalRatingCount = document.querySelector('#modal-movie-details .rating-count');
        if (modalRatingVal && response.averageRating !== undefined) {
          modalRatingVal.textContent = response.averageRating;
        }
        if (modalRatingCount && response.ratingCount !== undefined) {
          modalRatingCount.textContent = `(${response.ratingCount} ratings)`;
        }

        // Update corresponding card in #movie-grid
        const movieCard = document.querySelector(`.movie-card[data-movie-id="${activeMovieId}"]`);
        if (movieCard) {
          const cardRatingVal = movieCard.querySelector('.rating-value');
          const cardRatingCount = movieCard.querySelector('.rating-count');
          if (cardRatingVal && response.averageRating !== undefined) {
            cardRatingVal.textContent = response.averageRating;
          }
          if (cardRatingCount && response.ratingCount !== undefined) {
            cardRatingCount.textContent = `(${response.ratingCount} ratings)`;
          }
        }

        // Update cached movie in allMovies
        const movieInCache = allMovies.find(m => String(m.id) === String(activeMovieId));
        if (movieInCache) {
          if (response.averageRating !== undefined) movieInCache.averageRating = response.averageRating;
          if (response.ratingCount !== undefined) movieInCache.ratingCount = response.ratingCount;
          if (response.reviewCount !== undefined) movieInCache.reviewCount = response.reviewCount;
          if (response.review) {
            if (!movieInCache.reviews) movieInCache.reviews = [];
            movieInCache.reviews.unshift(response.review);
          }
        }

        // Reset form and star widget
        resetReviewForm();

        // Display success toast notification
        showToast('Review submitted successfully!', 'success');
      } catch (err) {
        console.error('Error submitting review:', err);
        showToast(err.message || 'Failed to submit review.', 'error');
        showStatusMessage(err.message, true);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Review';
        }
      }
    });
  }

  /**
   * Initializes the application
   */
  async function initApp() {
    setupSearchAndFilter();
    setupModalListeners();
    setupRatingWidget();
    setupReviewForm();

    try {
      showLoading(true);
      showStatusMessage('');
      const movies = await window.MovieAPI.getMovies();
      allMovies = Array.isArray(movies) ? movies : [];
      populateGenreFilter(allMovies);
      renderCatalog(allMovies);
    } catch (err) {
      console.error('Error loading initial movie catalog:', err);
      showStatusMessage(`Failed to load movies: ${err.message}`, true);
      showToast(`Failed to load movies: ${err.message}`, 'error');
    } finally {
      showLoading(false);
    }
  }

  // Expose controller methods to window.MovieApp for programmatic access & testing
  const MovieApp = {
    initApp,
    renderCatalog,
    openMovieModal,
    closeMovieModal,
    selectRating,
    resetRatingWidget,
    resetReviewForm,
    showToast,
    getMoviesCache: () => allMovies
  };

  if (typeof window !== 'undefined') {
    window.MovieApp = MovieApp;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MovieApp;
  }

  // Automatic bootstrap on DOMContentLoaded or immediate if already loaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initApp);
    } else {
      initApp();
    }
  }
})();
