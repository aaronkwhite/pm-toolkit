import { computeDiffRegions } from '../../src/diff/diffComputation';
import assert from 'assert';

// Test: identical returns empty
const r1 = computeDiffRegions('same\n', 'same\n');
assert.strictEqual(r1.length, 0, 'identical should return empty');

// Test: added lines
const r2 = computeDiffRegions('line1\nline2\n', 'line1\nline2\nnew line\n');
assert(r2.some(r => r.type === 'added' && r.newText.includes('new line')), 'should detect added');

// Test: removed lines
const r3 = computeDiffRegions('line1\nline2\n', 'line1\n');
assert(r3.some(r => r.type === 'removed'), 'should detect removed');

// Test: changed lines
const r4 = computeDiffRegions('Hello world\n', 'Hello earth\n');
assert(r4.some(r => r.type === 'changed'), 'should detect changed');

// Test: stable IDs are strings
const r5 = computeDiffRegions('a\n', 'b\n');
assert(r5.length > 0, 'should have regions');
assert(typeof r5[0].id === 'string' && r5[0].id.length > 0, 'id should be a non-empty string');

// Test: regions have correct shape
const r6 = computeDiffRegions('line1\nline2\n', 'line1\nline3\n');
assert(r6.length > 0, 'should detect changes');
const region = r6[0];
assert('id' in region, 'region should have id');
assert('type' in region, 'region should have type');
assert('fromPos' in region, 'region should have fromPos');
assert('toPos' in region, 'region should have toPos');
assert('oldText' in region, 'region should have oldText');
assert('newText' in region, 'region should have newText');

console.log('All diffComputation tests passed');
