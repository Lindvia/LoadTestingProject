/**
 * ============================================================
 *  STRESS TEST — DummyJSON REST API CRUD
 * ============================================================
 *  Gradually increases load in steps to find DummyJSON's
 *  breaking point — the VU count where errors begin and
 *  latency degrades beyond acceptable limits.
 *
 *  Profile (step up every 2–3 min):
 *    Step 1:  5 VUs  — comfortable baseline
 *    Step 2:  8 VUs  — moderate stress
 *    Step 3: 10 VUs  — normal upper limit
 *    Step 4: 12 VUs  — approaching DummyJSON's free tier limit
 *    Step 5: 15 VUs  — expected breaking point
 *    Step 6: 20 VUs  — beyond capacity (errors expected)
 *    Recovery: ramp down to observe if system recovers
 *  Total duration: ~37 min
 *
 *  Key differences vs load test:
 *    - 6 incremental steps vs single steady load
 *    - Higher peak VUs (20 vs 10)
 *    - Sleep 0.5s — less think-time = more pressure per step
 *    - Thresholds act as alarms — they WILL be crossed at peak
 *    - Watch the summary to see which step broke things
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
    // Step 1 — comfortable baseline
    { duration: '2m', target: 5  },
    { duration: '3m', target: 5  },

    // Step 2 — moderate stress
    { duration: '2m', target: 8  },
    { duration: '3m', target: 8  },

    // Step 3 — normal upper limit
    { duration: '2m', target: 10 },
    { duration: '3m', target: 10 },

    // Step 4 — approaching DummyJSON free tier limit
    { duration: '2m', target: 12 },
    { duration: '3m', target: 12 },

    // Step 5 — expected breaking point
    { duration: '2m', target: 15 },
    { duration: '3m', target: 15 },

    // Step 6 — beyond capacity, errors expected
    { duration: '2m', target: 20 },
    { duration: '3m', target: 20 },

    // Recovery — observe if system stabilises after load drops
    { duration: '5m', target: 0  },
  ],
  thresholds: {
    // These WILL be crossed at peak — that's the point.
    // Thresholds here are alarms, not pass/fail gates.
    // Check the summary to see at which step each threshold broke.
    http_req_failed:   ['rate<0.10'],
    http_req_duration: ['p(95)<3000'],
    get_latency:       ['p(90)<2500'],
    post_latency:      ['p(90)<3000'],
    put_latency:       ['p(90)<3000'],
    delete_latency:    ['p(90)<3000'],
    error_rate:        ['rate<0.10'],
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
      'GET list: response time <3s':  (r) => r.timings.duration < 3000,
    });
    getLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(0.5);

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
      'GET single: response time <3s': (r) => r.timings.duration < 3000,
    });
    getLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(0.5);

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
      'GET search: response time <3s':  (r) => r.timings.duration < 3000,
    });
    getLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(0.5);

  // POST: Add
  group('POST - Add Product', () => {
    const title   = `StressTest_${__VU}_${__ITER}`;
    const payload = JSON.stringify({
      title,
      price:       Math.floor(Math.random() * 500) + 10,
      stock:       Math.floor(Math.random() * 100) + 1,
      brand:       'StressBrand',
      category:    'stress-category',
      description: 'Created during stress test',
    });
    const res  = http.post(`${BASE_URL}/add`, payload, { headers: HEADERS });
    const body = safeParseJSON(res.body);
    const ok   = res.status === 201;
    check(res, {
      'POST add: status 201':        (r) => r.status === 201,
      'POST add: has id':            (r) => !ok || !!(body || {}).id,
      'POST add: has title':         (r) => !ok || !!(body || {}).title,
      'POST add: title matches':     (r) => !ok || (body || {}).title === title,
      'POST add: response time <3s': (r) => r.timings.duration < 3000,
    });
    postLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(0.5);

  // PUT: Full update
  group('PUT - Update Product', () => {
    const title   = `StressUpdated_${__VU}`;
    const payload = JSON.stringify({
      title,
      price: Math.floor(Math.random() * 500) + 10,
      stock: 50, brand: 'StressBrand', category: 'stress-category',
    });
    const res  = http.put(`${BASE_URL}/${randomId()}`, payload, { headers: HEADERS });
    const body = safeParseJSON(res.body);
    const ok   = res.status === 200;
    check(res, {
      'PUT update: status 200':        (r) => r.status === 200,
      'PUT update: has id':            (r) => !ok || !!(body || {}).id,
      'PUT update: title updated':     (r) => !ok || (body || {}).title === title,
      'PUT update: response time <3s': (r) => r.timings.duration < 3000,
    });
    putLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(0.5);

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
      'PATCH: response time <3s':      (r) => r.timings.duration < 3000,
    });
    putLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(0.5);

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
      'DELETE: response time <3s':       (r) => r.timings.duration < 3000,
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