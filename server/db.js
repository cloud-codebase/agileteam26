/**
 * In-Memory Database and Data Store for MovieHub V2
 * Adheres to DESIGN.md specification
 */

function computeMovieMetrics(movie) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  if (Array.isArray(movie.ratings) && movie.ratings.length > 0) {
    movie.ratings.forEach(r => {
      const star = Math.round(r);
      if (dist[star] !== undefined) {
        dist[star]++;
      }
      sum += r;
    });
    movie.ratingDistribution = dist;
    movie.ratingsCount = movie.ratings.length;
    movie.avgRating = parseFloat((sum / movie.ratings.length).toFixed(1));
  } else {
    movie.ratings = [];
    movie.ratingDistribution = dist;
    movie.ratingsCount = 0;
    movie.avgRating = 0.0;
  }
  return movie;
}

const initialSeedMovies = [
  {
    id: 'm1',
    title: 'Inception',
    director: 'Christopher Nolan',
    cast: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt', 'Elliot Page', 'Tom Hardy'],
    genres: ['Action', 'Sci-Fi', 'Thriller'],
    releaseYear: 2010,
    posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400',
    synopsis: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    ratings: [5, 5, 5, 4, 5, 5, 4, 5, 4, 5, 5, 4, 5, 5, 5, 4, 5, 5, 4, 5, 4, 5, 5, 5],
    reviews: [
      {
        id: 'rev-101',
        movieId: 'm1',
        author: 'Dominic Cobb',
        rating: 5,
        comment: 'Visually stunning and mind-bending masterpiece! The spinning top ending still leaves me speechless.',
        helpfulVotes: 14,
        timestamp: '2026-10-20T14:32:00.000Z'
      },
      {
        id: 'rev-102',
        movieId: 'm1',
        author: 'Ariadne Architect',
        rating: 5,
        comment: 'Brilliant conceptual direction with seamless editing and Hans Zimmer’s iconic score.',
        helpfulVotes: 8,
        timestamp: '2026-10-22T09:15:00.000Z'
      }
    ]
  },
  {
    id: 'm2',
    title: 'Interstellar',
    director: 'Christopher Nolan',
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine'],
    genres: ['Sci-Fi', 'Drama'],
    releaseYear: 2014,
    posterUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=400',
    synopsis: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival as Earth faces famine.",
    ratings: [5, 5, 5, 5, 4, 5, 5, 4, 5, 4],
    reviews: [
      {
        id: 'rev-103',
        movieId: 'm2',
        author: 'Cooper Pilot',
        rating: 5,
        comment: 'An emotional, scientifically thrilling, and visually monumental journey through the cosmos.',
        helpfulVotes: 19,
        timestamp: '2026-10-18T11:20:00.000Z'
      }
    ]
  },
  {
    id: 'm3',
    title: 'The Dark Knight',
    director: 'Christopher Nolan',
    cast: ['Christian Bale', 'Heath Ledger', 'Aaron Eckhart', 'Gary Oldman'],
    genres: ['Action', 'Crime', 'Drama'],
    releaseYear: 2008,
    posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400',
    synopsis: 'When the menace known as the Joker wreaks havoc and chaos on Gotham City, Batman must accept one of the greatest psychological and physical tests.',
    ratings: [5, 5, 5, 5, 5, 5, 5, 4, 5, 5],
    reviews: [
      {
        id: 'rev-104',
        movieId: 'm3',
        author: 'Bruce Wayne',
        rating: 5,
        comment: "Heath Ledger's performance is timeless and chilling. The gold standard of superhero thrillers.",
        helpfulVotes: 25,
        timestamp: '2026-10-15T18:40:00.000Z'
      }
    ]
  },
  {
    id: 'm4',
    title: 'Pulp Fiction',
    director: 'Quentin Tarantino',
    cast: ['John Travolta', 'Uma Thurman', 'Samuel L. Jackson', 'Bruce Willis'],
    genres: ['Crime', 'Drama'],
    releaseYear: 1994,
    posterUrl: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=400',
    synopsis: 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.',
    ratings: [5, 4, 5, 4, 5, 4, 5, 4],
    reviews: [
      {
        id: 'rev-105',
        movieId: 'm4',
        author: 'Jules Winnfield',
        rating: 5,
        comment: 'Iconic dialogue, unbelievable soundtrack, and nonlinear storytelling that defined modern American indie cinema.',
        helpfulVotes: 11,
        timestamp: '2026-10-10T12:00:00.000Z'
      }
    ]
  },
  {
    id: 'm5',
    title: 'The Matrix',
    director: 'Lana Wachowski, Lilly Wachowski',
    cast: ['Keanu Reeves', 'Laurence Fishburne', 'Carrie-Anne Moss', 'Hugo Weaving'],
    genres: ['Action', 'Sci-Fi'],
    releaseYear: 1999,
    posterUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400',
    synopsis: 'When a beautiful stranger leads computer hacker Neo to a forbidding underworld, he discovers the shocking truth--the life he knows is the elaborate deception of an evil cyber-intelligence.',
    ratings: [5, 5, 4, 5, 5, 4, 5, 4],
    reviews: [
      {
        id: 'rev-106',
        movieId: 'm5',
        author: 'Morpheus',
        rating: 5,
        comment: 'Take the red pill. Action choreography and philosophical depth that changed sci-fi forever.',
        helpfulVotes: 16,
        timestamp: '2026-10-12T16:20:00.000Z'
      }
    ]
  },
  {
    id: 'm6',
    title: 'Spirited Away',
    director: 'Hayao Miyazaki',
    cast: ['Rumi Hiiragi', 'Miyu Irino', 'Mari Natsuki'],
    genres: ['Animation', 'Adventure', 'Family'],
    releaseYear: 2001,
    posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400',
    synopsis: 'During her family’s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches and spirits, and where humans are changed into beasts.',
    ratings: [5, 5, 5, 5, 5, 4, 5, 4],
    reviews: [
      {
        id: 'rev-107',
        movieId: 'm6',
        author: 'Chihiro Ogino',
        rating: 5,
        comment: 'Studio Ghibli magic at its absolute pinnacle. Every frame is hand-drawn perfection.',
        helpfulVotes: 21,
        timestamp: '2026-10-08T08:30:00.000Z'
      }
    ]
  },
  {
    id: 'm7',
    title: 'Parasite',
    director: 'Bong Joon-ho',
    cast: ['Song Kang-ho', 'Lee Sun-kyun', 'Cho Yeo-jeong', 'Choi Woo-shik'],
    genres: ['Drama', 'Thriller', 'Comedy'],
    releaseYear: 2019,
    posterUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400',
    synopsis: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
    ratings: [5, 5, 5, 4, 5, 4, 5, 5],
    reviews: [
      {
        id: 'rev-108',
        movieId: 'm7',
        author: 'Ki-woo Kim',
        rating: 5,
        comment: 'Sublime genre blending and searing social commentary. Unpredictable and brilliantly staged.',
        helpfulVotes: 15,
        timestamp: '2026-10-14T20:10:00.000Z'
      }
    ]
  },
  {
    id: 'm8',
    title: 'The Grand Budapest Hotel',
    director: 'Wes Anderson',
    cast: ['Ralph Fiennes', 'F. Murray Abraham', 'Mathieu Amalric', 'Saoirse Ronan'],
    genres: ['Comedy', 'Drama'],
    releaseYear: 2014,
    posterUrl: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=400',
    synopsis: 'A writer encounters the owner of an aging high-class hotel, who tells him of his early years serving as a lobby boy in the hotel’s glorious years under an exceptional concierge.',
    ratings: [4, 4, 5, 4, 5, 4, 4, 5],
    reviews: [
      {
        id: 'rev-109',
        movieId: 'm8',
        author: 'Zero Moustafa',
        rating: 4,
        comment: 'Whimsical, exquisitely framed, and Ralph Fiennes gives a tour-de-force comic performance.',
        helpfulVotes: 7,
        timestamp: '2026-10-19T13:45:00.000Z'
      }
    ]
  }
];

// In-memory movies collection
let movies = [];

function resetDatabase() {
  movies = JSON.parse(JSON.stringify(initialSeedMovies));
  movies.forEach(computeMovieMetrics);
}

// Initial seed
resetDatabase();

/**
 * Retrieve movies with optional search, genre filter, and sorting
 */
function getAllMovies({ q, genre, sortBy, order } = {}) {
  // Clone to avoid accidental external mutation
  let result = movies.map(m => ({
    id: m.id,
    title: m.title,
    director: m.director,
    cast: [...m.cast],
    genres: [...m.genres],
    releaseYear: m.releaseYear,
    posterUrl: m.posterUrl,
    synopsis: m.synopsis,
    avgRating: m.avgRating,
    ratingsCount: m.ratingsCount,
    ratingDistribution: { ...m.ratingDistribution },
    ratings: [...m.ratings],
    reviews: m.reviews.map(r => ({ ...r }))
  }));

  // 1. Search Query filter across title, director, cast
  if (q && typeof q === 'string' && q.trim()) {
    const term = q.trim().toLowerCase();
    result = result.filter(movie => {
      const matchTitle = movie.title && movie.title.toLowerCase().includes(term);
      const matchDirector = movie.director && movie.director.toLowerCase().includes(term);
      const matchCast = Array.isArray(movie.cast) && movie.cast.some(actor => actor.toLowerCase().includes(term));
      return matchTitle || matchDirector || matchCast;
    });
  }

  // 2. Genre filter
  if (genre && typeof genre === 'string' && genre.trim().toLowerCase() !== 'all') {
    const targetGenre = genre.trim().toLowerCase();
    result = result.filter(movie => {
      return Array.isArray(movie.genres) && movie.genres.some(g => g.toLowerCase() === targetGenre);
    });
  }

  // 3. Sorting (sortBy & order)
  let sortField = (sortBy || 'rating').toLowerCase();
  let sortDirection = order ? order.toLowerCase() : null;

  // Support composite sortBy values (e.g., 'rating-desc', 'year-desc', 'title-asc')
  if (sortField.includes('-')) {
    const parts = sortField.split('-');
    sortField = parts[0];
    if (!sortDirection) {
      sortDirection = parts[1];
    }
  }

  // Set default direction according to specification:
  // rating -> desc, year -> desc, title -> asc
  if (!sortDirection || (sortDirection !== 'asc' && sortDirection !== 'desc')) {
    if (sortField === 'title') {
      sortDirection = 'asc';
    } else {
      sortDirection = 'desc';
    }
  }

  result.sort((a, b) => {
    let comparison = 0;
    if (sortField === 'title') {
      comparison = (a.title || '').localeCompare(b.title || '');
    } else if (sortField === 'year' || sortField === 'releaseyear') {
      comparison = (a.releaseYear || 0) - (b.releaseYear || 0);
    } else {
      // default: rating
      comparison = (a.avgRating || 0) - (b.avgRating || 0);
      if (comparison === 0) {
        comparison = (a.ratingsCount || 0) - (b.ratingsCount || 0);
      }
    }

    return sortDirection === 'desc' ? -comparison : comparison;
  });

  return result;
}

/**
 * Retrieve a single movie by ID with complete reviews and ratings
 */
function getMovieById(id) {
  const movie = movies.find(m => m.id === String(id));
  if (!movie) return null;
  return {
    id: movie.id,
    title: movie.title,
    director: movie.director,
    cast: [...movie.cast],
    genres: [...movie.genres],
    releaseYear: movie.releaseYear,
    posterUrl: movie.posterUrl,
    synopsis: movie.synopsis,
    avgRating: movie.avgRating,
    ratingsCount: movie.ratingsCount,
    ratingDistribution: { ...movie.ratingDistribution },
    ratings: [...movie.ratings],
    reviews: movie.reviews.map(r => ({ ...r }))
  };
}

/**
 * Add a new review to a movie and recompute aggregate rating metrics
 */
function addReview(movieId, { author, rating, comment }) {
  const movie = movies.find(m => m.id === String(movieId));
  if (!movie) return null;

  const parsedRating = parseInt(rating, 10);
  const newReview = {
    id: `rev-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    movieId: movie.id,
    author: author.trim(),
    rating: parsedRating,
    comment: comment.trim(),
    helpfulVotes: 0,
    timestamp: new Date().toISOString()
  };

  movie.reviews.unshift(newReview);
  movie.ratings.push(parsedRating);
  computeMovieMetrics(movie);

  return newReview;
}

/**
 * Increment helpful votes for a review
 */
function upvoteReview(movieId, reviewId) {
  const movie = movies.find(m => m.id === String(movieId));
  if (!movie) {
    return { error: 'Movie not found' };
  }

  const review = movie.reviews.find(r => r.id === String(reviewId));
  if (!review) {
    return { error: 'Review not found' };
  }

  review.helpfulVotes = (review.helpfulVotes || 0) + 1;
  return { data: { reviewId: review.id, helpfulVotes: review.helpfulVotes } };
}

module.exports = {
  getAllMovies,
  getMovieById,
  addReview,
  upvoteReview,
  computeMovieMetrics,
  resetDatabase
};
