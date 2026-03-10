/**
 * ============================================================
 *  SPIKE TEST — DummyJSON REST API CRUD
 * ============================================================
 *  Simulates a sudden, extreme traffic burst — like a flash
 *  sale or viral event — to test if the API survives and
 *  recovers back to normal after the spike drops.
 *
 *  Profile:
 *    - Baseline: 3 VUs warm-up
 *    - Spike 1:  instantly jump to 15 VUs, hold 1 min
 *    - Recovery: drop back to 3 VUs, observe for 2 min
 *    - Spike 2:  repeat spike to confirm repeatability
 *    - Ramp to zero
 *  Total duration: ~8 min
 *
 *  Key differences vs load test:
 *    - Minimal sleep (0.2s) — max concurrency at peak
 *    - PATCH dropped — focus on high-impact ops during spike
 *    - Relaxed thresholds — some failure at peak is expected
 *    - Two spikes — checks if recovery is consistent
 *
 *  ⚠️  DummyJSON free tier starts dropping requests above
 *  ~12 VUs. Spike to 15 VUs intentionally tests this limit.
 *  Threshold set to 15% to accommodate expected peak drops.
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
    // Baseline
    { duration: '1m',  target: 3  },  // warm up
    { duration: '30s', target: 3  },  // hold baseline

    // First spike
    { duration: '10s', target: 15 },  // instant spike
    { duration: '1m',  target: 15 },  // hold spike
    { duration: '10s', target: 3  },  // drop back

    // Recovery window
    { duration: '2m',  target: 3  },  // observe recovery

    // Second spike — repeatability
    { duration: '10s', target: 15 },  // spike again
    { duration: '1m',  target: 15 },  // hold
    { duration: '10s', target: 0  },  // done
  ],
  thresholds: {
    // Relaxed — spikes are intentionally brutal on a free API
    http_req_failed:   ['rate<0.15'],   // tolerate up to 15% at peak
    http_req_duration: ['p(95)<5000'],  // up to 5s at spike is acceptable
    get_latency:       ['p(90)<4000'],
    post_latency:      ['p(90)<5000'],
    put_latency:       ['p(90)<5000'],
    delete_latency:    ['p(90)<5000'],
    error_rate:        ['rate<0.15'],
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

// ── Main Flow — lean, minimal sleep for maximum concurrency ───────────────────
export default function () {

  // GET: List — most common operation, highest weight
  group('GET - List Products', () => {
    const res  = http.get(`${BASE_URL}?limit=10`, { headers: HEADERS });
    const body = safeParseJSON(res.body);
    const ok   = res.status === 200;
    check(res, {
      'GET list: status 200':         (r) => r.status === 200,
      'GET list: has products array': (r) => !ok || Array.isArray((body || {}).products),
      'GET list: response time <5s':  (r) => r.timings.duration < 5000,
    });
    getLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(0.2);  // minimal — spike tests hammer hard

  // GET: Single
  group('GET - Single Product', () => {
    const res  = http.get(`${BASE_URL}/${randomId()}`, { headers: HEADERS });
    const body = safeParseJSON(res.body);
    const ok   = res.status === 200;
    check(res, {
      'GET single: status 200':       (r) => r.status === 200,
      'GET single: has id':           (r) => !ok || !!(body || {}).id,
      'GET single: response time <5s':(r) => r.timings.duration < 5000,
    });
    getLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(0.2);

  // POST: Add
  group('POST - Add Product', () => {
    const title   = `SpikeTest_${__VU}_${__ITER}`;
    const payload = JSON.stringify({
      title,
      price:    Math.floor(Math.random() * 500) + 10,
      stock:    10,
      brand:    'SpikeBrand',
      category: 'spike-category',
    });
    const res  = http.post(`${BASE_URL}/add`, payload, { headers: HEADERS });
    const body = safeParseJSON(res.body);
    const ok   = res.status === 201;
    check(res, {
      'POST add: status 201':        (r) => r.status === 201,
      'POST add: has id':            (r) => !ok || !!(body || {}).id,
      'POST add: response time <5s': (r) => r.timings.duration < 5000,
    });
    postLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(0.2);

  // PUT: Full update
  group('PUT - Update Product', () => {
    const title   = `SpikeUpdated_${__VU}`;
    const payload = JSON.stringify({
      title,
      price: Math.floor(Math.random() * 500) + 10,
      stock: 50, brand: 'SpikeBrand', category: 'spike-category',
    });
    const res  = http.put(`${BASE_URL}/${randomId()}`, payload, { headers: HEADERS });
    const body = safeParseJSON(res.body);
    const ok   = res.status === 200;
    check(res, {
      'PUT update: status 200':       (r) => r.status === 200,
      'PUT update: has id':           (r) => !ok || !!(body || {}).id,
      'PUT update: response time <5s':(r) => r.timings.duration < 5000,
    });
    putLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(0.2);

  // DELETE
  group('DELETE - Remove Product', () => {
    const res  = http.del(`${BASE_URL}/${randomId()}`, null, { headers: HEADERS });
    const body = safeParseJSON(res.body);
    const ok   = res.status === 200;
    check(res, {
      'DELETE: status 200':          (r) => r.status === 200,
      'DELETE: isDeleted true':      (r) => !ok || (body || {}).isDeleted === true,
      'DELETE: response time <5s':   (r) => r.timings.duration < 5000,
    });
    deleteLatency.add(res.timings.duration);
    errorRate.add(!ok);
    requestCount.add(1);
  });

  sleep(0.5);
}

export function handleSummary(data) {
  return { stdout: textSummary(data, { indent: ' ', enableColors: true }) };
}