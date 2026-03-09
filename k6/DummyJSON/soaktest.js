/**
 * ============================================================
 *  SOAK TEST — DummyJSON REST API CRUD
 * ============================================================
 *  Runs moderate load for an extended period to detect
 *  memory leaks, connection pool exhaustion, and performance
 *  degradation over time.
 *
 *  Profile:
 *    - Ramp up to 8 VUs over 2 min
 *    - Hold steady for 30 min  ← the "soak"
 *    - Ramp down over 2 min
 *  Total duration: ~34 min
 *
 *  Key differences vs load test:
 *    - Fewer VUs (8 vs 10) — sustained, not pushed
 *    - Longer sleep between ops — realistic user pacing
 *    - Slightly relaxed thresholds — long runs have variance
 *    - Watch for latency creep over time (degradation signal)
 *
 *
 * ============================================================
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// ── Custom Metrics ────────────────────────────────────────────────────────────
const getLatency    = new Trend('get_latency',    true);
const postLatency   = new Trend('post_latency',   true);
const putLatency    = new Trend('put_latency',    true);
const deleteLatency = new Trend('delete_latency', true);
const errorRate     = new Rate('error_rate');
const requestCount  = new Counter('total_requests');

// ── Options ───────────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '2m',  target: 8 },   // ramp up gently
    { duration: '30m', target: 8 },   // soak — hold for 30 minutes
    { duration: '2m',  target: 0 },   // ramp down
  ],
  thresholds: {
    // Slightly relaxed — long runs have natural variance
    http_req_failed:   ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
    get_latency:       ['p(90)<1500'],
    post_latency:      ['p(90)<2000'],
    put_latency:       ['p(90)<2000'],
    delete_latency:    ['p(90)<2000'],
    error_rate:        ['rate<0.05'],
  },
};

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL = 'https://dummyjson.com/products';
const HEADERS  = { 'Content-Type': 'application/json' };

function randomId() { return Math.floor(Math.random() * 194) + 1; }

function safeParseJSON(body) {
  try {
    if (!body || body.trim() === '') return null;
    return JSON.parse(body);
  } catch (_) { return null; }
}

// ── Main Flow ─────────────────────────────────────────────────────────────────
export default function () {

  // GET: List
  group('GET - List Products', () => {
    const res  = http.get(`${BASE_URL}?limit=10`, { headers: HEADERS });
    const body = safeParseJSON(res.body);
    const ok   = res.status === 200;
    check(res, {
      'GET list: status 200':         (r) => r.status === 200,
      'GET list: has products array': (r) => !ok || Array.isArray((body || {}).products),
      'GET list: has total field':    (r) => !ok || typeof (body || {}).total === 'number',
      'GET list: products not empty': (r) => !ok || ((body || {}).products || []).length > 0,
      'GET list: response time <2s':  (r) => r.timings.duration < 2000,
    });
    getLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(2);  // longer think-time — realistic pacing for a 30-min soak

  // GET: Single
  group('GET - Single Product', () => {
    const res  = http.get(`${BASE_URL}/${randomId()}`, { headers: HEADERS });
    const body = safeParseJSON(res.body);
    const ok   = res.status === 200;
    check(res, {
      'GET single: status 200':        (r) => r.status === 200,
      'GET single: has id':            (r) => !ok || !!(body || {}).id,
      'GET single: has title':         (r) => !ok || !!(body || {}).title,
      'GET single: has price':         (r) => !ok || typeof (body || {}).price === 'number',
      'GET single: response time <2s': (r) => r.timings.duration < 2000,
    });
    getLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(2);

  // GET: Search
  group('GET - Search Products', () => {
    const terms = ['phone', 'laptop', 'watch', 'shirt', 'car'];
    const q     = terms[Math.floor(Math.random() * terms.length)];
    const res   = http.get(`${BASE_URL}/search?q=${q}&limit=5`, { headers: HEADERS });
    const body  = safeParseJSON(res.body);
    const ok    = res.status === 200;
    check(res, {
      'GET search: status 200':         (r) => r.status === 200,
      'GET search: has products array': (r) => !ok || Array.isArray((body || {}).products),
      'GET search: response time <2s':  (r) => r.timings.duration < 2000,
    });
    getLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(2);

  // POST: Add
  group('POST - Add Product', () => {
    const title   = `SoakTest_${__VU}_${__ITER}`;
    const payload = JSON.stringify({
      title,
      price:       Math.floor(Math.random() * 500) + 10,
      stock:       Math.floor(Math.random() * 100) + 1,
      brand:       'SoakTestBrand',
      category:    'test-category',
      description: 'Created during soak test',
    });
    const res  = http.post(`${BASE_URL}/add`, payload, { headers: HEADERS });
    const body = safeParseJSON(res.body);
    const ok   = res.status === 201;
    check(res, {
      'POST add: status 201':        (r) => r.status === 201,
      'POST add: has id':            (r) => !ok || !!(body || {}).id,
      'POST add: has title':         (r) => !ok || !!(body || {}).title,
      'POST add: title matches':     (r) => !ok || (body || {}).title === title,
      'POST add: response time <2s': (r) => r.timings.duration < 2000,
    });
    postLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(2);

  // PUT: Full update
  group('PUT - Update Product', () => {
    const title   = `SoakUpdated_${__VU}`;
    const payload = JSON.stringify({
      title,
      price: Math.floor(Math.random() * 500) + 10,
      stock: 50, brand: 'SoakBrand', category: 'soak-category',
    });
    const res  = http.put(`${BASE_URL}/${randomId()}`, payload, { headers: HEADERS });
    const body = safeParseJSON(res.body);
    const ok   = res.status === 200;
    check(res, {
      'PUT update: status 200':        (r) => r.status === 200,
      'PUT update: has id':            (r) => !ok || !!(body || {}).id,
      'PUT update: title updated':     (r) => !ok || (body || {}).title === title,
      'PUT update: response time <2s': (r) => r.timings.duration < 2000,
    });
    putLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(2);

  // PATCH: Partial update
  group('PATCH - Partial Update Product', () => {
    const newPrice = Math.floor(Math.random() * 500) + 10;
    const res      = http.patch(`${BASE_URL}/${randomId()}`,
      JSON.stringify({ price: newPrice }), { headers: HEADERS });
    const body = safeParseJSON(res.body);
    const ok   = res.status === 200;
    check(res, {
      'PATCH: status 200':             (r) => r.status === 200,
      'PATCH: has id':                 (r) => !ok || !!(body || {}).id,
      'PATCH: price updated':          (r) => !ok || (body || {}).price === newPrice,
      'PATCH: other fields preserved': (r) => !ok || !!(body || {}).title,
      'PATCH: response time <2s':      (r) => r.timings.duration < 2000,
    });
    putLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(2);

  // DELETE
  group('DELETE - Remove Product', () => {
    const res  = http.del(`${BASE_URL}/${randomId()}`, null, { headers: HEADERS });
    const body = safeParseJSON(res.body);
    const ok   = res.status === 200;
    check(res, {
      'DELETE: status 200':              (r) => r.status === 200,
      'DELETE: isDeleted true':          (r) => !ok || (body || {}).isDeleted === true,
      'DELETE: has deletedOn timestamp': (r) => !ok || !!(body || {}).deletedOn,
      'DELETE: has id in response':      (r) => !ok || !!(body || {}).id,
      'DELETE: response time <2s':       (r) => r.timings.duration < 2000,
    });
    deleteLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  // Longest think-time — simulate realistic pacing over 30 minutes
  sleep(3);
}

export function handleSummary(data) {
  return { stdout: textSummary(data, { indent: ' ', enableColors: true }) };
}