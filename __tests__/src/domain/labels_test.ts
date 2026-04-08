/**
 * Tests for label domain utilities
 */

import { label, LabelColorUtils, LabelDescriptionUtils, LabelNameUtils } from '#src/domain/labels.ts';
import { assertEquals, assertThrows } from '@std/assert';

Deno.test('LabelNameUtils.parse - trims and validates', () => {
	const parsed = LabelNameUtils.parse('  feature  ');
	assertEquals(parsed, 'feature');
});

Deno.test('LabelNameUtils.parse - throws on empty', () => {
	assertThrows(() => LabelNameUtils.parse('   '), Error, 'cannot be empty');
});

Deno.test('LabelNameUtils.is - detects empty', () => {
	assertEquals(LabelNameUtils.is(''), false);
	assertEquals(LabelNameUtils.is('bug'), true);
});

Deno.test('LabelColorUtils.parse - expands 3-char hex and lowercases', () => {
	const parsed = LabelColorUtils.parse('#AbC');
	assertEquals(parsed, 'aabbcc');
});

Deno.test('LabelColorUtils.parse - throws on invalid hex', () => {
	assertThrows(
		() => LabelColorUtils.parse('gggggg'),
		Error,
		'Invalid hex color',
	);
});

Deno.test('LabelColorUtils.is - true for valid, false for invalid', () => {
	assertEquals(LabelColorUtils.is('abc'), true);
	assertEquals(LabelColorUtils.is('xyz'), false);
});

Deno.test('LabelColorUtils.normalize - handles undefined and 3-char', () => {
	assertEquals(LabelColorUtils.normalize(undefined), undefined);
	assertEquals(LabelColorUtils.normalize('ABC'), 'aabbcc');
});

Deno.test('LabelDescriptionUtils.parse - throws when over 100 chars', () => {
	assertThrows(
		() => LabelDescriptionUtils.parse('a'.repeat(101)),
		Error,
		'exceeds 100',
	);
});

Deno.test('LabelDescriptionUtils.is - true when within limit', () => {
	assertEquals(LabelDescriptionUtils.is('a'.repeat(100)), true);
	assertEquals(LabelDescriptionUtils.is('a'.repeat(101)), false);
});

Deno.test('label builder - supports bare name without optionals', () => {
	const built = label('simple').build();
	assertEquals(built.name, LabelNameUtils.parse('simple'));
});
