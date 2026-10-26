# Backend In-Memory Database & Models

## Overview
This module provides the in-memory data store and entity models for the Movie Review Application.

## Exported Models & Utilities (`server/db/index.js`)
- `db`: Singleton instance of `InMemoryDatabase` pre-seeded with sample movies, ratings, reviews, and comments.
- `InMemoryDatabase`: Class for instantiating custom or isolated database stores.
- `Movie`, `Rating`, `Review`, `Comment`: Data model classes with runtime validation.
- `initialMovies`, `initialRatings`, `initialReviews`, `initialComments`: Seed dataset.

## Usage Example
```javascript
import { db } from './server/db/index.js';

// Get movies with optional search or genre filtering
const movies = await db.getAllMovies({ search: 'Inception', genre: 'Sci-Fi' });

// Get detailed movie information (including ratings, reviews, comments, and averageRating)
const movie = await db.getMovieById('1');

// Add a user rating (1-5)
const rating = await db.addRating('1', { userId: 'alice', rating: 5 });

// Add a written review
const review = await db.addReview('1', { author: 'Bob', content: 'Fantastic film!', rating: 5 });

// Add a user comment
const comment = await db.addComment('1', { author: 'Charlie', content: 'Incredible cinematography!' });
```
