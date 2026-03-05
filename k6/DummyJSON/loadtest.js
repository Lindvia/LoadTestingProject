/**
 * ============================================================
 *  LOAD TEST — DummyJSON REST API CRUD
 * ============================================================
 *  Simulates normal, expected production traffic.
 *  Goal: confirm the API handles typical load comfortably
 *        with low error rate and stable latency.
 *
 *  Profile:
 *    - Ramp up to 10 VUs over 1 min
 *    - Hold steady for 5 min
 *    - Ramp down over 1 min
 *  Total duration: ~7 min
 *
 *  Thresholds (strict — this is baseline behaviour):
 *    - p(95) < 1.5s
 *    - error rate < 5%
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
    { duration: '1m', target: 10 },  // ramp up to normal load
    { duration: '5m', target: 10 },  // hold steady-state
    { duration: '1m', target: 0  },  // ramp down
  ],
  thresholds: {
    http_req_failed:   ['rate<0.05'],   // <5% network failures
    http_req_duration: ['p(95)<1500'],  // 95th percentile < 1.5s
    get_latency:       ['p(90)<1200'],
    post_latency:      ['p(90)<1500'],
    put_latency:       ['p(90)<1500'],
    delete_latency:    ['p(90)<1500'],
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
      'GET list: status 200':          (r) => r.status === 200,
      'GET list: has products array':  (r) => !ok || Array.isArray((body || {}).products),
      'GET list: has total field':     (r) => !ok || typeof (body || {}).total === 'number',
      'GET list: products not empty':  (r) => !ok || ((body || {}).products || []).length > 0,
      'GET list: response time <1.5s': (r) => r.timings.duration < 1500,
    });
    getLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(1);

  // GET: Single
  group('GET - Single Product', () => {
    const res  = http.get(`${BASE_URL}/${randomId()}`, { headers: HEADERS });
    const body = safeParseJSON(res.body);
    const ok   = res.status === 200;
    check(res, {
      'GET single: status 200':         (r) => r.status === 200,
      'GET single: has id':             (r) => !ok || !!(body || {}).id,
      'GET single: has title':          (r) => !ok || !!(body || {}).title,
      'GET single: has price':          (r) => !ok || typeof (body || {}).price === 'number',
      'GET single: response time <1.5s':(r) => r.timings.duration < 1500,
    });
    getLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(1);

  // GET: Search
  group('GET - Search Products', () => {
    const terms = ['phone', 'laptop', 'watch', 'shirt', 'car'];
    const q     = terms[Math.floor(Math.random() * terms.length)];
    const res   = http.get(`${BASE_URL}/search?q=${q}&limit=5`, { headers: HEADERS });
    const body  = safeParseJSON(res.body);
    const ok    = res.status === 200;
    check(res, {
      'GET search: status 200':          (r) => r.status === 200,
      'GET search: has products array':  (r) => !ok || Array.isArray((body || {}).products),
      'GET search: response time <1.5s': (r) => r.timings.duration < 1500,
    });
    getLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(1);

  // POST: Add
  group('POST - Add Product', () => {
    const title   = `LoadTest_${__VU}_${__ITER}`;
    const payload = JSON.stringify({
      title,
      price:       Math.floor(Math.random() * 500) + 10,
      stock:       Math.floor(Math.random() * 100) + 1,
      brand:       'LoadTestBrand',
      category:    'test-category',
      description: 'Created during load test',
    });
    const res  = http.post(`${BASE_URL}/add`, payload, { headers: HEADERS });
    const body = safeParseJSON(res.body);
    const ok   = res.status === 201;
    check(res, {
      'POST add: status 201':          (r) => r.status === 201,
      'POST add: has id':              (r) => !ok || !!(body || {}).id,
      'POST add: has title':           (r) => !ok || !!(body || {}).title,
      'POST add: title matches':       (r) => !ok || (body || {}).title === title,
      'POST add: response time <1.5s': (r) => r.timings.duration < 1500,
    });
    postLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(1);

  // PUT: Full update
  group('PUT - Update Product', () => {
    const title   = `LoadUpdated_${__VU}`;
    const payload = JSON.stringify({
      title,
      price: Math.floor(Math.random() * 500) + 10,
      stock: 50, brand: 'UpdatedBrand', category: 'updated-category',
    });
    const res  = http.put(`${BASE_URL}/${randomId()}`, payload, { headers: HEADERS });
    const body = safeParseJSON(res.body);
    const ok   = res.status === 200;
    check(res, {
      'PUT update: status 200':          (r) => r.status === 200,
      'PUT update: has id':              (r) => !ok || !!(body || {}).id,
      'PUT update: title updated':       (r) => !ok || (body || {}).title === title,
      'PUT update: response time <1.5s': (r) => r.timings.duration < 1500,
    });
    putLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(1);

  // PATCH: Partial update
  group('PATCH - Partial Update Product', () => {
    const newPrice = Math.floor(Math.random() * 500) + 10;
    const res      = http.patch(`${BASE_URL}/${randomId()}`,
      JSON.stringify({ price: newPrice }), { headers: HEADERS });
    const body = safeParseJSON(res.body);
    const ok   = res.status === 200;
    check(res, {
      'PATCH: status 200':               (r) => r.status === 200,
      'PATCH: has id':                   (r) => !ok || !!(body || {}).id,
      'PATCH: price updated':            (r) => !ok || (body || {}).price === newPrice,
      'PATCH: other fields preserved':   (r) => !ok || !!(body || {}).title,
      'PATCH: response time <1.5s':      (r) => r.timings.duration < 1500,
    });
    putLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(1);

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
      'DELETE: response time <1.5s':     (r) => r.timings.duration < 1500,
    });
    deleteLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(1);
}

export function handleSummary(data) {
  return { stdout: textSummary(data, { indent: ' ', enableColors: true }) };
}
