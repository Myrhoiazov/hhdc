# Weeztix fixtures

Answers of the Weeztix API saved on 2026-10-08 and stripped of personal and business data.
`weeztix.fixtures.test.ts` reads them to check that the integration still understands the real shapes.

| File | Request |
|---|---|
| `events.json` | `GET /event` |
| `ticket-types.json` | `GET /event/:guid/ticket`, by event GUID |
| `coupons.json` | `GET /coupon` |
| `coupon-codes.json` | `GET /coupon/:guid/codes`, by coupon GUID |
| `orders-search.json` | `POST /statistics/search` |

The orders are one of each kind: a plain order, an order with a coupon, an order with tickets to two events,
and a cancelled, a returned and a swapped one.

What was replaced: every GUID (consistently, so references still match), emails, names, phone numbers, ticket numbers,
coupon codes, names of events, locations and coupons, free text and every link. `tech_data` and `geoable` (IP address,
tracking and location of the buyer) were removed. Kept as they are: field names, statuses and other fixed words,
dates, amounts, and names of ticket types, checkout questions and payment methods.

When Weeztix changes a format, save new answers the same way; never commit an answer that was not stripped.
