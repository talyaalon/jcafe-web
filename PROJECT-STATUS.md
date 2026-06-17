# J-Cafe Phuket — Project Handoff / Status

eCommerce site for **THE KOSHER PLACE — J-Cafe Phuket branch**, integrated with **ODOO V18 ERP**, **Stripe** payments, and **Supabase** backend. Bilingual HE/EN.

## Environment
- Working dir: `C:\Users\USER\jcafe-web`
- Run: `npm run dev` → http://localhost:3000 (or 3001)
- GitHub (private): https://github.com/talyaalon/jcafe-web (branch `main`)
- Push needs a GitHub token (no credential helper installed). All secrets live in `.env.local` (gitignored).

## Stack
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 (CSS `@theme` tokens) · Stripe · Supabase (`@supabase/supabase-js`) · ODOO JSON-RPC.

## Design (Figma colors — exact)
- Primary fuchsia `#861E74` (token `--color-wine`), Footer charcoal `#2E3333` (`--color-wine-dark`), slate `#6E7491`, label `#3C3C43`.
- Tabs font: **Nunito Sans ExtraBold**. Body: Heebo. Logo header shows "J Cafe Phuket" (black).
- Tokens in `src/app/globals.css`. Reference docs (HTML) in `C:\Users\USER\J-Cafe-*.html` (spec, wireframes, mockup, backlog, index).

## i18n
- `[lang]` routing (he default RTL, en LTR). `src/proxy.ts` redirects `/` → `/he|/en`.
- Dictionaries: `src/i18n/dictionaries/he.json`, `en.json`. `params` is async (Next 16).

## ODOO integration (External API / JSON-RPC) — WORKING
- Config in `.env.local`: `ODOO_URL` (https://thekosherplace-staging-latest-18-32329438.dev.odoo.com), `ODOO_DB` (thekosherplace-staging-latest-18-32329438), `ODOO_USERNAME` (talya@kosher-place.com), `ODOO_API_KEY`, `ODOO_MODE=api`.
- Client: `src/lib/odoo/client.ts` (authenticate + execute_kw + searchRead). Adapter switch: `src/lib/odoo/adapter.ts` (mock|api).
- **Phuket = company_id 14. Pricelist 11 ("Phuket Shop THB").**
- **Stores = pos.config** (`src/lib/odoo/phuket.ts`): meat→Phuket Restaurant(20), dairy→Phuket Pizza(21), roti→Banana loti Shop(33), grocery→Phuket Shop(30).
- Categories = `pos.category` from each config's `iface_available_categ_ids`. Kitchen stores show ONLY their unique cats (subtract grocery's shared cats). Grocery = grid layout; kitchen = horizontal "restaurant" layout + sections.
- Products (`api-adapter.ts`): `available_in_pos=true` + `company_id in [14,false]` + `pos_categ_ids`. Price = pricelist-11 fixed-price map else list_price. Images `/web/image/product.template/{id}/image_512` (public). HE names + `description_sale` via `lang=he_IL` context. Dedupe TakeAway (names ending " TA").
- Product options (bread/toppings): `GET /api/products/options?tmplId=` reads `product.template.attribute.line` (radio=Pick1, multi=optional) + `product.template.attribute.value` price_extra; placeholder values filtered. Shown in ProductModal ONLY for products configured with attributes.
- **Order creation** (`src/lib/odoo/orders.ts` + `POST /api/orders`): find/create `res.partner` (company_id=false shared, tag "Phuket", by phone→email), create `sale.order` (company 14, pricelist 11, `line_section` per store), `action_confirm`. Verified (S14850, S14851).
- Dev-only routes (REMOVE before prod): `/api/odoo/health`, `/api/odoo/explore`.

## Stripe (TEST mode) — WORKING
- Keys in `.env.local`: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_test), `STRIPE_SECRET_KEY` (sk_test).
- `POST /api/stripe/payment-intent` (currency THB ×100). `StripeProvider` + `CardElement` in checkout. On card success → create ODOO order. COD/QR create order directly.
- Test card: 4242 4242 4242 4242, 12/34, 123.

## Supabase — WORKING
- Org "talyaalon's Protofolio". Project **jcafe** id `cfcwdxgpagtogjqlokbn`, region ap-southeast-1. URL https://cfcwdxgpagtogjqlokbn.supabase.co.
- Tables (RLS, public read): `store_hours` (store_id, day_of_week 0-6, closed, open_time, close_time), `store_settings` (preorder_enabled, min_prep_minutes, max_days_ahead), `banners` (title, image_url, link, active, sort).
- Keys in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (sb_publishable_…), `SUPABASE_SERVICE_ROLE_KEY` (sb_secret_… — for admin writes, bypasses RLS).
- Lib: `src/lib/supabase/server.ts` (supabasePublic reads, supabaseAdmin writes), `src/lib/supabase/data.ts` (getActiveBanners, getStoreHours, getStoreOpenStatus[Asia/Bangkok], getAllBanners).
- Store hours seeded: daily 10:00–22:00, Fri 10:00–15:00, **Sat closed** (Shabbat). 3 demo banners (picsum).

## Admin / Manager — WORKING
- `/[lang]/manager` — password gate (cookie `jcafe_admin`). Password env `ADMIN_PASSWORD` (currently `jcafe-admin-2026`).
- Edit store hours (per store/day) + manage banners (add by URL / toggle / delete). Server actions in `src/app/[lang]/manager/actions.ts` use supabaseAdmin (service role).

## Cart / Favorites (client, localStorage)
- `src/lib/cart/CartContext.tsx` (grouped by store), `src/lib/favorites/FavoritesContext.tsx` (heart button on cards).
- Cart UIs: side `CartPanel` ("Your order", scrollable, unit+line price, real thumbnails), mobile `CartDrawer` + `StickyCartBar`.

## Key files
```
src/proxy.ts · src/i18n/* · src/app/[lang]/{layout,page,checkout,login,register,forgot-password,reset-password,account,manager}
src/app/api/{orders,stripe/payment-intent,products/options,odoo/health,odoo/explore}
src/lib/odoo/{client,adapter,api-adapter,mock-adapter,mock-data,phuket,orders,types}
src/lib/{supabase,cart,favorites,admin,format,stripe}
src/components/* (Storefront, ProductCard, ProductRowCard, ProductModal, Header, CartPanel/Drawer, CheckoutForm, SiteFooter, Auth*, Manager*, HeartButton, CartThumb, StripeProvider...)
```

## DONE
Storefront (4 Phuket stores, grid + restaurant layout, uniform cards, search, sort, categories, real banners) · product modal (contained image, real options, scroll-lock) · favorites heart · cart (context, side panel, mobile drawer, sticky bar) · checkout (guest 2-step, delivery/pickup, Stripe card + COD/QR, confirmation) · ODOO real order creation · Supabase banners + hours · manager area with password.

## TODO (next)
1. **Storefront respect store hours** — show "Closed now" + scheduled-order flow (calendar; per spec A.6) using `getStoreOpenStatus` + `store_settings`.
2. **Real auth** — Supabase email+password for login/register (currently UI stubs that redirect home). Social (Google/FB/Apple) needs OAuth apps per provider.
3. **Order history / "View Order"** for logged-in users (currently removed for guests).
4. **Notifications** — order confirmation Email/SMS/WhatsApp (pick provider: Twilio vs Meta+local SMS).
5. **Delivery fee by distance** — Google Maps Places (Phuket-limited) + Distance Matrix; currently "calculated at checkout".
6. **POS (picking) + KDS (kitchen) + courier** — per spec (future phase; ShipDay later).
7. **Banner image upload** — Supabase Storage (currently add-by-URL).
8. **Before production:** remove `/api/odoo/explore` + `/api/odoo/health`; ROTATE exposed secrets (ODOO API key, Stripe, Supabase, GitHub token were shared in chat).

## Open decisions still pending
- Notifications provider (cost compare). Barcode scanner model. Scheduled-order window params. Invoice (ODOO account.move + 7% VAT) auto-send.
