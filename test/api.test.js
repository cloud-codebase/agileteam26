import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { server } from '../server/index.js';
import { db } from '../server/db/index.js';

const TEST_PORT = 3998;

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : null;
        } catch (e) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', reject);

    if (body !== null) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

test('API Integration Tests', async (t) => {
  // Start server on test port
  await new Promise((resolve) => {
    server.listen(TEST_PORT, resolve);
  });

  t.after(() => {
    server.close();
  });

  await t.test('GET /api/movies returns 200 and seed list of movies', async () => {
    const res = await makeRequest('/api/movies');
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 8);
    assert.ok(res.body[0].title);
    assert.ok(typeof res.body[0].averageRating === 'number');
  });

  await t.test('GET /api/movies with search query', async () => {
    const res = await makeRequest('/api/movies?search=Inception');
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body));
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].title, 'Inception');
  });

  await t.test('GET /api/movies with genre query', async () => {
    const res = await makeRequest('/api/movies?genre=Drama');
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 2);
    assert.ok(res.body.every(m => m.genre.includes('Drama')));
  });

  await t.test('GET /api/movies/:id returns details with reviews and ratings', async () => {
    const res = await makeRequest('/api/movies/1');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.id, '1');
    assert.equal(res.body.title, 'Inception');
    assert.ok(Array.isArray(res.body.ratings));
    assert.ok(Array.isArray(res.body.reviews));
    assert.ok(Array.isArray(res.body.comments));
    assert.ok(res.body.averageRating > 0);
  });

  await t.test('GET /api/movies/9999 returns 404', async () => {
    const res = await makeRequest('/api/movies/9999');
    assert.equal(res.statusCode, 404);
    assert.ok(res.body.error);
  });

  await t.test('POST /api/movies/:id/ratings submits rating and returns 201', async () => {
    const res = await makeRequest('/api/movies/1/ratings', 'POST', {
      rating: 5,
      userId: 'tester1'
    });
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.rating.rating, 5);
    assert.ok(res.body.averageRating > 0);
  });

  await t.test('POST /api/movies/:id/ratings validates range and returns 400', async () => {
    const res = await makeRequest('/api/movies/1/ratings', 'POST', {
      rating: 10
    });
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.error);
  });

  await t.test('GET /api/movies/:id/ratings returns ratings array', async () => {
    const res = await makeRequest('/api/movies/1/ratings');
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.ratings));
    assert.ok(res.body.ratings.length >= 2);
  });

  await t.test('POST /api/movies/:id/reviews submits review and returns 201', async () => {
    const res = await makeRequest('/api/movies/1/reviews', 'POST', {
      author: 'MovieCritic',
      content: 'A groundbreaking thriller with incredible music.',
      rating: 5
    });
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.review.author, 'MovieCritic');
    assert.equal(res.body.review.rating, 5);
  });

  await t.test('POST /api/movies/:id/reviews validates missing fields (400)', async () => {
    const res = await makeRequest('/api/movies/1/reviews', 'POST', {
      author: '',
      content: ''
    });
    assert.equal(res.statusCode, 400);
  });

  await t.test('GET /api/movies/:id/reviews returns reviews list', async () => {
    const res = await makeRequest('/api/movies/1/reviews');
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 1);
  });

  await t.test('POST /api/movies/:id/comments submits comment and returns 201', async () => {
    const res = await makeRequest('/api/movies/1/comments', 'POST', {
      author: 'Fanatic',
      content: 'Best movie soundtrack of the decade!'
    });
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.comment.content, 'Best movie soundtrack of the decade!');
  });

  await t.test('GET /api/movies/:id/comments returns comments list', async () => {
    const res = await makeRequest('/api/movies/1/comments');
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 1);
  });

  await t.test('POST /api/movies creates movie and returns 201', async () => {
    const res = await makeRequest('/api/movies', 'POST', {
      title: 'Gladiator',
      year: 2000,
      genre: ['Action', 'Drama'],
      director: 'Ridley Scott',
      synopsis: 'A former Roman General sets out to exact vengeance.'
    });
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.title, 'Gladiator');
    assert.ok(res.body.id);
  });

  await t.test('GET /api/genres returns distinct genre list', async () => {
    const res = await makeRequest('/api/genres');
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.includes('Sci-Fi'));
    assert.ok(res.body.includes('Drama'));
    assert.ok(res.body.includes('Action'));
  });

  await t.test('DELETE /api/movies/:id deletes movie', async () => {
    // Create a movie to delete
    const createRes = await makeRequest('/api/movies', 'POST', {
      title: 'Temporary Movie',
      year: 2022
    });
    const tempId = createRes.body.id;

    const delRes = await makeRequest(`/api/movies/${tempId}`, 'DELETE');
    assert.equal(delRes.statusCode, 200);

    const getRes = await makeRequest(`/api/movies/${tempId}`);
    assert.equal(getRes.statusCode, 404);
  });
});
