import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryDatabase } from '../server/db/inMemoryDb.js';
import { Movie } from '../server/models/Movie.js';
import { Review } from '../server/models/Review.js';
import { Comment } from '../server/models/Comment.js';
import { Rating } from '../server/models/Rating.js';

test('Data Models - validation and instantiation', () => {
  // Movie validation
  assert.throws(() => new Movie({}), /Movie title is required/);
  assert.throws(() => new Movie({ title: 'Test' }), /Valid release year is required/);
  const movie = new Movie({ id: '100', title: 'Test Movie', year: 2024, genre: ['Action'] });
  assert.equal(movie.id, '100');
  assert.equal(movie.title, 'Test Movie');
  assert.equal(movie.year, 2024);
  assert.deepEqual(movie.genre, ['Action']);

  // Review validation
  assert.throws(() => new Review({}), /Movie ID is required/);
  assert.throws(() => new Review({ movieId: '1' }), /Author name is required/);
  assert.throws(() => new Review({ movieId: '1', author: 'Me' }), /Review content is required/);
  assert.throws(() => new Review({ movieId: '1', author: 'Me', content: 'Great', rating: 6 }), /Rating must be a number between 1 and 5/);
  const review = new Review({ id: 'rev1', movieId: '1', author: 'Tester', content: 'Awesome movie!', rating: 5 });
  assert.equal(review.id, 'rev1');
  assert.equal(review.rating, 5);

  // Comment validation
  assert.throws(() => new Comment({}), /Movie ID is required/);
  assert.throws(() => new Comment({ movieId: '1' }), /Author name is required/);
  assert.throws(() => new Comment({ movieId: '1', author: 'Me' }), /Comment content is required/);
  const comment = new Comment({ id: 'c1', movieId: '1', author: 'User', content: 'Cool scene' });
  assert.equal(comment.id, 'c1');
  assert.equal(comment.content, 'Cool scene');

  // Rating validation
  assert.throws(() => new Rating({}), /Movie ID is required/);
  assert.throws(() => new Rating({ movieId: '1', rating: 0 }), /Rating must be a number between 1 and 5/);
  const rating = new Rating({ id: 'r1', movieId: '1', rating: 4.5, userId: 'john' });
  assert.equal(rating.rating, 4.5);
  assert.equal(rating.userId, 'john');
});

test('InMemoryDatabase - Seed initialization', async () => {
  const db = new InMemoryDatabase({ autoSeed: true });
  const movies = await db.getAllMovies();
  assert.ok(movies.length >= 8);

  const inception = await db.getMovieById('1');
  assert.ok(inception);
  assert.equal(inception.title, 'Inception');
  assert.ok(inception.ratings.length > 0);
  assert.ok(inception.reviews.length > 0);
  assert.ok(inception.comments.length > 0);
  assert.ok(inception.averageRating > 0);
});

test('InMemoryDatabase - Search and Genre filtering', async () => {
  const db = new InMemoryDatabase({ autoSeed: true });
  
  const sciFiMovies = await db.getAllMovies({ genre: 'Sci-Fi' });
  assert.ok(sciFiMovies.length >= 3);
  assert.ok(sciFiMovies.every(m => m.genre.includes('Sci-Fi')));

  const searchResults = await db.getAllMovies({ search: 'Nolan' });
  assert.ok(searchResults.length >= 3);
  assert.ok(searchResults.some(m => m.title === 'Inception'));
  assert.ok(searchResults.some(m => m.title === 'The Dark Knight'));
  assert.ok(searchResults.some(m => m.title === 'Interstellar'));
});

test('InMemoryDatabase - Movie CRUD operations', async () => {
  const db = new InMemoryDatabase({ autoSeed: false });

  // Create
  const created = await db.createMovie({
    title: 'New Movie',
    year: 2025,
    genre: ['Thriller'],
    director: 'Great Director',
    synopsis: 'A fantastic new plot'
  });
  assert.ok(created.id);
  assert.equal(created.title, 'New Movie');

  // Read
  const fetched = await db.getMovieById(created.id);
  assert.equal(fetched.title, 'New Movie');

  // Update
  const updated = await db.updateMovie(created.id, { title: 'Updated Title' });
  assert.equal(updated.title, 'Updated Title');

  // Delete
  const deleted = await db.deleteMovie(created.id);
  assert.equal(deleted, true);
  const fetchedAfterDelete = await db.getMovieById(created.id);
  assert.equal(fetchedAfterDelete, null);
});

test('InMemoryDatabase - Ratings CRUD and Stats', async () => {
  const db = new InMemoryDatabase({ autoSeed: false });
  const movie = await db.createMovie({ title: 'Test', year: 2020 });

  const r1 = await db.addRating(movie.id, { userId: 'u1', rating: 4 });
  const r2 = await db.addRating(movie.id, { userId: 'u2', rating: 5 });

  const stats = db.calculateRatingStats(movie.id);
  assert.equal(stats.totalRatings, 2);
  assert.equal(stats.averageRating, 4.5);

  // Updating existing user rating
  await db.addRating(movie.id, { userId: 'u1', rating: 2 });
  const updatedStats = db.calculateRatingStats(movie.id);
  assert.equal(updatedStats.totalRatings, 2);
  assert.equal(updatedStats.averageRating, 3.5);
});

test('InMemoryDatabase - Reviews & Comments CRUD', async () => {
  const db = new InMemoryDatabase({ autoSeed: false });
  const movie = await db.createMovie({ title: 'Test Reviews', year: 2021 });

  // Add review
  const review = await db.addReview(movie.id, {
    author: 'Critic',
    content: 'Must watch!',
    rating: 5
  });
  assert.equal(review.author, 'Critic');

  const reviews = await db.getReviewsByMovieId(movie.id);
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].content, 'Must watch!');

  // Add comment
  const comment = await db.addComment(movie.id, {
    author: 'Fan',
    content: 'Totally agree'
  });
  assert.equal(comment.author, 'Fan');

  const comments = await db.getCommentsByMovieId(movie.id);
  assert.equal(comments.length, 1);
  assert.equal(comments[0].content, 'Totally agree');

  // Delete review and comment
  await db.deleteReview(review.id);
  await db.deleteComment(comment.id);

  assert.equal((await db.getReviewsByMovieId(movie.id)).length, 0);
  assert.equal((await db.getCommentsByMovieId(movie.id)).length, 0);
});

test('InMemoryDatabase - Thread safety / Concurrency', async () => {
  const db = new InMemoryDatabase({ autoSeed: false });
  const movie = await db.createMovie({ title: 'Concurrent Movie', year: 2024 });

  // Run 50 concurrent rating additions
  const promises = [];
  for (let i = 0; i < 50; i++) {
    promises.push(db.addRating(movie.id, { userId: `user_${i}`, rating: (i % 5) + 1 }));
  }
  await Promise.all(promises);

  const stats = db.calculateRatingStats(movie.id);
  assert.equal(stats.totalRatings, 50);
});
