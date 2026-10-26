const express = require('express');
const { db } = require('../db/inMemoryDb');

const router = express.Router();

/**
 * GET /api/movies/genres
 * Returns list of distinct genres
 */
router.get('/genres', (req, res) => {
  const genres = db.getGenres();
  res.status(200).json(genres);
});

/**
 * GET /api/movies
 * Query parameters:
 *  - search / title / q: text query
 *  - genre: genre filter
 */
router.get('/', (req, res) => {
  const { search, title, genre, q } = req.query;
  const movies = db.getAllMovies({ search, title, genre, q });
  res.status(200).json(movies);
});

/**
 * GET /api/movies/:id
 * Returns full movie details including reviews, comments, and ratings
 */
router.get('/:id', (req, res) => {
  const movie = db.getMovieById(req.params.id);
  if (!movie) {
    return res.status(404).json({ error: 'Movie not found' });
  }
  res.status(200).json(movie);
});

/**
 * POST /api/movies
 * Create new movie
 */
router.post('/', (req, res) => {
  const { title, genre, releaseYear, director, synopsis, posterUrl } = req.body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required and must be non-empty' });
  }

  const movie = db.createMovie({
    title: title.trim(),
    genre: (genre || 'General').trim(),
    releaseYear,
    director: (director || 'Unknown').trim(),
    synopsis: (synopsis || '').trim(),
    posterUrl: (posterUrl || '').trim()
  });

  res.status(201).json(movie);
});

/**
 * PUT /api/movies/:id
 * Update movie
 */
router.put('/:id', (req, res) => {
  const movie = db.getMovieById(req.params.id);
  if (!movie) {
    return res.status(404).json({ error: 'Movie not found' });
  }

  const updated = db.updateMovie(req.params.id, req.body || {});
  res.status(200).json(updated);
});

/**
 * DELETE /api/movies/:id
 * Delete movie
 */
router.delete('/:id', (req, res) => {
  const success = db.deleteMovie(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Movie not found' });
  }
  res.status(200).json({ message: 'Movie deleted successfully' });
});

/**
 * GET /api/movies/:id/ratings
 * Retrieve ratings breakdown and list for a movie
 */
router.get('/:id/ratings', (req, res) => {
  const ratings = db.getRatings(req.params.id);
  if (!ratings) {
    return res.status(404).json({ error: 'Movie not found' });
  }
  res.status(200).json(ratings);
});

/**
 * POST /api/movies/:id/ratings
 * Submit a rating (1 to 5)
 */
router.post('/:id/ratings', (req, res) => {
  const movie = db.getMovieById(req.params.id);
  if (!movie) {
    return res.status(404).json({ error: 'Movie not found' });
  }

  const body = req.body || {};
  const rawRating = body.rating !== undefined ? body.rating : body.value;
  const ratingNum = Number(rawRating);

  if (rawRating === undefined || rawRating === null || isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({
      error: 'Rating is required and must be a number between 1 and 5'
    });
  }

  const user = (body.user || body.userName || body.author || 'Anonymous').trim() || 'Anonymous';
  const result = db.addRating(req.params.id, { rating: ratingNum, user });

  res.status(201).json({
    message: 'Rating submitted successfully',
    ...result
  });
});

/**
 * GET /api/movies/:id/reviews
 * Retrieve reviews for a movie
 */
router.get('/:id/reviews', (req, res) => {
  const reviews = db.getReviews(req.params.id);
  if (!reviews) {
    return res.status(404).json({ error: 'Movie not found' });
  }
  res.status(200).json(reviews);
});

/**
 * POST /api/movies/:id/reviews
 * Submit a review
 */
router.post('/:id/reviews', (req, res) => {
  const movie = db.getMovieById(req.params.id);
  if (!movie) {
    return res.status(404).json({ error: 'Movie not found' });
  }

  const body = req.body || {};
  const author = (body.author || body.user || body.userName || '').trim();
  const content = (body.content || body.review || body.text || '').trim();
  const title = (body.title || '').trim();
  const rawRating = body.rating !== undefined ? body.rating : body.value;

  if (!content) {
    return res.status(400).json({ error: 'Review content is required' });
  }

  let rating = null;
  if (rawRating !== undefined && rawRating !== null && rawRating !== '') {
    const parsedRating = Number(rawRating);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
    }
    rating = parsedRating;
  }

  const newReview = db.addReview(req.params.id, {
    author: author || 'Anonymous',
    title,
    content,
    rating
  });

  res.status(201).json({
    message: 'Review submitted successfully',
    review: newReview
  });
});

/**
 * GET /api/movies/:id/comments
 * Retrieve comments for a movie
 */
router.get('/:id/comments', (req, res) => {
  const comments = db.getComments(req.params.id);
  if (!comments) {
    return res.status(404).json({ error: 'Movie not found' });
  }
  res.status(200).json(comments);
});

/**
 * POST /api/movies/:id/comments
 * Submit a comment
 */
router.post('/:id/comments', (req, res) => {
  const movie = db.getMovieById(req.params.id);
  if (!movie) {
    return res.status(404).json({ error: 'Movie not found' });
  }

  const body = req.body || {};
  const author = (body.author || body.user || body.userName || '').trim();
  const content = (body.content || body.comment || body.text || '').trim();

  if (!content) {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  const newComment = db.addComment(req.params.id, {
    author: author || 'Anonymous',
    content
  });

  res.status(201).json({
    message: 'Comment submitted successfully',
    comment: newComment
  });
});

module.exports = router;
