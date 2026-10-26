/**
 * Comment Model
 */
export class Comment {
  constructor({
    id,
    movieId,
    author,
    content,
    createdAt = new Date().toISOString()
  }) {
    if (!movieId) {
      throw new Error('Movie ID is required for a comment.');
    }
    if (!author || typeof author !== 'string' || author.trim().length === 0) {
      throw new Error('Author name is required.');
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Comment content is required.');
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
      createdAt: this.createdAt
    };
  }
}
