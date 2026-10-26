/**
 * Automated Test Suite for Movie Database and Review REST API.
 * Uses native Node.js HTTP and assert modules (zero external dependencies).
 */

const http = require('http');
const assert = require('assert');
const { db } = require('../src/db/inMemoryDb');
const server = require('../src/server');

const TEST_PORT = 3999;

function request(options, requestBody = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(opts, (res) => {
      let bodyStr = '';
      res.on('data', (chunk) => { bodyStr += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = bodyStr ? JSON.parse(bodyStr) : null;
        } catch (e) {
          parsed = bodyStr;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', reject);

    if (requestBody !== null) {
      req.write(typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting API Integration Tests ---');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ FAIL: ${name}`);
      console.error(err);
      failed++;
    }
  }

  await new Promise((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`Test server running on port ${TEST_PORT}`);
      resolve();
    });
  });

  try {
    // 1. GET /api/movies
    await test('GET /api/movies returns 200 and seed movies list', async () => {
      const res = await request({ path: '/api/movies' });
      assert.strictEqual(res.statusCode, 200);
      assert(Array.isArray(res.body), 'Response body should be an array');
      assert(res.body.length >= 6, 'Seed data should have at least 6 movies');
      assert(res.body[0].title, 'First movie should have title');
      assert(typeof res.body[0].averageRating === 'number', 'Movie should have averageRating');
    });

    // 2. GET /api/movies with query search
    await test('GET /api/movies?search=Inception returns filtered results', async () => {
      const res = await request({ path: '/api/movies?search=Inception' });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.length, 1);
      assert.strictEqual(res.body[0].title, 'Inception');
    });

    // 3. GET /api/movies with genre filter
    await test('GET /api/movies?genre=Drama returns only drama movies', async () => {
      const res = await request({ path: '/api/movies?genre=Drama' });
      assert.strictEqual(res.statusCode, 200);
      assert(res.body.length >= 1, 'Should find at least 1 drama movie');
      const allDrama = res.body.every(m => m.genre === 'Drama' || (m.genres && m.genres.includes('Drama')));
      assert(allDrama, 'All movies should have genre Drama');
    });

    // 4. GET /api/movies/:id details
    await test('GET /api/movies/1 returns full movie details', async () => {
      const res = await request({ path: '/api/movies/1' });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.id, '1');
      assert.strictEqual(res.body.title, 'Inception');
      assert(Array.isArray(res.body.reviews), 'Should contain reviews array');
      assert(Array.isArray(res.body.comments), 'Should contain comments array');
      assert(Array.isArray(res.body.ratings), 'Should contain ratings array');
      assert(typeof res.body.averageRating === 'number', 'Should compute average rating');
    });

    // 5. GET /api/movies/9999 returns 404
    await test('GET /api/movies/9999 returns 404 for non-existent movie', async () => {
      const res = await request({ path: '/api/movies/9999' });
      assert.strictEqual(res.statusCode, 404);
      assert(res.body.error, 'Should return error message');
    });

    // 6. POST /api/movies/:id/ratings submits rating
    await test('POST /api/movies/1/ratings submits rating and returns 201', async () => {
      const res = await request(
        { path: '/api/movies/1/ratings', method: 'POST' },
        { rating: 5, user: 'Tester' }
      );
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.rating.rating, 5);
      assert(res.body.averageRating > 0, 'Aggregate average rating should update');
    });

    // 7. POST /api/movies/1/ratings validates rating range (1-5)
    await test('POST /api/movies/1/ratings returns 400 for invalid rating', async () => {
      const res = await request(
        { path: '/api/movies/1/ratings', method: 'POST' },
        { rating: 10 }
      );
      assert.strictEqual(res.statusCode, 400);
      assert(res.body.error, 'Should return error for rating > 5');
    });

    // 8. GET /api/movies/1/ratings returns ratings
    await test('GET /api/movies/1/ratings returns 200 and rating breakdown', async () => {
      const res = await request({ path: '/api/movies/1/ratings' });
      assert.strictEqual(res.statusCode, 200);
      assert(res.body.ratings.length >= 2);
    });

    // 9. POST /api/movies/1/reviews submits review
    await test('POST /api/movies/1/reviews creates review and returns 201', async () => {
      const res = await request(
        { path: '/api/movies/1/reviews', method: 'POST' },
        { author: 'CinemaBuff', title: 'Truly visionary', content: 'Cinematography and editing are world class.', rating: 5 }
      );
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.review.author, 'CinemaBuff');
      assert.strictEqual(res.body.review.rating, 5);
    });

    // 10. POST /api/movies/1/reviews validates empty content
    await test('POST /api/movies/1/reviews returns 400 when content is empty', async () => {
      const res = await request(
        { path: '/api/movies/1/reviews', method: 'POST' },
        { author: 'Ghost', content: '' }
      );
      assert.strictEqual(res.statusCode, 400);
    });

    // 11. GET /api/movies/1/reviews returns reviews list
    await test('GET /api/movies/1/reviews returns reviews list', async () => {
      const res = await request({ path: '/api/movies/1/reviews' });
      assert.strictEqual(res.statusCode, 200);
      assert(Array.isArray(res.body), 'Should be an array');
      assert(res.body.length >= 1, 'Should contain at least 1 review');
    });

    // 12. POST /api/movies/1/comments submits comment
    await test('POST /api/movies/1/comments creates comment and returns 201', async () => {
      const res = await request(
        { path: '/api/movies/1/comments', method: 'POST' },
        { author: 'MovieFan99', content: 'Can we discuss the soundtrack?' }
      );
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.comment.content, 'Can we discuss the soundtrack?');
    });

    // 13. GET /api/movies/1/comments returns comments list
    await test('GET /api/movies/1/comments returns comments list', async () => {
      const res = await request({ path: '/api/movies/1/comments' });
      assert.strictEqual(res.statusCode, 200);
      assert(Array.isArray(res.body));
      assert(res.body.length >= 1);
    });

    // 14. POST /api/movies creates a new movie
    await test('POST /api/movies creates movie and returns 201', async () => {
      const res = await request(
        { path: '/api/movies', method: 'POST' },
        {
          title: 'The Matrix',
          genre: 'Sci-Fi',
          releaseYear: 1999,
          director: 'Lana & Lilly Wachowski',
          synopsis: 'A computer hacker learns about the true nature of reality.'
        }
      );
      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.title, 'The Matrix');
      assert(res.body.id, 'Created movie should have id');
    });

    // 15. GET /api/genres returns distinct genre list
    await test('GET /api/genres returns distinct genres', async () => {
      const res = await request({ path: '/api/genres' });
      assert.strictEqual(res.statusCode, 200);
      assert(Array.isArray(res.body));
      assert(res.body.includes('Sci-Fi'));
      assert(res.body.includes('Drama'));
    });

  } finally {
    server.close();
    console.log(`\n--- Test Results: ${passed} passed, ${failed} failed ---`);
    if (failed > 0) {
      process.exit(1);
    }
  }
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
