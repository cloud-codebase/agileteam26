import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';
import { db } from './db/index.js';
import movieRoutes, { getDistinctGenres } from './routes/movieRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

let expressApp = null;

try {
  const expressModule = await import('express');
  const corsModule = await import('cors');
  const express = expressModule.default || expressModule;
  const cors = corsModule.default || corsModule;

  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static assets from public/
  app.use(express.static(publicDir));

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Genres endpoint directly on /api/genres
  app.get('/api/genres', async (req, res) => {
    try {
      const genres = await getDistinctGenres();
      res.status(200).json(genres);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mount movie routes
  app.use('/api/movies', movieRoutes);
  app.use('/movies', movieRoutes);

  // Catch-all for undefined API routes
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  expressApp = app;
} catch (err) {
  // If express is not installed, fallback to native handler
  expressApp = null;
}

/**
 * Zero-dependency native HTTP request handler fallback
 */
export async function nativeHandler(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;
  const method = req.method.toUpperCase();

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

  const getBody = () => new Promise((resolve, reject) => {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', () => {
      try {
        resolve(bodyStr ? JSON.parse(bodyStr) : {});
      } catch (err) {
        reject(err);
      }
    });
  });

  if (pathname === '/health' || pathname === '/api/health') {
    return sendJson(200, { status: 'ok', timestamp: new Date().toISOString() });
  }

  if (pathname === '/api/genres' || pathname === '/api/movies/genres' || pathname === '/movies/genres') {
    try {
      const genres = await getDistinctGenres();
      return sendJson(200, genres);
    } catch (e) {
      return sendJson(500, { error: e.message });
    }
  }

  let routePath = pathname;
  if (routePath.startsWith('/api/movies')) {
    routePath = routePath.substring('/api'.length);
  }

  try {
    if (routePath === '/movies' || routePath === '/movies/') {
      if (method === 'GET') {
        const searchQuery = query.search || query.title || query.q || '';
        const movies = await db.getAllMovies({ search: searchQuery, genre: query.genre });
        return sendJson(200, movies);
      }
      if (method === 'POST') {
        const body = await getBody();
        if (!body.title || !String(body.title).trim()) {
          return sendJson(400, { error: 'Movie title is required' });
        }
        const yr = Number(body.year || body.releaseYear);
        if (!yr || isNaN(yr)) {
          return sendJson(400, { error: 'Valid release year is required' });
        }
        const created = await db.createMovie({
          title: String(body.title).trim(),
          year: yr,
          genre: body.genre || ['General'],
          director: (body.director || '').trim(),
          synopsis: (body.synopsis || '').trim(),
          posterUrl: (body.posterUrl || '').trim()
        });
        return sendJson(201, created);
      }
    }

    const match = routePath.match(/^\/movies\/([^/]+)(?:\/(ratings|reviews|comments))?$/);
    if (match) {
      const movieId = match[1];
      const subRoute = match[2];

      const movie = await db.getMovieById(movieId);
      if (!movie) {
        return sendJson(404, { error: 'Movie not found' });
      }

      if (!subRoute) {
        if (method === 'GET') return sendJson(200, movie);
        if (method === 'PUT') {
          const body = await getBody();
          const updated = await db.updateMovie(movieId, body || {});
          return sendJson(200, updated);
        }
        if (method === 'DELETE') {
          await db.deleteMovie(movieId);
          return sendJson(200, { message: 'Movie deleted successfully' });
        }
      } else if (subRoute === 'ratings') {
        if (method === 'GET') {
          const ratings = await db.getRatingsByMovieId(movieId);
          const stats = db.calculateRatingStats(movieId);
          return sendJson(200, { movieId, averageRating: stats.averageRating, totalRatings: stats.totalRatings, ratings });
        }
        if (method === 'POST') {
          const body = await getBody();
          const rawRating = body && (body.rating !== undefined ? body.rating : body.value);
          const numRating = Number(rawRating);
          if (rawRating === undefined || rawRating === null || isNaN(numRating) || numRating < 1 || numRating > 5) {
            return sendJson(400, { error: 'Rating must be a number between 1 and 5' });
          }
          const userId = (body.userId || body.user || body.userName || body.author || 'anonymous').trim() || 'anonymous';
          const rating = await db.addRating(movieId, { userId, rating: numRating });
          const stats = db.calculateRatingStats(movieId);
          return sendJson(201, { message: 'Rating submitted successfully', rating, averageRating: stats.averageRating, totalRatings: stats.totalRatings });
        }
      } else if (subRoute === 'reviews') {
        if (method === 'GET') {
          const reviews = await db.getReviewsByMovieId(movieId);
          return sendJson(200, reviews);
        }
        if (method === 'POST') {
          const body = await getBody();
          const author = (body.author || body.user || body.userName || '').trim();
          const content = (body.content || body.review || body.text || '').trim();
          if (!author) return sendJson(400, { error: 'Author name is required' });
          if (!content) return sendJson(400, { error: 'Review content is required' });

          let rating = null;
          const rawRating = body.rating !== undefined ? body.rating : body.value;
          if (rawRating !== undefined && rawRating !== null && rawRating !== '') {
            const num = Number(rawRating);
            if (isNaN(num) || num < 1 || num > 5) {
              return sendJson(400, { error: 'Rating must be a number between 1 and 5' });
            }
            rating = num;
          }
          const review = await db.addReview(movieId, { author, content, rating });
          const stats = db.calculateRatingStats(movieId);
          return sendJson(201, { message: 'Review submitted successfully', review, averageRating: stats.averageRating, totalRatings: stats.totalRatings });
        }
      } else if (subRoute === 'comments') {
        if (method === 'GET') {
          const comments = await db.getCommentsByMovieId(movieId);
          return sendJson(200, comments);
        }
        if (method === 'POST') {
          const body = await getBody();
          const author = (body.author || body.user || body.userName || '').trim();
          const content = (body.content || body.comment || body.text || '').trim();
          if (!author) return sendJson(400, { error: 'Author name is required' });
          if (!content) return sendJson(400, { error: 'Comment content is required' });

          const comment = await db.addComment(movieId, { author, content });
          return sendJson(201, { message: 'Comment submitted successfully', comment });
        }
      }
    }
  } catch (err) {
    return sendJson(500, { error: err.message });
  }

  return sendJson(404, { error: 'Endpoint not found' });
}

export const app = expressApp || nativeHandler;
export default app;
