const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// In-memory movie database with seed data
const movies = [
  {
    id: 1,
    title: "Inception",
    year: 2010,
    genre: "Sci-Fi",
    director: "Christopher Nolan",
    posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500",
    synopsis: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    ratings: [5, 4, 5, 5, 4],
    reviews: [
      {
        id: "rev-1",
        author: "Alice",
        rating: 5,
        comment: "A mind-bending cinematic masterpiece with stunning visuals!",
        date: "2026-10-25T12:00:00Z"
      }
    ]
  },
  {
    id: 2,
    title: "The Shawshank Redemption",
    year: 1994,
    genre: "Drama",
    director: "Frank Darabont",
    posterUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500",
    synopsis: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
    ratings: [5, 5, 5, 4, 5],
    reviews: [
      {
        id: "rev-2",
        author: "Bob",
        rating: 5,
        comment: "An inspirational story of hope, resilience, and quiet endurance.",
        date: "2026-10-26T14:30:00Z"
      }
    ]
  },
  {
    id: 3,
    title: "The Dark Knight",
    year: 2008,
    genre: "Action",
    director: "Christopher Nolan",
    posterUrl: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500",
    synopsis: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    ratings: [5, 5, 4, 5, 5],
    reviews: [
      {
        id: "rev-3",
        author: "Charlie",
        rating: 5,
        comment: "Heath Ledger's performance as the Joker is unmatched in cinematic history.",
        date: "2026-10-27T09:15:00Z"
      }
    ]
  },
  {
    id: 4,
    title: "Spirited Away",
    year: 2001,
    genre: "Animation",
    director: "Hayao Miyazaki",
    posterUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500",
    synopsis: "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, where humans are changed into beasts.",
    ratings: [5, 5, 5, 4, 5],
    reviews: [
      {
        id: "rev-4",
        author: "Diana",
        rating: 5,
        comment: "Visually breathtaking and emotionally resonant. A timeless Studio Ghibli masterpiece.",
        date: "2026-10-27T16:45:00Z"
      }
    ]
  },
  {
    id: 5,
    title: "Parasite",
    year: 2019,
    genre: "Thriller",
    director: "Bong Joon Ho",
    posterUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500",
    synopsis: "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
    ratings: [5, 4, 5, 5, 4],
    reviews: [
      {
        id: "rev-5",
        author: "Ethan",
        rating: 5,
        comment: "A brilliantly crafted social satire that keeps you on the edge of your seat.",
        date: "2026-10-28T11:20:00Z"
      }
    ]
  },
  {
    id: 6,
    title: "Interstellar",
    year: 2014,
    genre: "Sci-Fi",
    director: "Christopher Nolan",
    posterUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500",
    synopsis: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    ratings: [5, 5, 4, 4, 5],
    reviews: [
      {
        id: "rev-6",
        author: "Fiona",
        rating: 5,
        comment: "Hans Zimmer's score paired with epic interstellar visuals makes this unforgettable.",
        date: "2026-10-28T18:00:00Z"
      }
    ]
  }
];

// Helper to compute derived movie fields
function formatMovie(movie) {
  const ratings = Array.isArray(movie.ratings) ? movie.ratings : [];
  const averageRating = ratings.length > 0
    ? Number((ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1))
    : 0;

  return {
    ...movie,
    averageRating,
    ratingCount: ratings.length,
    reviewCount: Array.isArray(movie.reviews) ? movie.reviews.length : 0
  };
}

// REST API Endpoints

// GET /api/movies - Query params: ?genre=Sci-Fi, ?search=Inception
app.get('/api/movies', (req, res) => {
  let result = [...movies];
  const { genre, search } = req.query;

  if (genre && genre.trim().toLowerCase() !== 'all') {
    const targetGenre = genre.trim().toLowerCase();
    result = result.filter(m => m.genre && m.genre.toLowerCase() === targetGenre);
  }

  if (search && search.trim()) {
    const query = search.trim().toLowerCase();
    result = result.filter(m =>
      (m.title && m.title.toLowerCase().includes(query)) ||
      (m.director && m.director.toLowerCase().includes(query)) ||
      (m.synopsis && m.synopsis.toLowerCase().includes(query))
    );
  }

  res.status(200).json(result.map(formatMovie));
});

// GET /api/movies/:id
app.get('/api/movies/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const movie = movies.find(m => m.id === id);

  if (!movie) {
    return res.status(404).json({ error: "Movie not found" });
  }

  res.status(200).json(formatMovie(movie));
});

// POST /api/movies/:id/ratings
app.post('/api/movies/:id/ratings', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const movie = movies.find(m => m.id === id);

  if (!movie) {
    return res.status(404).json({ error: "Movie not found" });
  }

  const { rating } = req.body;
  const numRating = Number(rating);

  if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
  }

  movie.ratings.push(numRating);
  const updated = formatMovie(movie);

  res.status(200).json({
    message: "Rating submitted successfully",
    averageRating: updated.averageRating,
    ratingCount: updated.ratingCount
  });
});

// POST /api/movies/:id/reviews
app.post('/api/movies/:id/reviews', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const movie = movies.find(m => m.id === id);

  if (!movie) {
    return res.status(404).json({ error: "Movie not found" });
  }

  const { author, rating, comment } = req.body;
  const numRating = Number(rating);

  if (
    !author || typeof author !== 'string' || !author.trim() ||
    !comment || typeof comment !== 'string' || !comment.trim() ||
    !Number.isInteger(numRating) || numRating < 1 || numRating > 5
  ) {
    return res.status(400).json({
      error: "Valid author, rating (integer 1-5), and comment are required"
    });
  }

  const newReview = {
    id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    author: author.trim(),
    rating: numRating,
    comment: comment.trim(),
    date: new Date().toISOString()
  };

  movie.reviews.push(newReview);
  movie.ratings.push(numRating);

  const updated = formatMovie(movie);

  res.status(201).json({
    message: "Review added successfully",
    review: newReview,
    averageRating: updated.averageRating,
    ratingCount: updated.ratingCount,
    reviewCount: updated.reviewCount
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`CineCritique server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
