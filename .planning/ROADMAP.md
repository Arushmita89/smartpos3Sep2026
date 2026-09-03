# SmartPOS — Roadmap

## Vision

A complete restaurant POS: attendants take orders per table/tab, send them to the kitchen without immediate payment, and settle the combined bill in a single payment when the customer is ready.

## Phases

### Phase 1: Core POS Foundation ✅ (complete — built pre-GSD)

Ordering UI, cart, Razorpay/cash payments, kitchen display (polling), order management, menu management, analytics, table/tab selection.

### Deferred / Backlog (unplanned)

- KOT-style "send to kitchen without paying" flow with combined settlement → being addressed via quick tasks
- Apply same settlement flow to RestaurantOrdering (walk-in quick order screen)
- Use configurable `restaurant.tax_rate` instead of hardcoded 18%
