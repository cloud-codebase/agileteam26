import { Movie } from '../models/Movie.js';
import { Rating } from '../models/Rating.js';
import { Review } from '../models/Review.js';
import { Comment } from '../models/Comment.js';
import { initialMovies, initialRatings, initialReviews, initialComments } from './seedData.js';

/**
 * Thread-safe In-Memory Database Store for Movies, Ratings, Reviews, and Comments.
 */
export class InMemoryDatabase {
  constructor({ autoSeed = true } = {}) {
    this._movies = new Map();
    this._ratings = new Map();
    this._reviews = new Map();
    this._comments = new Map();

    this._nextMovieId = 1;
    this._nextRatingId = 1;
    this._nextReviewId = 1;
    this._nextCommentId = 1;

    // Mutex / Queue mechanism to ensure serialized write operations
    this._lock = Promise.resolve();

    if (autoSeed) {
      this.seed();
    }
  }

  /**
   * Helper to execute operations sequentially in a thread-safe manner
   */
  async _withLock(operation) {
    const nextLock = this._lock.then(() => operation()).catch((err) => {
      // Re-throw after lock resolves to not block subsequent operations
      throw err;
    });
    this._lock = nextLock.then(() => {}, () => {});
    return nextLock;
  }

  /**
   * Seed database with initial data
   */
  seed() {
    this.clear();

    for (const movieData of initialMovies) {
      const movie = new Movie(movieData);
      this._movies.set(movie.id, movie);
      const numId = parseInt(movie.id, 10);
      if (!isNaN(numId) && numId >= this._nextMovieId) {
        this._nextMovieId = numId + 1;
      }
    }

    for (const ratingData of initialRatings) {
      const rating = new Rating(ratingData);
      this._ratings.set(rating.id, rating);
    }

    for (const reviewData of initialReviews) {
      const review = new Review(reviewData);
      this._reviews.set(review.id, review);
    }

    for (const commentData of initialComments) {
      const comment = new Comment(commentData);
      this._comments.set(comment.id, comment);
    }
  }

  /**
   * Clear all records
   */
  clear() {
    this._movies.clear();
    this._ratings.clear();
    this._reviews.clear();
    this._comments.clear();
    this._nextMovieId = 1;
    this._nextRatingId = 1;
    this._nextReviewId = 1;
    this._nextCommentId = 1;
  }

  /**
   * Reset database to seed state
   */
  async reset() {
    return this._withLock(async () => {
      this.seed();
      return true;
    });
  }

  // ==========================================
  // MOVIE OPERATIONS
  // ==========================================

  /**
   * Get all movies with optional filters (search, genre) and computed stats
   */
  async getAllMovies({ search = '', genre = '' } = {}) {
    const movies = Array.from(this._movies.values());

    let filtered = movies;

    if (genre && genre.trim() !== '') {
      const lowerGenre = genre.trim().toLowerCase();
      filtered = filtered.filter(m =>
        m.genre.some(g => g.toLowerCase() === lowerGenre)
      );
    }

    if (search && search.trim() !== '') {
      const query = search.trim().toLowerCase();
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.director.toLowerCase().includes(query) ||
        m.synopsis.toLowerCase().includes(query)
      );
    }

    return filtered.map(movie => this._enrichMovieSummary(movie));
  }

  /**
   * Get movie details by ID including ratings, reviews, and comments
   */
  async getMovieById(id) {
    const movie = this._movies.get(String(id));
    if (!movie) {
      return null;
    }
    return this._enrichMovieDetail(movie);
  }

  /**
   * Create a new movie
   */
  async createMovie(data) {
    return this._withLock(async () => {
      const id = data.id ? String(data.id) : String(this._nextMovieId++);
      if (this._movies.has(id)) {
        throw new Error(`Movie with ID ${id} already exists.`);
      }
      const movie = new Movie({ ...data, id });
      this._movies.set(movie.id, movie);
      return this._enrichMovieDetail(movie);
    });
  }

  /**
   * Update an existing movie
   */
  async updateMovie(id, updates) {
    return this._withLock(async () => {
      const movie = this._movies.get(String(id));
      if (!movie) {
        return null;
      }

      const updated = new Movie({
        ...movie.toJSON(),
        ...updates,
        id: movie.id,
        createdAt: movie.createdAt
      });

      this._movies.set(movie.id, updated);
      return this._enrichMovieDetail(updated);
    });
  }

  /**
   * Delete movie and its associated ratings, reviews, comments
   */
  async deleteMovie(id) {
    return this._withLock(async () => {
      const strId = String(id);
      if (!this._movies.has(strId)) {
        return false;
      }

      this._movies.delete(strId);

      // Cascade delete ratings
      for (const [rId, rating] of this._ratings.entries()) {
        if (rating.movieId === strId) {
          this._ratings.delete(rId);
        }
      }

      // Cascade delete reviews
      for (const [revId, review] of this._reviews.entries()) {
        if (review.movieId === strId) {
          this._reviews.delete(revId);
        }
      }

      // Cascade delete comments
      for (const [cId, comment] of this._comments.entries()) {
        if (comment.movieId === strId) {
          this._comments.delete(cId);
        }
      }

      return true;
    });
  }

  // ==========================================
  // RATING OPERATIONS
  // ==========================================

  /**
   * Get all ratings for a movie
   */
  async getRatingsByMovieId(movieId) {
    const strMovieId = String(movieId);
    return Array.from(this._ratings.values())
      .filter(r => r.movieId === strMovieId)
      .map(r => r.toJSON());
  }

  /**
   * Add or update a rating for a movie
   */
  async addRating(movieId, { userId = 'anonymous', rating }) {
    return this._withLock(async () => {
      const strMovieId = String(movieId);
      if (!this._movies.has(strMovieId)) {
        throw new Error(`Movie with ID ${movieId} not found.`);
      }

      // Check if user already submitted a rating
      let existingRating = null;
      if (userId && userId !== 'anonymous') {
        existingRating = Array.from(this._ratings.values()).find(
          r => r.movieId === strMovieId && r.userId === userId
        );
      }

      if (existingRating) {
        const updatedRating = new Rating({
          ...existingRating.toJSON(),
          rating
        });
        this._ratings.set(existingRating.id, updatedRating);
        return updatedRating.toJSON();
      }

      const id = 'r_' + (this._nextRatingId++);
      const newRating = new Rating({
        id,
        movieId: strMovieId,
        userId,
        rating
      });
      this._ratings.set(newRating.id, newRating);
      return newRating.toJSON();
    });
  }

  /**
   * Calculate average rating and total ratings count for a movie
   */
  calculateRatingStats(movieId) {
    const strMovieId = String(movieId);
    const movieRatings = Array.from(this._ratings.values()).filter(r => r.movieId === strMovieId);
    if (movieRatings.length === 0) {
      return { averageRating: 0, totalRatings: 0 };
    }
    const sum = movieRatings.reduce((acc, curr) => acc + curr.rating, 0);
    const average = Math.round((sum / movieRatings.length) * 10) / 10;
    return {
      averageRating: average,
      totalRatings: movieRatings.length
    };
  }

  // ==========================================
  // REVIEW OPERATIONS
  // ==========================================

  /**
   * Get all reviews for a movie
   */
  async getReviewsByMovieId(movieId) {
    const strMovieId = String(movieId);
    return Array.from(this._reviews.values())
      .filter(r => r.movieId === strMovieId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(r => r.toJSON());
  }

  /**
   * Add a review for a movie
   */
  async addReview(movieId, { author, content, rating = null }) {
    return this._withLock(async () => {
      const strMovieId = String(movieId);
      if (!this._movies.has(strMovieId)) {
        throw new Error(`Movie with ID ${movieId} not found.`);
      }

      const id = 'rev_' + (this._nextReviewId++);
      const review = new Review({
        id,
        movieId: strMovieId,
        author,
        content,
        rating
      });

      this._reviews.set(review.id, review);

      // If review includes rating, also register it in ratings store
      if (rating !== null && rating !== undefined) {
        const ratingId = 'r_' + (this._nextRatingId++);
        const r = new Rating({
          id: ratingId,
          movieId: strMovieId,
          userId: author,
          rating
        });
        this._ratings.set(r.id, r);
      }

      return review.toJSON();
    });
  }

  /**
   * Delete a review
   */
  async deleteReview(id) {
    return this._withLock(async () => {
      const strId = String(id);
      return this._reviews.delete(strId);
    });
  }

  // ==========================================
  // COMMENT OPERATIONS
  // ==========================================

  /**
   * Get all comments for a movie
   */
  async getCommentsByMovieId(movieId) {
    const strMovieId = String(movieId);
    return Array.from(this._comments.values())
      .filter(c => c.movieId === strMovieId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(c => c.toJSON());
  }

  /**
   * Add a comment for a movie
   */
  async addComment(movieId, { author, content }) {
    return this._withLock(async () => {
      const strMovieId = String(movieId);
      if (!this._movies.has(strMovieId)) {
        throw new Error(`Movie with ID ${movieId} not found.`);
      }

      const id = 'c_' + (this._nextCommentId++);
      const comment = new Comment({
        id,
        movieId: strMovieId,
        author,
        content
      });

      this._comments.set(comment.id, comment);
      return comment.toJSON();
    });
  }

  /**
   * Delete a comment
   */
  async deleteComment(id) {
    return this._withLock(async () => {
      const strId = String(id);
      return this._comments.delete(strId);
    });
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  _enrichMovieSummary(movie) {
    const stats = this.calculateRatingStats(movie.id);
    const reviewsCount = Array.from(this._reviews.values()).filter(r => r.movieId === movie.id).length;
    const commentsCount = Array.from(this._comments.values()).filter(c => c.movieId === movie.id).length;

    return {
      ...movie.toJSON(),
      averageRating: stats.averageRating,
      totalRatings: stats.totalRatings,
      reviewsCount,
      commentsCount
    };
  }

  _enrichMovieDetail(movie) {
    const stats = this.calculateRatingStats(movie.id);
    const reviews = Array.from(this._reviews.values())
      .filter(r => r.movieId === movie.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(r => r.toJSON());

    const comments = Array.from(this._comments.values())
      .filter(c => c.movieId === movie.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(c => c.toJSON());

    const ratings = Array.from(this._ratings.values())
      .filter(r => r.movieId === movie.id)
      .map(r => r.toJSON());

    return {
      ...movie.toJSON(),
      averageRating: stats.averageRating,
      totalRatings: stats.totalRatings,
      ratings,
      reviews,
      comments
    };
  }
}

// Export singleton instance as default for direct use across the app
export const db = new InMemoryDatabase({ autoSeed: true });
