import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countryCode } from './countries';

test('one country written in different languages and cases is one code', () => {
    for (const name of ['Germany', 'Deutschland', 'Германия', 'Duitsland', 'Alemania', 'Germania', 'GERMANY ', 'de']) assert.equal(countryCode(name), 'DE', name);
    for (const name of ['Netherlands', 'Nederland', 'The Netherlands', 'Holland', 'Нидерланды', 'Nederlands', '荷兰']) assert.equal(countryCode(name), 'NL', name);
    for (const name of ['United Kingdom', 'UK', 'Uk', 'England', 'Scotland', 'Northern Ireland']) assert.equal(countryCode(name), 'GB', name);
});

test('names in their own language and common short forms are understood', () => {
    const expected: Record<string, string> = {
        Italia: 'IT', España: 'ES', Schweiz: 'CH', Suisse: 'CH', Belgique: 'BE', België: 'BE', Belgie: 'BE', Österreich: 'AT', Polska: 'PL', Danmark: 'DK',
        Suomi: 'FI', Eesti: 'EE', Ελλάδα: 'GR', Ірландія: 'IE', Türkiye: 'TR', México: 'MX', USA: 'US', Uae: 'AE', Czech: 'CZ', Czechia: 'CZ', 'Czech Republic': 'CZ', CZ: 'CZ',
        'South Korea': 'KR', 'Republic of Moldova': 'MD',
    };
    for (const [name, code] of Object.entries(expected)) assert.equal(countryCode(name), code, name);
});

test('extra text around the country is ignored, and the first of two countries is taken', () => {
    assert.equal(countryCode('Poland ????????'), 'PL');
    assert.equal(countryCode('Poland Sosnowiec'), 'PL');
    assert.equal(countryCode('Tallinn, Estonia'), 'EE');
    assert.equal(countryCode('Ukraine/Netherlands'), 'UA');
    assert.equal(countryCode('Finland / USA (Finnish American)'), 'FI');
});

test('a city, a nationality or nothing is not turned into a country by guessing', () => {
    for (const name of ['Amsterdam', 'Sofia', 'Ukrainian', 'Geemany', '', '   ', null, undefined]) assert.equal(countryCode(name), null, String(name));
});
