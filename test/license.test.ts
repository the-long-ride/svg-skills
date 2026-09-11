import test from 'node:test';
import assert from 'node:assert/strict';
import { assessLicense } from '../src/license.js';

test('automatically allows low-friction licenses', () => {
  assert.equal(assessLicense('CC0 License').status, 'allow');
  assert.equal(assessLicense('Public Domain').status, 'allow');
  assert.equal(assessLicense('SVG Repo License').status, 'allow');
});

test('requires explicit review for licenses with obligations or uncertainty', () => {
  for (const name of ['MIT License', 'GNU GPL', 'CC BY', 'CC BY-NC', 'Logo License', 'Something Unknown']) {
    assert.equal(assessLicense(name).status, 'review');
  }
});
