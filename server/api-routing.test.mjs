import assert from 'node:assert/strict';
import test from 'node:test';
import { apiRequestUrl } from './api-routing.mjs';

test('Vercel rewrites restore nested authentication, cart, and prescription routes', () => {
  for (const path of ['health', 'auth/google', 'cart/items/1', 'prescriptions/record-id/file']) {
    assert.equal(apiRequestUrl(`/api?__osudh_path=${encodeURIComponent(path)}`), `/api/${path}`);
  }
  assert.equal(apiRequestUrl('/api?__osudh_path=auth%2Fgoogle&mode=login'), '/api/auth/google?mode=login');
  assert.equal(apiRequestUrl('/api/health'), '/api/health');
});

test('malformed captures cannot leave the API or retain the internal routing query', () => {
  for (const path of ['../index.html', 'auth/../../index.html', 'https://example.com', 'auth?mode=link', 'auth\\google']) {
    assert.equal(apiRequestUrl(`/api?__osudh_path=${encodeURIComponent(path)}`), '/api/invalid-route');
  }
});
