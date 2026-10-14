import { COUNTRIES_SHOWN, foldCountries } from './foldCountries';

const country = (index: number) => ({
    code: `C${index}`,
    buyers: 10,
    tickets: 20,
    revenue: '100.50',
});

test('a short list is shown whole', () => {
    const countries = [country(1), country(2)];

    expect(foldCountries(countries)).toEqual({ shown: countries, rest: null, restCount: 0 });
});

test('the countries past the shown ones are added up in one line', () => {
    const countries = Array.from({ length: COUNTRIES_SHOWN + 3 }, (_, index) => country(index));

    const folded = foldCountries(countries);

    expect(folded.shown).toHaveLength(COUNTRIES_SHOWN);
    expect(folded.restCount).toBe(3);
    expect(folded.rest).toEqual({ code: '', buyers: 30, tickets: 60, revenue: '301.50' });
});
