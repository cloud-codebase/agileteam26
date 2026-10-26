/**
 * Review Model
 */
export class Review {
  constructor({
    id,
    movieId,
    author,
    content,
    rating = null,
    createdAt = new Date().toISOString()
  }) {
    if (!movieId) {
      throw new Error('Movie ID is required for a review.');
    }
    if (!author || typeof author !== 'string' || author.trim().length === 0) {
      throw new Error('Author name is required.');
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Review content is required.');
    }
    if (rating !== null && rating !== undefined) {
      const numRating = Number(rating);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        throw new Error('Rating must be a number between 1 and 5.');
      }
      this.rating = numRating;
    } else {
      this.rating = null;
    }

    this.id = id ? String(id) : null;
    this.movieId = String(movieId);
    this.author = author.trim();
    this.content = content.trim();
    this.createdAt = createdAt;
  }

  toJSON() {
    return {
      id: this.id,
      movieId: this.movieId,
      author: this.author,
      content: this.content,
      rating: this.rating,
      createdAt: this.createdAt
    };
  }
}
