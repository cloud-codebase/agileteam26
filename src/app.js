const path = require('path');
const url = require('url');
const { db } = require('./db/inMemoryDb');

let expressApp = null;

try {
  const express = require('express');
  const cors = require('cors');
  const movieRoutes = require('./routes/movieRoutes');

  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static assets from public directory if exists
  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Genres direct route
  app.get('/api/genres', (req, res) => {
    res.status(200).json(db.getGenres());
  });

  // Mount movie routes at both /api/movies and /movies for compatibility
  app.use('/api/movies', movieRoutes);
  app.use('/movies', movieRoutes);

  // Catch-all for undefined API routes
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  expressApp = app;
} catch (err) {
  // express / cors may not be installed in a minimal environment
  expressApp = null;
}

/**
 * Native HTTP Request Handler Fallback
 * Guarantees zero-dependency execution if express/cors are not installed.
 */
function nativeHandler(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  const method = req.method.toUpperCase();

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const sendJson = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  const getBody = (callback) => {
    let bodyStr = '';
    req.on('data', (chunk) => { bodyStr += chunk; });
    req.on('end', () => {
      try {
        const parsed = bodyStr ? JSON.parse(bodyStr) : {};
        callback(null, parsed);
      } catch (e) {
        callback(e);
      }
    });
  };

  // Health
  if (pathname === '/health' || pathname === '/api/health') {
    return sendJson(200, { status: 'ok', timestamp: new Date().toISOString() });
  }

  // Genres
  if (pathname === '/api/genres' || pathname === '/api/movies/genres' || pathname === '/movies/genres') {
    return sendJson(200, db.getGenres());
  }

  // Normalize path by stripping /api if present
  let routePath = pathname;
  if (routePath.startsWith('/api/movies')) {
    routePath = routePath.substring('/api'.length);
  }

  // Routes matching /movies...
  if (routePath === '/movies' || routePath === '/movies/') {
    if (method === 'GET') {
      const list = db.getAllMovies(query);
      return sendJson(200, list);
    }
    if (method === 'POST') {
      return getBody((err, body) => {
        if (err || !body || !body.title || !String(body.title).trim()) {
          return sendJson(400, { error: 'Title is required and must be non-empty' });
        }
        const created = db.createMovie({
          title: String(body.title).trim(),
          genre: (body.genre || 'General').trim(),
          releaseYear: body.releaseYear,
          director: (body.director || 'Unknown').trim(),
          synopsis: (body.synopsis || '').trim(),
          posterUrl: (body.posterUrl || '').trim()
        });
        return sendJson(201, created);
      });
    }
  }

  // Pattern match: /movies/:id, /movies/:id/ratings, /movies/:id/reviews, /movies/:id/comments
  const match = routePath.match(/^\/movies\/([^/]+)(?:\/(ratings|reviews|comments))?$/);
  if (match) {
    const movieId = match[1];
    const subRoute = match[2];

    const movie = db.getMovieById(movieId);
    if (!movie) {
      return sendJson(404, { error: 'Movie not found' });
    }

    if (!subRoute) {
      if (method === 'GET') return sendJson(200, movie);
      if (method === 'PUT') {
        return getBody((err, body) => {
          const updated = db.updateMovie(movieId, body || {});
          return sendJson(200, updated);
        });
      }
      if (method === 'DELETE') {
        db.deleteMovie(movieId);
        return sendJson(200, { message: 'Movie deleted successfully' });
      }
    } else if (subRoute === 'ratings') {
      if (method === 'GET') {
        return sendJson(200, db.getRatings(movieId));
      }
      if (method === 'POST') {
        return getBody((err, body) => {
          const raw = body && (body.rating !== undefined ? body.rating : body.value);
          const val = Number(raw);
          if (raw === undefined || raw === null || isNaN(val) || val < 1 || val > 5) {
            return sendJson(400, { error: 'Rating is required and must be a number between 1 and 5' });
          }
          const user = (body.user || body.userName || body.author || 'Anonymous').trim() || 'Anonymous';
          const result = db.addRating(movieId, { rating: val, user });
          return sendJson(201, { message: 'Rating submitted successfully', ...result });
        });
      }
    } else if (subRoute === 'reviews') {
      if (method === 'GET') {
        return sendJson(200, db.getReviews(movieId));
      }
      if (method === 'POST') {
        return getBody((err, body) => {
          const author = (body && (body.author || body.user || body.userName) || '').trim();
          const content = (body && (body.content || body.review || body.text) || '').trim();
          const rawRating = body && (body.rating !== undefined ? body.rating : body.value);
          if (!content) {
            return sendJson(400, { error: 'Review content is required' });
          }
          let rating = null;
          if (rawRating !== undefined && rawRating !== null && rawRating !== '') {
            const parsed = Number(rawRating);
            if (isNaN(parsed) || parsed < 1 || parsed > 5) {
              return sendJson(400, { error: 'Rating must be a number between 1 and 5' });
            }
            rating = parsed;
          }
          const newReview = db.addReview(movieId, {
            author: author || 'Anonymous',
            title: (body.title || '').trim(),
            content,
            rating
          });
          return sendJson(201, { message: 'Review submitted successfully', review: newReview });
        });
      }
    } else if (subRoute === 'comments') {
      if (method === 'GET') {
        return sendJson(200, db.getComments(movieId));
      }
      if (method === 'POST') {
        return getBody((err, body) => {
          const author = (body && (body.author || body.user || body.userName) || '').trim();
          const content = (body && (body.content || body.comment || body.text) || '').trim();
          if (!content) {
            return sendJson(400, { error: 'Comment content is required' });
          }
          const newComment = db.addComment(movieId, {
            author: author || 'Anonymous',
            content
          });
          return sendJson(201, { message: 'Comment submitted successfully', comment: newComment });
        });
      }
    }
  }

  // Default 404
  return sendJson(404, { error: 'Endpoint not found' });
}

module.exports = {
  app: expressApp || nativeHandler,
  expressApp,
  nativeHandler
};
