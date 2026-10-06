import assert from 'node:assert/strict';
import test from 'node:test';
import { brandSchema, emptyToNull, organizationSchema } from './company.controller';

const validOrganization = {
    legalName: 'DDC Studio B.V.',
    kvkNumber: '12345678',
    vatNumber: 'NL123456789B01',
    registrationAddress: 'Main St 1',
    postalCode: '1000AA',
    city: 'Amsterdam',
    countryCode: 'NL',
    email: 'info@ddc.example',
    phone: '+31201234567',
    website: 'https://ddc.example',
    bankName: 'ABN AMRO',
    iban: 'NL91ABNA0417164300',
    mollieOrganizationId: 'org_123',
};

test('organizationSchema accepts a fully valid payload', () => {
    const result = organizationSchema.safeParse(validOrganization);
    assert.equal(result.success, true);
});

test('organizationSchema rejects an empty legalName', () => {
    const result = organizationSchema.safeParse({ ...validOrganization, legalName: '' });
    assert.equal(result.success, false);
});

test('organizationSchema defaults countryCode to NL when omitted', () => {
    const { countryCode, ...rest } = validOrganization;
    const result = organizationSchema.safeParse(rest);
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.countryCode, 'NL');
});

test('organizationSchema rejects a countryCode that is not exactly 2 characters', () => {
    assert.equal(organizationSchema.safeParse({ ...validOrganization, countryCode: 'N' }).success, false);
    assert.equal(organizationSchema.safeParse({ ...validOrganization, countryCode: 'NLD' }).success, false);
});

test('organizationSchema accepts empty string, null, or omitted for nullable text fields', () => {
    assert.equal(organizationSchema.safeParse({ ...validOrganization, kvkNumber: '' }).success, true);
    assert.equal(organizationSchema.safeParse({ ...validOrganization, kvkNumber: null }).success, true);
    const { kvkNumber, ...rest } = validOrganization;
    assert.equal(organizationSchema.safeParse(rest).success, true);
});

const validBrand = {
    organizationId: '1',
    name: 'DDC Amsterdam',
    slug: 'ddc-amsterdam',
    logoUrl: 'https://ddc.example/logo.png',
    primaryColor: '#ff00aa',
    email: 'brand@ddc.example',
    phone: '+31201234567',
    website: 'https://ddc.example',
    address: 'Main St 1',
    mollieProfileId: 'pfl_123',
    isDefault: true,
    isActive: true,
};

test('brandSchema accepts a fully valid payload and coerces organizationId to a number', () => {
    const result = brandSchema.safeParse(validBrand);
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.organizationId, 1);
});

test('brandSchema rejects a non-positive organizationId', () => {
    assert.equal(brandSchema.safeParse({ ...validBrand, organizationId: '0' }).success, false);
    assert.equal(brandSchema.safeParse({ ...validBrand, organizationId: '-1' }).success, false);
});

test('brandSchema accepts a valid lowercase hyphenated slug', () => {
    assert.equal(brandSchema.safeParse({ ...validBrand, slug: 'a-b-c-123' }).success, true);
});

test('brandSchema rejects a slug with uppercase, spaces, or leading/trailing/double hyphens', () => {
    assert.equal(brandSchema.safeParse({ ...validBrand, slug: 'DDC-Amsterdam' }).success, false);
    assert.equal(brandSchema.safeParse({ ...validBrand, slug: 'ddc amsterdam' }).success, false);
    assert.equal(brandSchema.safeParse({ ...validBrand, slug: '-ddc' }).success, false);
    assert.equal(brandSchema.safeParse({ ...validBrand, slug: 'ddc-' }).success, false);
    assert.equal(brandSchema.safeParse({ ...validBrand, slug: 'ddc--amsterdam' }).success, false);
});

test('brandSchema accepts a logoUrl under /upload/brands/ or http(s), and rejects other paths', () => {
    assert.equal(brandSchema.safeParse({ ...validBrand, logoUrl: '/upload/brands/logo.png' }).success, true);
    assert.equal(brandSchema.safeParse({ ...validBrand, logoUrl: 'http://ddc.example/logo.png' }).success, true);
    assert.equal(brandSchema.safeParse({ ...validBrand, logoUrl: '/etc/passwd' }).success, false);
    assert.equal(brandSchema.safeParse({ ...validBrand, logoUrl: 'javascript:alert(1)' }).success, false);
});

test('brandSchema accepts an empty or absent logoUrl', () => {
    assert.equal(brandSchema.safeParse({ ...validBrand, logoUrl: '' }).success, true);
    const { logoUrl, ...rest } = validBrand;
    assert.equal(brandSchema.safeParse(rest).success, true);
});

test('brandSchema defaults primaryColor to #1d1d33 when omitted', () => {
    const { primaryColor, ...rest } = validBrand;
    const result = brandSchema.safeParse(rest);
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.primaryColor, '#1d1d33');
});

test('brandSchema rejects an invalid hex color', () => {
    assert.equal(brandSchema.safeParse({ ...validBrand, primaryColor: 'red' }).success, false);
    assert.equal(brandSchema.safeParse({ ...validBrand, primaryColor: '#fff' }).success, false);
});

test('brandSchema defaults isDefault to false and isActive to true when omitted', () => {
    const { isDefault, isActive, ...rest } = validBrand;
    const result = brandSchema.safeParse(rest);
    assert.equal(result.success, true);
    if (result.success) {
        assert.equal(result.data.isDefault, false);
        assert.equal(result.data.isActive, true);
    }
});

test('emptyToNull converts empty strings to null and leaves other values untouched', () => {
    const result = emptyToNull({ a: '', b: 'kept', c: 0, d: false, e: null, f: undefined });
    assert.deepEqual(result, { a: null, b: 'kept', c: 0, d: false, e: null, f: undefined });
});
