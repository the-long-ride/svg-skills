import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSvg } from '../src/svg.js';

test('removes active content and external resource hrefs', () => {
  const input = '<svg onload="evil()"><script>alert(1)</script><a href="https://evil.test/x"><path fill="#111" onclick="x()" d="M0 0"/></a></svg>';
  const output = sanitizeSvg(input, false);
  assert.doesNotMatch(output, /script|onload|onclick|https:\/\/evil/i);
  assert.match(output, /<svg/);
  assert.match(output, /<path/);
});

test('can normalize simple paint colors to currentColor', () => {
  const output = sanitizeSvg('<svg><path fill="#000" stroke="black" d="M0 0"/><path fill="none"/></svg>', true);
  assert.match(output, /fill="currentColor"/);
  assert.match(output, /stroke="currentColor"/);
  assert.match(output, /fill="none"/);
});

test('rejects non-SVG input', () => {
  assert.throws(() => sanitizeSvg('<html></html>', false), /valid SVG/i);
});
