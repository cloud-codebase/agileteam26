import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

/**
 * Helper to get distinct genres across all movies
 */
export async function getDistinctGenres() {
  const movies = await db.getAllMovies();
  const set = new Set();
  for (const movie of movies) {
    if (Array.isArray(movie.genre)) {
      movie.genre.forEach(g => set.add(g));
    } else if (movie.genre) {
      set.add(movie.genre);
    }
  }
  return Array.from(set).sort();
}

/**
 * GET /api/movies/genres
 * Returns list of distinct genres
 */
router.get('/genres', async (req, res) => {
  try {
    const genres = await getDistinctGenres();
    res.status(200).json(genres);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/movies
 * Optional query parameters:
 *  - search / title / q: text query
 *  - genre: genre filter
 */
router.get('/', async (req, res) => {
  try {
    const { search, title, q, genre } = req.query;
    const searchQuery = search || title || q || '';
    const movies = await db.getAllMovies({ search: searchQuery, genre });
    res.status(200).json(movies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/movies/:id
 * Returns detailed movie data including ratings, reviews, and comments
 */
router.get('/:id', async (req, res) => {
  try {
    const movie = await db.getMovieById(req.params.id);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    res.status(200).json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/movies
 * Create new movie
 */
router.post('/', async (req, res) => {
  try {
    const { title, year, releaseYear, genre, director, synopsis, posterUrl } = req.body || {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Movie title is required' });
    }

    const movieYear = Number(year || releaseYear);
    if (!movieYear || isNaN(movieYear)) {
      return res.status(400).json({ error: 'Valid release year is required' });
    }

    const movie = await db.createMovie({
      title: title.trim(),
      year: movieYear,
      genre: genre || ['General'],
      director: (director || '').trim(),
      synopsis: (synopsis || '').trim(),
      posterUrl: (posterUrl || '').trim()
    });

    res.status(201).json(movie);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/movies/:id
 * Update movie
 */
router.put('/:id', async (req, res) => {
  try {
    const movie = await db.getMovieById(req.params.id);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const updated = await db.updateMovie(req.params.id, req.body || {});
    res.status(200).json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/movies/:id
 * Delete movie
 */
router.delete('/:id', async (req, res) => {
  try {
    const success = await db.deleteMovie(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    res.status(200).json({ message: 'Movie deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/movies/:id/ratings
 * Retrieve ratings list and aggregate statistics
 */
router.get('/:id/ratings', async (req, res) => {
  try {
    const movie = await db.getMovieById(req.params.id);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const ratings = await db.getRatingsByMovieId(req.params.id);
    const stats = db.calculateRatingStats(req.params.id);

    res.status(200).json({
      movieId: String(req.params.id),
      averageRating: stats.averageRating,
      totalRatings: stats.totalRatings,
      ratings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/movies/:id/ratings
 * Submit a rating (1 to 5)
 */
router.post('/:id/ratings', async (req, res) => {
  try {
    const movie = await db.getMovieById(req.params.id);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const body = req.body || {};
    const rawRating = body.rating !== undefined ? body.rating : body.value;
    const numRating = Number(rawRating);

    if (rawRating === undefined || rawRating === null || isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
    }

    const userId = (body.userId || body.user || body.userName || body.author || 'anonymous').trim() || 'anonymous';
    const rating = await db.addRating(req.params.id, { userId, rating: numRating });
    const stats = db.calculateRatingStats(req.params.id);

    res.status(201).json({
      message: 'Rating submitted successfully',
      rating,
      averageRating: stats.averageRating,
      totalRatings: stats.totalRatings
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/movies/:id/reviews
 * Retrieve reviews for a movie
 */
router.get('/:id/reviews', async (req, res) => {
  try {
    const movie = await db.getMovieById(req.params.id);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const reviews = await db.getReviewsByMovieId(req.params.id);
    res.status(200).json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/movies/:id/reviews
 * Submit a written review
 */
router.post('/:id/reviews', async (req, res) => {
  try {
    const movie = await db.getMovieById(req.params.id);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const body = req.body || {};
    const author = (body.author || body.user || body.userName || '').trim();
    const content = (body.content || body.review || body.text || '').trim();
    const rawRating = body.rating !== undefined ? body.rating : body.value;

    if (!author) {
      return res.status(400).json({ error: 'Author name is required' });
    }
    if (!content) {
      return res.status(400).json({ error: 'Review content is required' });
    }

    let rating = null;
    if (rawRating !== undefined && rawRating !== null && rawRating !== '') {
      const numRating = Number(rawRating);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
      }
      rating = numRating;
    }

    const review = await db.addReview(req.params.id, {
      author,
      content,
      rating
    });

    const stats = db.calculateRatingStats(req.params.id);

    res.status(201).json({
      message: 'Review submitted successfully',
      review,
      averageRating: stats.averageRating,
      totalRatings: stats.totalRatings
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/movies/:id/comments
 * Retrieve comments for a movie
 */
router.get('/:id/comments', async (req, res) => {
  try {
    const movie = await db.getMovieById(req.params.id);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const comments = await db.getCommentsByMovieId(req.params.id);
    res.status(200).json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/movies/:id/comments
 * Submit a user comment
 */
router.post('/:id/comments', async (req, res) => {
  try {
    const movie = await db.getMovieById(req.params.id);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const body = req.body || {};
    const author = (body.author || body.user || body.userName || '').trim();
    const content = (body.content || body.comment || body.text || '').trim();

    if (!author) {
      return res.status(400).json({ error: 'Author name is required' });
    }
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const comment = await db.addComment(req.params.id, {
      author,
      content
    });

    res.status(201).json({
      message: 'Comment submitted successfully',
      comment
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
