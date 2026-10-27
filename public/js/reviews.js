/**
 * Reviews Controller & Interactive Feedback UX
 * SCRUM-117: Interactive Review Helpful Votes and Feedback UX
 * Exported globally on window.ReviewsController
 */
(function() {
  'use strict';

  const ReviewsController = {
    activeMovieId: null,

    /**
     * Initializes controller and binds event listeners if elements are present in DOM.
     */
    init() {
      this.bindFormListener();
    },

    /**
     * Called by catalog.js when a movie modal is opened.
     * @param {string} movieId - ID of the active movie
     * @param {Array} [reviews=[]] - Array of review objects
     */
    loadReviewsForMovie(movieId, reviews = []) {
      this.activeMovieId = movieId;
      this.renderReviewsList(reviews);
      this.bindFormListener();
    },

    /**
     * Calculates user initials from author name (e.g., "John Doe" -> "JD").
     * @param {string} name - Author name
     * @returns {string} Initials in uppercase or "??"
     */
    getInitials(name) {
      if (!name || typeof name !== 'string') return '??';
      const trimmed = name.trim();
      if (!trimmed) return '??';

      const parts = trimmed.split(/\s+/).filter(Boolean);
      if (parts.length === 0) return '??';
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    },

    /**
     * Deterministic avatar badge background color based on name hash.
     * @param {string} name
     * @returns {string} Hex color
     */
    getAvatarColor(name) {
      const palette = [
        '#6366f1', // Indigo
        '#8b5cf6', // Violet
        '#ec4899', // Pink
        '#f97316', // Orange
        '#10b981', // Emerald
        '#06b6d4', // Cyan
        '#3b82f6', // Blue
        '#e11d48', // Rose
        '#14b8a6', // Teal
        '#d97706'  // Amber
      ];
      if (!name) return palette[0];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = (hash << 5) - hash + name.charCodeAt(i);
        hash |= 0;
      }
      return palette[Math.abs(hash) % palette.length];
    },

    /**
     * Formats ISO timestamp to human-friendly string (e.g. "Oct 27, 2026").
     * @param {string} timestamp - ISO timestamp string
     * @returns {string} Formatted date string
     */
    formatDate(timestamp) {
      if (!timestamp) return 'Just now';
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return 'Just now';
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    },

    /**
     * Escapes HTML entities to prevent XSS.
     * @param {string} str
     * @returns {string}
     */
    escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    /**
     * Creates a single review card DOM element.
     * @param {Object} review
     * @returns {HTMLElement}
     */
    createReviewCardElement(review) {
      const card = document.createElement('div');
      card.className = 'review-card';
      if (review.id) {
        card.id = `review-${review.id}`;
      }

      const rating = Math.max(1, Math.min(5, parseInt(review.rating, 10) || 5));
      const starsFilled = '★'.repeat(rating);
      const starsEmpty = '☆'.repeat(5 - rating);

      const initials = this.getInitials(review.author);
      const formattedDate = this.formatDate(review.timestamp);
      const helpfulVotes = Number(review.helpfulVotes) || 0;
      const avatarColor = this.getAvatarColor(review.author);

      card.innerHTML = `
        <div class="review-card-layout">
          <div class="user-avatar" title="${this.escapeHtml(review.author || 'User')}" style="background-color: ${avatarColor};">
            ${this.escapeHtml(initials)}
          </div>
          <div class="review-main-content">
            <div class="review-header">
              <div class="review-author-meta">
                <span class="review-author">${this.escapeHtml(review.author || 'Anonymous')}</span>
                <span class="review-date">${this.escapeHtml(formattedDate)}</span>
              </div>
              <div class="review-stars" aria-label="${rating} out of 5 stars" title="${rating} of 5 stars">
                <span class="stars-filled">${starsFilled}</span><span class="stars-empty">${starsEmpty}</span>
              </div>
            </div>
            <p class="review-comment">${this.escapeHtml(review.comment || '')}</p>
            <div class="review-footer">
              <button type="button" class="btn-helpful" data-review-id="${this.escapeHtml(review.id || '')}" aria-label="Mark review as helpful">
                <span class="helpful-icon">👍</span>
                <span class="helpful-label">Helpful</span>
                <span class="helpful-count-badge">(<span class="helpful-count">${helpfulVotes}</span>)</span>
              </button>
            </div>
          </div>
        </div>
      `;

      return card;
    },

    /**
     * Renders review cards into #reviews-list.
     * @param {Array} reviews
     */
    renderReviewsList(reviews) {
      const container = document.getElementById('reviews-list');
      if (!container) return;

      container.innerHTML = '';

      if (!Array.isArray(reviews) || reviews.length === 0) {
        container.innerHTML = `
          <div class="empty-reviews" id="no-reviews-msg">
            <p>No reviews yet. Be the first to share your thoughts!</p>
          </div>
        `;
        return;
      }

      reviews.forEach(review => {
        const card = this.createReviewCardElement(review);
        container.appendChild(card);
      });
    },

    /**
     * Prepends newly submitted review to top of #reviews-list.
     * @param {Object} review
     */
    addReviewCardToTop(review) {
      const container = document.getElementById('reviews-list');
      if (!container) return;

      // Remove empty state message if present
      const emptyMsg = container.querySelector('.empty-reviews, #no-reviews-msg');
      if (emptyMsg) {
        emptyMsg.remove();
      }

      const card = this.createReviewCardElement(review);
      card.classList.add('review-card-new');
      container.prepend(card);
    },

    /**
     * Binds submit listener to #add-review-form and click delegation to #reviews-list.
     */
    bindFormListener() {
      const form = document.getElementById('add-review-form');
      if (form && !form.dataset.listenerBound) {
        form.dataset.listenerBound = 'true';
        form.addEventListener('submit', (e) => this.handleSubmitReview(e));
      }

      const reviewsList = document.getElementById('reviews-list');
      if (reviewsList && !reviewsList.dataset.listenerBound) {
        reviewsList.dataset.listenerBound = 'true';
        reviewsList.addEventListener('click', (e) => {
          const btn = e.target.closest('.btn-helpful');
          if (btn) {
            const reviewId = btn.getAttribute('data-review-id');
            if (reviewId) {
              this.handleUpvote(reviewId, btn);
            }
          }
        });
      }
    },

    /**
     * Handles upvoting with instant UI update and POST /api/movies/:id/reviews/:reviewId/vote.
     * @param {string} reviewId
     * @param {HTMLElement} buttonEl
     */
    async handleUpvote(reviewId, buttonEl) {
      if (!buttonEl || !reviewId) return;

      if (buttonEl.disabled || buttonEl.classList.contains('voted')) {
        if (window.Toast) {
          window.Toast.info('You have already marked this review as helpful.');
        }
        return;
      }

      const countEl = buttonEl.querySelector('.helpful-count');
      const currentCount = parseInt(countEl ? countEl.textContent : '0', 10) || 0;

      // Optimistic instant UI update
      if (countEl) {
        countEl.textContent = currentCount + 1;
      }
      buttonEl.classList.add('voted');
      buttonEl.setAttribute('aria-pressed', 'true');

      const movieId = this.activeMovieId;
      if (!movieId) {
        console.warn('ReviewsController: activeMovieId is not set.');
        return;
      }

      try {
        const response = await fetch(`/api/movies/${encodeURIComponent(movieId)}/reviews/${encodeURIComponent(reviewId)}/vote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data && data.data && typeof data.data.helpfulVotes === 'number') {
          if (countEl) {
            countEl.textContent = data.data.helpfulVotes;
          }
        }

        if (window.Toast) {
          window.Toast.show('Thank you! Review marked as helpful.', 'success');
        }
      } catch (err) {
        console.error('Error recording helpful vote:', err);
        // Rollback optimistic update
        if (countEl) {
          countEl.textContent = currentCount;
        }
        buttonEl.classList.remove('voted');
        buttonEl.removeAttribute('aria-pressed');

        if (window.Toast) {
          window.Toast.show('Failed to record helpful vote. Please try again.', 'error');
        }
      }
    },

    /**
     * Handles review submission with input validation and POST /api/movies/:id/reviews.
     * @param {Event} e
     */
    async handleSubmitReview(e) {
      if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }

      const form = document.getElementById('add-review-form');
      const authorInput = document.getElementById('review-author-input');
      const ratingInput = document.getElementById('review-rating-input');
      const commentInput = document.getElementById('review-comment-input');
      const submitBtn = document.getElementById('review-submit-btn');

      if (!authorInput || !ratingInput || !commentInput) {
        console.error('ReviewsController: Required review form elements missing');
        return;
      }

      const author = authorInput.value.trim();
      const rating = parseInt(ratingInput.value, 10);
      const comment = commentInput.value.trim();

      // Input Validation adhering to DESIGN.md Section 6.2
      if (!author || author.length < 1 || author.length > 50) {
        if (window.Toast) {
          window.Toast.show('Please enter your name (1 to 50 characters).', 'error');
        }
        authorInput.focus();
        return;
      }

      if (isNaN(rating) || rating < 1 || rating > 5) {
        if (window.Toast) {
          window.Toast.show('Please select a rating between 1 and 5 stars.', 'error');
        }
        ratingInput.focus();
        return;
      }

      if (!comment || comment.length < 3 || comment.length > 500) {
        if (window.Toast) {
          window.Toast.show('Please enter a review comment between 3 and 500 characters.', 'error');
        }
        commentInput.focus();
        return;
      }

      if (!this.activeMovieId) {
        if (window.Toast) {
          window.Toast.show('No active movie selected.', 'error');
        }
        return;
      }

      const originalBtnText = submitBtn ? submitBtn.textContent : 'Post Review';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';
      }

      try {
        const response = await fetch(`/api/movies/${encodeURIComponent(this.activeMovieId)}/reviews`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            author,
            rating,
            comment
          })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          const errMsg = result && result.error ? result.error : 'Failed to post review';
          throw new Error(errMsg);
        }

        const newReview = result.data;

        // Prepend new review card to top of list
        this.addReviewCardToTop(newReview);

        // Reset form fields
        if (form) {
          form.reset();
        } else {
          authorInput.value = '';
          commentInput.value = '';
          ratingInput.value = '5';
        }

        if (window.Toast) {
          window.Toast.show('Review submitted successfully!', 'success');
        }
      } catch (err) {
        console.error('Error submitting review:', err);
        if (window.Toast) {
          window.Toast.show(err.message || 'Error submitting review. Please try again.', 'error');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      }
    }
  };

  // Expose on window
  window.ReviewsController = ReviewsController;

  // Auto-bind form if DOM is already loaded or on DOMContentLoaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        ReviewsController.bindFormListener();
      });
    } else {
      ReviewsController.bindFormListener();
    }
  }
})();
