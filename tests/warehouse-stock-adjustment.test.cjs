'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = source.indexOf('  function validateOwnerStockAdjustmentV160(');
const end = source.indexOf('\n  function directAdjustment(){', start);
assert.ok(start >= 0 && end > start, 'validator source is present');
const validate = vm.runInNewContext(
  source.slice(start, end) + '\nvalidateOwnerStockAdjustmentV160',
  { }
);
const materials = {
  B01: { code: 'B01', factor: 1000 },
  B03: { code: 'B03', factor: 1 },
  BAD: { code: 'BAD', factor: 0 }
};
const item = (code, physical, cost = '') => ({ code, physical, cost });

test('explicit physical zero is accepted, not confused with missing input', () => {
  const result = validate([item('B01', '0')], materials);
  assert.equal(result.length, 1);
  assert.equal(result[0].code, 'B01');
  assert.equal(result[0].physicalQtyBase, 0);
  assert.equal(result[0].unitCostBase, '');
});

test('a blank physical count is rejected before any stock posting', () => {
  assert.throws(() => validate([item('B01', '')], materials), /jumlah fisik wajib diisi/);
  assert.throws(() => validate([item('B01', '   ')], materials), /jumlah fisik wajib diisi/);
});

test('negative, nonnumeric and overflowing quantities fail closed', () => {
  for (const value of ['-1', 'abc', '1e999', 'NaN']) {
    assert.throws(() => validate([item('B01', value)], materials));
  }
});

test('an unknown material or an invalid conversion is rejected', () => {
  assert.throws(() => validate([item('', '5')], materials), /pilih bahan yang valid/);
  assert.throws(() => validate([item('NOT_FOUND', '5')], materials), /pilih bahan yang valid/);
  assert.throws(() => validate([item('BAD', '5')], materials), /Konversi bahan/);
});

test('duplicate materials are rejected to avoid competing stock targets', () => {
  assert.throws(
    () => validate([item('B03', '2'), item('B03', '3')], materials),
    /dipilih dua kali/
  );
});

test('valid material counts and optional cost preserve base-unit conversion', () => {
  const result = validate([item('B01', '2.5', '75000'), item('B03', '12')], materials);
  assert.equal(result[0].physicalQtyBase, 2500);
  assert.equal(result[0].unitCostBase, 75);
  assert.equal(result[1].physicalQtyBase, 12);
});

test('invalid cost and empty adjustment sets cannot reach write handler', () => {
  assert.throws(() => validate([item('B01', '2', '-5')], materials), /modal per unit/);
  assert.throws(() => validate([], materials), /minimal satu bahan/);
  assert.ok(source.includes('validateOwnerStockAdjustmentV160(rawLines,matByCode())'));
  assert.ok(source.includes('KONFIRMASI KOREKSI STOK OWNER'));
});
