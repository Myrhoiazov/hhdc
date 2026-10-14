import { CountryRow } from '@/entities/Dashboard';

export const COUNTRIES_SHOWN = 12;

// The countries after the first dozen are added up into one line, so the list stays readable.
export const foldCountries = (
    countries: CountryRow[]
): { shown: CountryRow[]; rest: CountryRow | null; restCount: number } => {
    const tail = countries.slice(COUNTRIES_SHOWN);
    const rest = tail.length
        ? {
              code: '',
              buyers: tail.reduce((sum, row) => sum + row.buyers, 0),
              tickets: tail.reduce((sum, row) => sum + row.tickets, 0),
              revenue: tail.reduce((sum, row) => sum + Number(row.revenue), 0).toFixed(2),
          }
        : null;
    return { shown: countries.slice(0, COUNTRIES_SHOWN), rest, restCount: tail.length };
};
