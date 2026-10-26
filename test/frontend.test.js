import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { server } from '../server/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

const FRONTEND_TEST_PORT = 3997;

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port: FRONTEND_TEST_PORT,
      path,
      method
    };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

test('Frontend UI & Static Assets Tests (SCRUM-74 & SCRUM-75)', async (t) => {
  await t.test('HTML file exists and contains core UI components', () => {
    const htmlPath = path.join(publicDir, 'index.html');
    assert.ok(fs.existsSync(htmlPath), 'public/index.html must exist');
    const content = fs.readFileSync(htmlPath, 'utf-8');

    // Catalog grid & search
    assert.ok(content.includes('id="movie-grid"'), 'Contains movie-grid container');
    assert.ok(content.includes('id="search-input"'), 'Contains search input');
    assert.ok(content.includes('id="genre-select"'), 'Contains genre filter');
    assert.ok(content.includes('id="sort-select"'), 'Contains sort select');

    // Details modal
    assert.ok(content.includes('id="movie-modal"'), 'Contains movie modal container');
    assert.ok(content.includes('id="modal-body"'), 'Contains modal body');
  });

  await t.test('CSS file exists and contains responsive and styling rules', () => {
    const cssPath = path.join(publicDir, 'css', 'style.css');
    assert.ok(fs.existsSync(cssPath), 'public/css/style.css must exist');
    const content = fs.readFileSync(cssPath, 'utf-8');

    assert.ok(content.includes('.movie-grid'), 'Contains .movie-grid CSS');
    assert.ok(content.includes('.movie-card'), 'Contains .movie-card CSS');
    assert.ok(content.includes('.modal-overlay'), 'Contains .modal-overlay CSS');
    assert.ok(content.includes('.star-btn'), 'Contains star rating button styling');
    assert.ok(content.includes('.toast'), 'Contains toast notifications styling');
  });

  await t.test('JavaScript application exists and implements required logic', () => {
    const jsPath = path.join(publicDir, 'js', 'app.js');
    assert.ok(fs.existsSync(jsPath), 'public/js/app.js must exist');
    const content = fs.readFileSync(jsPath, 'utf-8');

    // Class definition & methods
    assert.ok(content.includes('class MovieApp'), 'Defines MovieApp class');
    assert.ok(content.includes('submitRating'), 'Implements submitRating method');
    assert.ok(content.includes('submitReview'), 'Implements submitReview method');
    assert.ok(content.includes('submitComment'), 'Implements submitComment method');
    assert.ok(content.includes('renderReviewsList'), 'Implements renderReviewsList');
    assert.ok(content.includes('renderCommentsList'), 'Implements renderCommentsList');
    assert.ok(content.includes('generateStarSymbols'), 'Implements star symbols generator');
    assert.ok(content.includes('escapeHTML'), 'Implements XSS sanitization');
  });

  await t.test('Static file serving over HTTP', async () => {
    await new Promise((resolve) => {
      server.listen(FRONTEND_TEST_PORT, resolve);
    });

    try {
      // Test index.html serving
      const res = await makeRequest('/');
      assert.equal(res.statusCode, 200);
      assert.ok(res.body.includes('CineScope'));

      // Test css serving
      const cssRes = await makeRequest('/css/style.css');
      assert.equal(cssRes.statusCode, 200);
      assert.ok(cssRes.body.includes('--bg-primary'));

      // Test js serving
      const jsRes = await makeRequest('/js/app.js');
      assert.equal(jsRes.statusCode, 200);
      assert.ok(jsRes.body.includes('class MovieApp'));
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });
});
