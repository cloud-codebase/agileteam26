/**
 * Express REST API Server for MovieHub V2
 * Implements endpoints specified in DESIGN.md for SCRUM-115
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend assets from public directory
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// --- REST API Endpoints ---

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime()
  });
});

/**
 * GET /api/movies
 * Advanced search, filtering, and sorting
 * Query params: q, genre, sortBy, order
 */
app.get('/api/movies', (req, res) => {
  try {
    const { q, genre, sortBy, order } = req.query;
    const movies = db.getAllMovies({ q, genre, sortBy, order });
    res.status(200).json({
      success: true,
      count: movies.length,
      data: movies
    });
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve movies'
    });
  }
});

/**
 * GET /api/movies/:id
 * Retrieve single movie details with complete reviews
 */
app.get('/api/movies/:id', (req, res) => {
  try {
    const movie = db.getMovieById(req.params.id);
    if (!movie) {
      return res.status(404).json({
        success: false,
        error: 'Movie not found'
      });
    }

    res.status(200).json({
      success: true,
      data: movie
    });
  } catch (error) {
    console.error('Error fetching movie:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve movie details'
    });
  }
});

/**
 * POST /api/movies/:id/reviews
 * Add a new user review with validation
 * Body: { author, rating, comment }
 */
app.post('/api/movies/:id/reviews', (req, res) => {
  try {
    const movieId = req.params.id;
    const movie = db.getMovieById(movieId);
    if (!movie) {
      return res.status(404).json({
        success: false,
        error: 'Movie not found'
      });
    }

    const { author, rating, comment } = req.body || {};

    // Validate author: string, trimmed length between 1 and 50 characters
    if (!author || typeof author !== 'string' || author.trim().length < 1 || author.trim().length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Author name is required and must be between 1 and 50 characters'
      });
    }

    // Validate rating: integer between 1 and 5
    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be an integer between 1 and 5'
      });
    }

    // Validate comment: string, trimmed length between 3 and 500 characters
    if (!comment || typeof comment !== 'string' || comment.trim().length < 3 || comment.trim().length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Comment is required and must be between 3 and 500 characters'
      });
    }

    const newReview = db.addReview(movieId, {
      author,
      rating: parsedRating,
      comment
    });

    res.status(201).json({
      success: true,
      data: newReview
    });
  } catch (error) {
    console.error('Error posting review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit review'
    });
  }
});

/**
 * POST /api/movies/:id/reviews/:reviewId/vote
 * Increment helpful votes for a review
 */
app.post('/api/movies/:id/reviews/:reviewId/vote', (req, res) => {
  try {
    const { id: movieId, reviewId } = req.params;
    const result = db.upvoteReview(movieId, reviewId);

    if (result.error) {
      const statusCode = (result.error === 'Movie not found' || result.error === 'Review not found') ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }

    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error upvoting review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register vote'
    });
  }
});

// Fallback for API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

// SPA fallback for HTML frontend
app.get('*', (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(200).send('MovieHub API is active. Static UI files will be served once built.');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON payload'
    });
  }
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`MovieHub server running on port ${PORT}`);
  });
}

module.exports = app;
