# Dashboard — Deema Fashion · Colors, Visual Identity & Logo

> **Purpose:** Configure the admin dashboard and `GET /user/settings` so the website, mobile app, and notifications match the **Deema Fashion** earthy brand.
>
> **Endpoint:** `GET /api/user/settings` (public — no auth required)
>
> **Replace `{SITE_URL}`** with your live store domain, e.g. `https://deemafashion.com` or your staging URL.
>
> **Last updated:** 24 Nov 2026 — earthy palette (replaces magenta/pink).

---

## 1) Brand name

| Language | Display name | Usage |
|----------|--------------|--------|
| English  | **Deema Fashion** | Page title, navbar, footer, auth screens, copyright |
| Arabic   | **ديما فاشن** | Same surfaces in RTL |

**Tagline (reference — web copy, not a settings field today)**

| EN | Everything you love, delivered with a smile. Fresh finds, great deals, and a little joy in every basket. |
| AR | كل ما تحبه، يصلك بابتسامة. عروض رائعة وفرحة صغيرة في كل سلة. |

---

## 2) Logo assets & URLs

Logos are served from the website `public/images/shared/` folder. Use these **full URLs** in the dashboard (emails, push notifications, CMS, app config, etc.).

| Asset | Role | Relative path | Full URL |
|-------|------|---------------|----------|
| **Primary logo** | Navbar, auth, loader, marketing | `/images/shared/logo.png` | `{SITE_URL}/images/shared/logo.png` |
| **Footer logo** | Footer / dark backgrounds | `/images/shared/logo-footer.png` | `{SITE_URL}/images/shared/logo-footer.png` |
| **App icon** | PWA, square avatars, small badges | `/images/shared/logo-icon.png` | `{SITE_URL}/images/shared/logo-icon.png` |
| **Favicon** | Browser tab | `/images/shared/favicon.png` | `{SITE_URL}/images/shared/favicon.png` |

> Official lockup (24 Nov 2026): DF monogram + butterfly on black, wordmark **Deema Fashion** (brown `#63301D`, butterfly olive `#78822A`).

### Recommended dashboard values

| Field (suggested) | Value |
|-------------------|--------|
| Site / app name | `Deema Fashion` |
| Site / app name (AR) | `ديما فاشن` |
| Logo URL (primary) | `{SITE_URL}/images/shared/favicon.png` |
| Logo URL (wide) | `{SITE_URL}/images/shared/logo.png` |
| Favicon URL | `{SITE_URL}/images/shared/favicon.png` |
| Notification icon | `{SITE_URL}/images/shared/favicon.png` |

### Logo usage rules

- **Navbar & footer:** icon (`favicon.png`) + wordmark gradient text — do not stretch the icon.
- **Minimum clear space:** at least half the icon height on all sides.
- **Backgrounds:** icon works on white, cream (`#F7F5F2` / `#EAD8C7`), and warm dark (`#1C1916`). Use `logo-footer.png` on very dark footers if contrast is low.
- **Do not** recolor the logo file; brand browns / sage come from the palette below.
- **Format:** PNG with transparency preferred.

---

## 3) Color palette — dashboard settings

Set these in the dashboard **App Settings → Colors** (mapped to `data.color` and `data.dark_color` in the API).

### Full brand sheet

| Role | Hex | Usage |
|------|-----|--------|
| Primary | `#5A3A2E` | Brand · Headers · Primary buttons |
| Secondary | `#8B5E4A` | Sections · Highlights · Secondary CTAs |
| Accent | `#D4B39A` | Soft buttons · Key elements |
| Background | `#EAD8C7` | Page wash |
| Surface | `#F7F5F2` | Cards · Content areas |
| Highlight | `#A9B07A` | Emphasis · logo butterfly |
| Text & Icons | `#1F1F1F` | Primary text |

### Light mode — `data.color`

| Dashboard field | API key | Hex | Name | Usage |
|-----------------|---------|-----|------|--------|
| Main color | `main_color` | `#5A3A2E` | Primary brown | Primary buttons, links, navbar accents, badges |
| Second color | `second_color` | `#8B5E4A` | Clay brown | Gradients, hover, secondary CTAs, highlights |
| Text color | `text_color` | `#1F1F1F` | Charcoal | Body text on light backgrounds |

### Dark mode — `data.dark_color`

| Dashboard field | API key | Hex | Name | Usage |
|-----------------|---------|-----|------|--------|
| Main color | `main_color` | `#D4B39A` | Accent tan | Primary actions on dark |
| Second color | `second_color` | `#A9B07A` | Sage highlight | Gradient partner, secondary accents |
| Text color | `text_color` | `#F7F5F2` | Off-white | Body text on dark backgrounds |

### Supporting accents (CSS / design reference — optional in dashboard)

| Token | Hex | Usage |
|-------|-----|--------|
| Accent / soft button | `#D4B39A` | Secondary soft buttons, chips |
| Highlight | `#A9B07A` | Variety accents, logo butterfly |
| Gradient start | `#5A3A2E` | Wordmark & hero gradients (top) |
| Gradient end | `#8B5E4A` | Wordmark & hero gradients (bottom) |
| Success | `#16a34a` | Order success, stock available |
| Error | `#EF4444` | Errors, destructive actions |

### Light mode backgrounds (reference)

| Surface | Hex |
|---------|-----|
| Page canvas | `#F7F5F2` |
| Secondary surface | `#EAD8C7` |
| Card | `#ffffff` |
| Brand whisper tint | `#F0E6DA` |

### Dark mode backgrounds (reference)

| Surface | Hex |
|---------|-----|
| Page canvas | `#1C1916` |
| Secondary surface | `#24201C` |
| Card | `#24201C` |
| Brand tint | `#2A2622` |

---

## 4) API payload example

After dashboard save, `GET /api/user/settings` should return (minimum for brand):

```json
{
  "status": true,
  "message": "OK",
  "data": {
    "color": {
      "main_color": "#5A3A2E",
      "second_color": "#8B5E4A",
      "text_color": "#1F1F1F"
    },
    "dark_color": {
      "main_color": "#D4B39A",
      "second_color": "#A9B07A",
      "text_color": "#F7F5F2"
    }
  }
}
```

---

## 5) Visual identity summary

### Personality

- **Warm, earthy, fashion-forward** — chocolate brown, clay, cream, and sage.
- **Primary brown** = brand & headers; **sage** = logo butterfly / emphasis.
- **Cream canvases** (`#EAD8C7` / `#F7F5F2`) — brand color reserved for actions and accents.

### Typography & wordmark

- Wordmark: **Deema Fashion** / **ديما فاشن**
- Gradient text (marketing): `#5A3A2E` → `#8B5E4A` (light) · `#D4B39A` → `#A9B07A` (dark)
- UI font: system / project default sans-serif — no custom dashboard font field required.

### Buttons & CTAs

| Type | Background | Text |
|------|------------|------|
| Primary | `#5A3A2E` | White |
| Secondary | `#D4B39A` | `#5A3A2E` |
| Outline | Transparent | `#5A3A2E` + brown border |

### What to avoid

| Don't use | Reason |
|-----------|--------|
| Magenta `#c720a4` / pink `#ff1493` | Previous temporary palette — replaced |
| Orange `#FF6B00` / cyan defaults | Old TickMart palette — conflicts with Deema |
| Full brown page backgrounds | Reduces readability; use cream canvas |
| Random third brand color | Breaks gradient system |

---

## 6) Web implementation note

The website applies brand tokens from `src/shared/lib/brandColors.ts` and CSS fallbacks in `src/index.css`. Backend defaults (and migration) now return the earthy palette from `GET /user/settings`.

1. Confirm `GET /user/settings` returns the hex values above.
2. Keep `brandColors.ts` aligned with the sheet as the static fallback.

---

## 7) Quick copy-paste — dashboard form

```
Brand name (EN):     Deema Fashion
Brand name (AR):     ديما فاشن

Logo URL:            {SITE_URL}/images/shared/favicon.png
Wide logo URL:       {SITE_URL}/images/shared/logo.png
Favicon URL:         {SITE_URL}/images/shared/favicon.png

Light main_color:    #5A3A2E
Light second_color:  #8B5E4A
Light text_color:    #1F1F1F

Dark main_color:     #D4B39A
Dark second_color:   #A9B07A
Dark text_color:     #F7F5F2
```

---

## 8) مرجع سريع — الداشبورد (عربي)

| الحقل | القيمة |
|-------|--------|
| اسم المتجر (EN) | Deema Fashion |
| اسم المتجر (AR) | ديما فاشن |
| رابط الشعار | `{SITE_URL}/images/shared/favicon.png` |
| اللون الرئيسي (فاتح) | `#5A3A2E` |
| اللون الثانوي (فاتح) | `#8B5E4A` |
| لون النص (فاتح) | `#1F1F1F` |
| اللون الرئيسي (داكن) | `#D4B39A` |
| اللون الثانوي (داكن) | `#A9B07A` |
| لون النص (داكن) | `#F7F5F2` |

**ملاحظة:** لا تستخدم ألوان TickMart القديمة ولا الماجنتا/الوردي — الهوية الحالية **Deema Fashion** بالبني والطيني والكريمي.

---

*Last updated: 24 Nov 2026 · Source: Deema Fashion brand sheet + web app (`src/index.css`, `src/shared/lib/brandColors.ts`, `public/images/shared/`)*
