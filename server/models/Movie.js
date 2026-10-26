/**
 * Movie Model
 */
export class Movie {
  constructor({
    id,
    title,
    year,
    genre = [],
    director = '',
    synopsis = '',
    posterUrl = '',
    createdAt = new Date().toISOString()
  }) {
    if (!title || typeof title !== 'string') {
      throw new Error('Movie title is required and must be a string.');
    }
    if (!year || isNaN(Number(year))) {
      throw new Error('Valid release year is required.');
    }

    this.id = id ? String(id) : null;
    this.title = title.trim();
    this.year = Number(year);
    this.genre = Array.isArray(genre) ? genre : [genre];
    this.director = director.trim();
    this.synopsis = synopsis.trim();
    this.posterUrl = posterUrl.trim();
    this.createdAt = createdAt;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      year: this.year,
      genre: this.genre,
      director: this.director,
      synopsis: this.synopsis,
      posterUrl: this.posterUrl,
      createdAt: this.createdAt
    };
  }
}
