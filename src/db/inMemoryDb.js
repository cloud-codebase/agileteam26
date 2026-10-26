/**
 * In-Memory Database and Data Store for Movie Review Platform.
 * Supports thread-safe operations with defensive copies.
 */

const initialSeedMovies = [
  {
    id: "1",
    title: "Inception",
    genre: "Sci-Fi",
    genres: ["Sci-Fi", "Action", "Thriller"],
    releaseYear: 2010,
    director: "Christopher Nolan",
    synopsis: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=60",
    ratings: [
      { id: "r1-1", user: "Alice", rating: 5, createdAt: "2023-01-10T12:00:00.000Z" },
      { id: "r1-2", user: "Bob", rating: 4, createdAt: "2023-01-15T14:30:00.000Z" }
    ],
    reviews: [
      {
        id: "rev1-1",
        author: "Alice",
        title: "Mind-bending masterpiece",
        content: "A masterclass in original storytelling and visual effects. The rotating hallway fight scene is iconic.",
        rating: 5,
        createdAt: "2023-01-10T12:00:00.000Z"
      },
      {
        id: "rev1-2",
        author: "Bob",
        title: "Complex but rewarding",
        content: "Requires full attention, but the payoff and Hans Zimmer's score make it an unforgettable experience.",
        rating: 4,
        createdAt: "2023-01-15T14:30:00.000Z"
      }
    ],
    comments: [
      {
        id: "c1-1",
        author: "Charlie",
        content: "Does the spinning top fall at the end? Still debating this years later!",
        createdAt: "2023-02-01T09:15:00.000Z"
      },
      {
        id: "c1-2",
        author: "David",
        content: "Nolan said the point is that Cobb walked away and didn't care anymore.",
        createdAt: "2023-02-02T11:20:00.000Z"
      }
    ]
  },
  {
    id: "2",
    title: "The Shawshank Redemption",
    genre: "Drama",
    genres: ["Drama", "Crime"],
    releaseYear: 1994,
    director: "Frank Darabont",
    synopsis: "Over the course of several years, two convicts form a friendship, seeking solace and, eventually, redemption through basic compassion.",
    posterUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60",
    ratings: [
      { id: "r2-1", user: "Elena", rating: 5, createdAt: "2023-02-10T10:00:00.000Z" },
      { id: "r2-2", user: "Frank", rating: 5, createdAt: "2023-02-12T16:00:00.000Z" }
    ],
    reviews: [
      {
        id: "rev2-1",
        author: "Elena",
        title: "One of the greatest films ever made",
        content: "The emotional resonance and message of hope are unmatched. Morgan Freeman and Tim Robbins give career-best performances.",
        rating: 5,
        createdAt: "2023-02-10T10:00:00.000Z"
      }
    ],
    comments: [
      {
        id: "c2-1",
        author: "Grace",
        content: "Get busy living, or get busy dying. Best line in cinematic history.",
        createdAt: "2023-02-14T08:00:00.000Z"
      }
    ]
  },
  {
    id: "3",
    title: "The Dark Knight",
    genre: "Action",
    genres: ["Action", "Crime", "Drama"],
    releaseYear: 2008,
    director: "Christopher Nolan",
    synopsis: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    posterUrl: "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500&auto=format&fit=crop&q=60",
    ratings: [
      { id: "r3-1", user: "Harry", rating: 5, createdAt: "2023-03-01T15:00:00.000Z" },
      { id: "r3-2", user: "Iris", rating: 5, createdAt: "2023-03-02T19:00:00.000Z" },
      { id: "r3-3", user: "Jack", rating: 4, createdAt: "2023-03-03T21:00:00.000Z" }
    ],
    reviews: [
      {
        id: "rev3-1",
        author: "Harry",
        title: "Heath Ledger redefined villainy",
        content: "An electrifying superhero crime drama that transcends its genre. Ledger's Joker is legendary.",
        rating: 5,
        createdAt: "2023-03-01T15:00:00.000Z"
      }
    ],
    comments: [
      {
        id: "c3-1",
        author: "Kara",
        content: "Why so serious? Still gives me chills every time.",
        createdAt: "2023-03-05T12:00:00.000Z"
      }
    ]
  },
  {
    id: "4",
    title: "Pulp Fiction",
    genre: "Crime",
    genres: ["Crime", "Drama"],
    releaseYear: 1994,
    director: "Quentin Tarantino",
    synopsis: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
    posterUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&auto=format&fit=crop&q=60",
    ratings: [
      { id: "r4-1", user: "Liam", rating: 4, createdAt: "2023-03-10T11:00:00.000Z" },
      { id: "r4-2", user: "Mia", rating: 5, createdAt: "2023-03-12T14:00:00.000Z" }
    ],
    reviews: [
      {
        id: "rev4-1",
        author: "Liam",
        title: "Brilliantly unconventional",
        content: "Sharp dialogue, non-linear storytelling, and a killer soundtrack. Changed cinema forever.",
        rating: 4,
        createdAt: "2023-03-10T11:00:00.000Z"
      }
    ],
    comments: [
      {
        id: "c4-1",
        author: "Noah",
        content: "The diner scene is one of the best opening scenes in film.",
        createdAt: "2023-03-15T18:00:00.000Z"
      }
    ]
  },
  {
    id: "5",
    title: "Spirited Away",
    genre: "Animation",
    genres: ["Animation", "Adventure", "Fantasy"],
    releaseYear: 2001,
    director: "Hayao Miyazaki",
    synopsis: "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, and where humans are changed into beasts.",
    posterUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500&auto=format&fit=crop&q=60",
    ratings: [
      { id: "r5-1", user: "Olivia", rating: 5, createdAt: "2023-04-01T09:00:00.000Z" },
      { id: "r5-2", user: "Peter", rating: 5, createdAt: "2023-04-02T13:00:00.000Z" }
    ],
    reviews: [
      {
        id: "rev5-1",
        author: "Olivia",
        title: "Pure cinematic magic",
        content: "Breathtaking animation and deeply imaginative lore. Studio Ghibli at the absolute peak of its artistry.",
        rating: 5,
        createdAt: "2023-04-01T09:00:00.000Z"
      }
    ],
    comments: [
      {
        id: "c5-1",
        author: "Quinn",
        content: "Joe Hisaishi's score for this film brings tears to my eyes.",
        createdAt: "2023-04-05T10:00:00.000Z"
      }
    ]
  },
  {
    id: "6",
    title: "Interstellar",
    genre: "Sci-Fi",
    genres: ["Sci-Fi", "Adventure", "Drama"],
    releaseYear: 2014,
    director: "Christopher Nolan",
    synopsis: "When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot, Joseph Cooper, is tasked to pilot a spacecraft, along with a team of researchers, to find a new planet for humans.",
    posterUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=60",
    ratings: [
      { id: "r6-1", user: "Rachel", rating: 5, createdAt: "2023-04-10T16:00:00.000Z" },
      { id: "r6-2", user: "Sam", rating: 4, createdAt: "2023-04-11T18:00:00.000Z" }
    ],
    reviews: [
      {
        id: "rev6-1",
        author: "Rachel",
        title: "Emotional and visually epic",
        content: "Combines grand cosmic exploration with an intimate story about the love between a father and daughter.",
        rating: 5,
        createdAt: "2023-04-10T16:00:00.000Z"
      }
    ],
    comments: [
      {
        id: "c6-1",
        author: "Tina",
        content: "The docking scene with the organ music is unmatched intensity.",
        createdAt: "2023-04-14T19:30:00.000Z"
      }
    ]
  }
];

class InMemoryDatabase {
  constructor() {
    this.movies = new Map();
    this.reset();
  }

  reset() {
    this.movies.clear();
    const cloned = JSON.parse(JSON.stringify(initialSeedMovies));
    for (const movie of cloned) {
      this.movies.set(String(movie.id), movie);
    }
  }

  _computeAggregateRating(movie) {
    if (!movie.ratings || movie.ratings.length === 0) {
      return { averageRating: 0, totalRatings: 0, rating: 0 };
    }
    const sum = movie.ratings.reduce((acc, r) => acc + (Number(r.rating || r.value) || 0), 0);
    const avg = Math.round((sum / movie.ratings.length) * 10) / 10;
    return {
      averageRating: avg,
      rating: avg,
      totalRatings: movie.ratings.length
    };
  }

  _formatMovieSummary(movie) {
    const stats = this._computeAggregateRating(movie);
    return {
      id: movie.id,
      title: movie.title,
      genre: movie.genre,
      genres: movie.genres || [movie.genre],
      releaseYear: movie.releaseYear || movie.year,
      director: movie.director,
      synopsis: movie.synopsis || movie.description,
      posterUrl: movie.posterUrl || movie.poster,
      averageRating: stats.averageRating,
      rating: stats.rating,
      totalRatings: stats.totalRatings,
      reviewsCount: (movie.reviews || []).length,
      commentsCount: (movie.comments || []).length
    };
  }

  _formatMovieDetail(movie) {
    const stats = this._computeAggregateRating(movie);
    return {
      ...JSON.parse(JSON.stringify(movie)),
      averageRating: stats.averageRating,
      rating: stats.rating,
      totalRatings: stats.totalRatings,
      reviewsCount: (movie.reviews || []).length,
      commentsCount: (movie.comments || []).length
    };
  }

  getAllMovies(filters = {}) {
    const { search, title, genre, q } = filters;
    const query = (search || title || q || "").trim().toLowerCase();
    const genreFilter = (genre || "").trim().toLowerCase();

    let list = Array.from(this.movies.values());

    if (query) {
      list = list.filter((m) => {
        const titleMatch = (m.title || "").toLowerCase().includes(query);
        const synopsisMatch = (m.synopsis || m.description || "").toLowerCase().includes(query);
        const directorMatch = (m.director || "").toLowerCase().includes(query);
        return titleMatch || synopsisMatch || directorMatch;
      });
    }

    if (genreFilter && genreFilter !== "all") {
      list = list.filter((m) => {
        if (m.genre && m.genre.toLowerCase() === genreFilter) return true;
        if (Array.isArray(m.genres)) {
          return m.genres.some((g) => g.toLowerCase() === genreFilter);
        }
        return false;
      });
    }

    return list.map((m) => this._formatMovieSummary(m));
  }

  getMovieById(id) {
    const movie = this.movies.get(String(id));
    if (!movie) return null;
    return this._formatMovieDetail(movie);
  }

  createMovie(data) {
    const id = data.id ? String(data.id) : String(Date.now());
    const movie = {
      id,
      title: data.title,
      genre: data.genre || "General",
      genres: data.genres || [data.genre || "General"],
      releaseYear: Number(data.releaseYear || data.year) || new Date().getFullYear(),
      director: data.director || "Unknown",
      synopsis: data.synopsis || data.description || "",
      posterUrl: data.posterUrl || data.poster || "",
      ratings: [],
      reviews: [],
      comments: []
    };
    this.movies.set(id, movie);
    return this._formatMovieDetail(movie);
  }

  updateMovie(id, data) {
    const movie = this.movies.get(String(id));
    if (!movie) return null;
    if (data.title !== undefined) movie.title = data.title;
    if (data.genre !== undefined) {
      movie.genre = data.genre;
      if (!data.genres) movie.genres = [data.genre];
    }
    if (data.genres !== undefined) movie.genres = data.genres;
    if (data.releaseYear !== undefined || data.year !== undefined) {
      movie.releaseYear = Number(data.releaseYear || data.year);
    }
    if (data.director !== undefined) movie.director = data.director;
    if (data.synopsis !== undefined || data.description !== undefined) {
      movie.synopsis = data.synopsis || data.description;
    }
    if (data.posterUrl !== undefined || data.poster !== undefined) {
      movie.posterUrl = data.posterUrl || data.poster;
    }
    return this._formatMovieDetail(movie);
  }

  deleteMovie(id) {
    return this.movies.delete(String(id));
  }

  addRating(movieId, ratingData) {
    const movie = this.movies.get(String(movieId));
    if (!movie) return null;

    const val = Number(ratingData.rating !== undefined ? ratingData.rating : ratingData.value);
    const newRating = {
      id: `r-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user: ratingData.user || ratingData.userName || ratingData.author || "Anonymous",
      rating: val,
      value: val,
      createdAt: new Date().toISOString()
    };

    movie.ratings = movie.ratings || [];
    movie.ratings.push(newRating);

    const stats = this._computeAggregateRating(movie);
    return {
      rating: newRating,
      averageRating: stats.averageRating,
      totalRatings: stats.totalRatings
    };
  }

  getRatings(movieId) {
    const movie = this.movies.get(String(movieId));
    if (!movie) return null;
    const stats = this._computeAggregateRating(movie);
    return {
      movieId: String(movieId),
      averageRating: stats.averageRating,
      totalRatings: stats.totalRatings,
      ratings: JSON.parse(JSON.stringify(movie.ratings || []))
    };
  }

  addReview(movieId, reviewData) {
    const movie = this.movies.get(String(movieId));
    if (!movie) return null;

    const newReview = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      author: reviewData.author || reviewData.user || reviewData.userName || "Anonymous",
      title: reviewData.title || "",
      content: reviewData.content || reviewData.review || reviewData.text || "",
      rating: reviewData.rating ? Number(reviewData.rating) : null,
      createdAt: new Date().toISOString()
    };

    // If review includes a rating, also register it in ratings
    if (newReview.rating && newReview.rating >= 1 && newReview.rating <= 5) {
      movie.ratings = movie.ratings || [];
      movie.ratings.push({
        id: `r-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        user: newReview.author,
        rating: newReview.rating,
        value: newReview.rating,
        createdAt: newReview.createdAt
      });
    }

    movie.reviews = movie.reviews || [];
    movie.reviews.unshift(newReview);

    return JSON.parse(JSON.stringify(newReview));
  }

  getReviews(movieId) {
    const movie = this.movies.get(String(movieId));
    if (!movie) return null;
    return JSON.parse(JSON.stringify(movie.reviews || []));
  }

  addComment(movieId, commentData) {
    const movie = this.movies.get(String(movieId));
    if (!movie) return null;

    const newComment = {
      id: `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      author: commentData.author || commentData.user || commentData.userName || "Anonymous",
      content: commentData.content || commentData.comment || commentData.text || "",
      createdAt: new Date().toISOString()
    };

    movie.comments = movie.comments || [];
    movie.comments.unshift(newComment);

    return JSON.parse(JSON.stringify(newComment));
  }

  getComments(movieId) {
    const movie = this.movies.get(String(movieId));
    if (!movie) return null;
    return JSON.parse(JSON.stringify(movie.comments || []));
  }

  getGenres() {
    const set = new Set();
    for (const movie of this.movies.values()) {
      if (movie.genre) set.add(movie.genre);
      if (Array.isArray(movie.genres)) {
        movie.genres.forEach((g) => set.add(g));
      }
    }
    return Array.from(set).sort();
  }
}

const db = new InMemoryDatabase();
module.exports = { InMemoryDatabase, db };
