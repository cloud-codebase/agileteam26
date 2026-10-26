/**
 * Rating Model
 */
export class Rating {
  constructor({
    id,
    movieId,
    userId = 'anonymous',
    rating,
    createdAt = new Date().toISOString()
  }) {
    if (!movieId) {
      throw new Error('Movie ID is required for a rating.');
    }
    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      throw new Error('Rating must be a number between 1 and 5.');
    }

    this.id = id ? String(id) : null;
    this.movieId = String(movieId);
    this.userId = typeof userId === 'string' && userId.trim().length > 0 ? userId.trim() : 'anonymous';
    this.rating = Math.round(numRating * 10) / 10;
    this.createdAt = createdAt;
  }

  toJSON() {
    return {
      id: this.id,
      movieId: this.movieId,
      userId: this.userId,
      rating: this.rating,
      createdAt: this.createdAt
    };
  }
}
