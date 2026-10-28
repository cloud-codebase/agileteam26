/**
 * Client-Side REST API Client for Movie Review & Rating Application
 * Implements the contract defined in DESIGN.md (SCRUM-125)
 */

const MovieAPI = {
  // Automatically detects if running behind Nginx or direct Express
  baseUrl: (typeof window !== 'undefined' && window.location && (window.location.port === '8080' || window.location.port === '3000'))
    ? '/api'
    : 'http://localhost:3000/api',

  /**
   * Fetches movies catalog with optional genre or search filter
   * @param {Object} params - { genre?: string, search?: string }
   * @returns {Promise<Array>} Array of movie summary objects
   */
  async getMovies(params = {}) {
    let url = `${this.baseUrl}/movies`;
    const query = new URLSearchParams();

    if (params.genre && params.genre !== 'all') {
      query.append('genre', params.genre);
    }
    if (params.search && params.search.trim()) {
      query.append('search', params.search.trim());
    }

    const queryString = query.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `Failed to fetch movies (${response.status})`);
    }
    return await response.json();
  },

  /**
   * Fetches full movie details including reviews
   * @param {number|string} id - Movie identifier
   * @returns {Promise<Object>} Movie details object with reviews array
   */
  async getMovieById(id) {
    const url = `${this.baseUrl}/movies/${encodeURIComponent(id)}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `Failed to fetch movie with ID ${id} (${response.status})`);
    }
    return await response.json();
  },

  /**
   * Submits a standalone star rating (1-5) for a movie
   * @param {number|string} movieId - Movie identifier
   * @param {number} rating - Integer rating between 1 and 5
   * @returns {Promise<Object>} { message, averageRating, ratingCount }
   */
  async submitRating(movieId, rating) {
    const url = `${this.baseUrl}/movies/${encodeURIComponent(movieId)}/ratings`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rating: Number(rating) })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `Failed to submit rating (${response.status})`);
    }
    return await response.json();
  },

  /**
   * Submits a full user review and rating for a movie
   * @param {number|string} movieId - Movie identifier
   * @param {Object} reviewData - { author: string, rating: number, comment: string }
   * @returns {Promise<Object>} { message, review, averageRating, ratingCount, reviewCount }
   */
  async submitReview(movieId, reviewData) {
    const url = `${this.baseUrl}/movies/${encodeURIComponent(movieId)}/reviews`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        author: reviewData.author,
        rating: Number(reviewData.rating),
        comment: reviewData.comment
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `Failed to submit review (${response.status})`);
    }
    return await response.json();
  }
};

// Expose globally for browser scripts and module export for testing
if (typeof window !== 'undefined') {
  window.MovieAPI = MovieAPI;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MovieAPI;
}
