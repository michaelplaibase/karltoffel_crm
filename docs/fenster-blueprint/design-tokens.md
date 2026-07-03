# Fenster Partner Portal — Measured Design Tokens

Source: live computed styles (`getComputedStyle`) measured on the logged-in portal at
`https://www.fenster.dk/calendar`, `/settings`, and `/contact_list/` (2026-07-03, Chrome, 16px root).

The portal is **Bootstrap 4.1.3 + Shards UI** (`shards.css`) with a custom primary color, plus
`employee.css`, `bootstrap-table 1.21.0`, FullCalendar 3.9.0, jQuery UI, flatpickr.
All rem values below resolve against `16px` root font size.

---

## 1. Global / body

- `body` font-family (measured, exact stack):
  `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`
  (i.e. the Bootstrap 4 native system stack — Roboto is loaded but body text renders in the system font)
- `body` font-size: **16px**; line-height: **24px** (1.5)
- `body` color: **rgb(90, 97, 105) = #5A6169** (Shards body gray — used for body copy, labels, table cells)
- `body` background: **rgb(255, 255, 255) = #FFFFFF** (plain white, no gray app background)
- `small` / `.form-text`: **12.8px** (80%)
- `.text-muted` / help text color: **rgb(134, 142, 150) = #868E96**
- `hr` border-top: `1px solid rgba(0, 0, 0, 0.1)`
- Default `a` link color: **#257BB6**, `text-decoration: none`; `a:hover`: **rgb(0, 86, 179) = #0056B3** with `text-decoration: underline`

## 2. Brand color palette (measured)

| Role | RGB | Hex |
|---|---|---|
| Primary (buttons, links, navbar, badges, focus border) | rgb(37, 123, 182) | **#257BB6** |
| Primary hover (btn-primary:hover) | rgb(27, 113, 172) | **#1B71AC** |
| Secondary (btn-secondary, body text) | rgb(90, 97, 105) | **#5A6169** |
| Success | rgb(28, 189, 107) | **#1CBD6B** |
| Danger | rgb(196, 24, 60) | **#C4183C** |
| Warning (text #212529 on it) | rgb(255, 180, 0) | **#FFB400** |
| Info | rgb(0, 184, 216) | **#00B8D8** |
| Light (Bootstrap/Shards .btn-light) | rgb(233, 236, 239) | **#E9ECEF** |
| Light (calendar-toolbar .btn-light override) | rgb(232, 232, 232) bg / rgb(176, 176, 176) border | **#E8E8E8 / #B0B0B0** |
| Dark / headings | rgb(33, 37, 41) | **#212529** |
| Link hover | rgb(0, 86, 179) | **#0056B3** |
| Muted text | rgb(134, 142, 150) | **#868E96** |
| Input border | rgb(190, 202, 214) | **#BECAD6** |
| Table border | rgb(222, 226, 230) | **#DEE2E6** |
| Table header text | rgb(155, 164, 174) | **#9BA4AE** |
| Striped row bg | rgb(247, 248, 251) | **#F7F8FB** |
| Hover row bg | rgb(240, 240, 240) | **#F0F0F0** |

## 3. Top navbar

- Element: `nav.navbar.fixed-top.navbar-expand-lg.navbar-dark.bg-primary`
- background-color: **#257BB6** (rgb(37, 123, 182))
- Rendered height: **68px** (fixed-top; page content starts at `top: 68px`); `min-height: 0`
- padding: **12px 24px**; box-shadow: **none**; border-bottom: **none**
- Brand (`.navbar-brand`, text "Fenster Portal", no logo image): color **#FFFFFF**, font-size **16px**, font-weight **400**
- Nav links (`.nav-link`): font-size **16px**, font-weight **300**, padding **10px**, `text-transform: none`, `letter-spacing: normal`, system font (inherits body)
  - Default color: **rgba(255, 255, 255, 0.5)**
  - Hover/focus: **rgba(255, 255, 255, 0.75)**
  - Active page link: **#FFFFFF** (solid white)
  - Disabled: rgba(255, 255, 255, 0.25)
- Dropdown toggles use class `dropdown-toggle caret-off` (caret hidden)

## 4. Layout / containers

- Content pages (settings, lists): `main` wrapper `container pt-0 pt-sm-4 pt-md-4 px-0 px-sm-4 px-md-4` → **max-width: 1140px**, top padding **24px**, side padding **24px** (≥ sm)
- Calendar page: `container-fluid px-0` (full-width, no max-width)
- Sidebar (where present): `col-3 sidebar w-sidebar` → **width: 220px**, transparent background; sidebar links: color **#257BB6**, font-size **14.4px** (0.9rem), font-weight **300**

## 5. Card / panel (white content card)

- `.card` (used as `card py-3 px-3 border border-light`):
  - background: **#FFFFFF**
  - border: **1px solid #E9ECEF**
  - border-radius: **10px** (0.625rem)
  - box-shadow (exact, 4 layers — Shards card shadow):
    `0 7.5px 35px rgba(90,97,105,0.10), 0 15px 22.5px rgba(90,97,105,0.10), 0 4px 8.5px rgba(90,97,105,0.12), 0 2px 3px rgba(90,97,105,0.10)`
    (rem form: `0 .46875rem 2.1875rem, 0 .9375rem 1.40625rem, 0 .25rem .53125rem, 0 .125rem .1875rem`)
  - own padding when using the `py-3 px-3` utility wrapper: **16px**
- `.card-body` padding: **30px 24px** (1.875rem 1.5rem)

## 6. Headings (all Poppins, weight 400, color #212529, margin-bottom 12px)

| Tag | font-size | line-height |
|---|---|---|
| h1 | **48.832px** (3.052rem) | 48px |
| h2 | **39.056px** (2.441rem) | 36px |
| h3 | **31.248px** (1.953rem) | 36px |
| h4 | **25.008px** (1.563rem) | 32px |
| h5 | **20px** (1.25rem) | 24px |
| h6 | **16px** (1rem) | 24px |

- font-family: **Poppins** (falls back to system stack)
- font-weight: **400**; color: **#212529**; margin: 0 0 **12px** (0.75rem); no text-transform
- Real usage: page title = `h1` ("Indstillinger"), section headings = `h4` ("Fenster konto")

## 7. Buttons

Base `.btn` (measured on real "Gem alle ændringer" / "Søg" buttons):
- font-family: **Poppins**; font-size: **14px** (.875rem); font-weight: **300**
- padding: **12px 20px** (.75rem 1.25rem); line-height: **15.75px** (1.125)
- border: **1px solid**; border-radius: **6px** (.375rem); `text-transform: none`; box-shadow: none (rest state)
- Rendered height: **42px**

Variants (background / border / text):
- `.btn-primary`: **#257BB6 / #257BB6 / #FFFFFF**; hover: bg+border **#1B71AC**, shadow `0 5px 15px rgba(0,0,0,.05), 0 4px 10px rgba(0,123,255,.25)`
- `.btn-secondary`: **#5A6169 / #5A6169 / #FFFFFF**
- `.btn-success`: **#1CBD6B / #1CBD6B / #FFFFFF**
- `.btn-danger`: **#C4183C / #C4183C / #FFFFFF**
- `.btn-warning`: **#FFB400 / #FFB400 / #212529**
- `.btn-info`: **#00B8D8 / #00B8D8 / #FFFFFF**
- `.btn-light`: **#E9ECEF / #E9ECEF / #212529** (calendar toolbar override: bg #E8E8E8, border #B0B0B0)
- `.btn-dark`: **#212529 / #212529 / #FFFFFF**
- `.btn-outline-primary`: transparent / **#257BB6** / **#257BB6**
- `.btn-outline-secondary`: transparent / **#5A6169** / **#5A6169**
- `.btn-link`: transparent, text **#257BB6**
- `.btn-sm`: padding **5.6px 16px**, font-size **12px**, radius **5.6px** (.35rem); rendered height **31px**
- `.btn-lg`: padding **12px 28px**, font-size **18px**, radius **8px** (.5rem)

## 8. Forms

- `label`: font-size **16px**, font-weight **300**, color **#5A6169**, margin-bottom **8px** (0 when inline)
- `.form-group` margin-bottom: **16px** (1rem)
- `.form-control` (text input, standard):
  - rendered height: **41px**
  - padding: **8px 16px** (.5rem 1rem)
  - font-size: **15.2px** (.95rem); line-height **22.8px** (1.5); font: system stack (inherits body)
  - color: **#495057** (rgb(73, 80, 87))
  - background: **#FFFFFF**
  - border: **1px solid #BECAD6** (rgb(190, 202, 214))
  - border-radius: **6px** (.375rem); box-shadow: none at rest
  - `:focus`: border-color **#257BB6**, box-shadow `0 0.313rem 0.719rem rgba(0,123,255,0.1), 0 0.156rem 0.125rem rgba(0,0,0,0.06)` (≈ `0 5px 11.5px` + `0 2.5px 2px`), background stays white, color #495057
- Help text (`small.form-text.text-muted`): font-size **12.8px**, color **#868E96**
- Compact selects seen on settings page (custom): height **34px**, padding 6px 28px 6px 12px, font-size 15.2px, border #BECAD6 (standard selects match .form-control at 41px)
- Search input in input-groups (contact list): height 41px, border-radius flattened to **0** on the grouped edge, placeholder "Kundenr, navn, email, tlf, vejnavn, husnr., postnr."

## 9. Tables (contact list — `table.fenster-table-small.table-striped.table-hover` via bootstrap-table 1.21.0)

- `th`: font-size **11px**, font-weight **300**, color **#9BA4AE**, `text-transform: uppercase`, letter-spacing normal, background transparent, border-bottom **2px solid #DEE2E6**; padding sits on inner `.th-inner`: **12px**
- `td`: padding **12px** (.75rem), border-top **1px solid #DEE2E6**, color **#5A6169**
  - In `fenster-table-small` tables: font-size **12.8px** (0.8rem). Default tables inherit 16px.
- Striped rows: `tbody tr:nth-child(odd)` background **#F7F8FB**; even rows transparent (white)
- Hover rows (`.table-hover tbody tr:hover`): background **#F0F0F0**

## 10. Dropdown menus

- `.dropdown-menu`: background **#FFFFFF**, border `1px solid rgba(0,0,0,0.05)`, border-radius **6px**, padding **8px 0**,
  box-shadow: `0 8px 64px rgba(0,0,0,0.11), 0 10px 20px rgba(0,0,0,0.05), 0 2px 3px rgba(0,0,0,0.06)`
- `.dropdown-item`: padding **8px 20px**, font-size **15px**, color **#5A6169**

## 11. Badges & alerts (Shards solid style)

- `.badge`: font-size **12px**, font-weight **500**, padding **6px 8px**, border-radius **6px**; `.badge-primary` bg **#257BB6**
- Alerts are solid-filled with pale text (Shards):
  - `.alert-success`: bg **#1CBD6B**, text/border **#D7FAE9** (rgb(215, 250, 233))
  - `.alert-danger`: bg **#C4183C**, text/border **#FAD7DE** (rgb(250, 215, 222))

## 12. Spacing rhythm (recurring values)

- 4px base scale (Bootstrap 4): common measured values **8px / 12px / 16px / 20px / 24px / 30px**
- Page top/side padding: **24px** (`pt-4 px-4` on 1140px container)
- Card body padding: **30px 24px**; utility-card wrapper padding: 16px
- Form-group margin-bottom: **16px**; label margin-bottom: **8px**
- Button padding: **12px 20px**; navbar padding: **12px 24px**; table cell padding: **12px**
- Heading margin-bottom: **12px**

---

## CSS custom properties (ready to use)

```css
:root {
  /* Brand colors */
  --color-primary: #257BB6;
  --color-primary-hover: #1B71AC;
  --color-secondary: #5A6169;
  --color-success: #1CBD6B;
  --color-danger: #C4183C;
  --color-warning: #FFB400;
  --color-info: #00B8D8;
  --color-light: #E9ECEF;
  --color-dark: #212529;
  --color-link: #257BB6;
  --color-link-hover: #0056B3;

  /* Text */
  --color-body-text: #5A6169;
  --color-heading: #212529;
  --color-muted: #868E96;
  --color-input-text: #495057;
  --color-table-header: #9BA4AE;

  /* Surfaces & borders */
  --color-body-bg: #FFFFFF;
  --color-card-bg: #FFFFFF;
  --color-card-border: #E9ECEF;
  --color-input-border: #BECAD6;
  --color-table-border: #DEE2E6;
  --color-row-striped: #F7F8FB;
  --color-row-hover: #F0F0F0;
  --color-navbar-bg: #257BB6;
  --color-navbar-link: rgba(255, 255, 255, 0.5);
  --color-navbar-link-hover: rgba(255, 255, 255, 0.75);
  --color-navbar-link-active: #FFFFFF;

  /* Typography */
  --font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
    "Segoe UI Symbol", "Noto Color Emoji";
  --font-family-headings: "Poppins", var(--font-family-base); /* also buttons */
  --font-family-mono: "Roboto Mono", monospace;
  --font-size-base: 16px;
  --line-height-base: 1.5;           /* 24px */
  --font-size-sm: 12.8px;            /* small / help text */
  --font-size-input: 15.2px;         /* .95rem */
  --font-size-btn: 14px;
  --font-size-table-th: 11px;
  --font-size-table-td-small: 12.8px;
  --font-size-h1: 48.832px;  /* 3.052rem */
  --font-size-h2: 39.056px;  /* 2.441rem */
  --font-size-h3: 31.248px;  /* 1.953rem */
  --font-size-h4: 25.008px;  /* 1.563rem */
  --font-size-h5: 20px;
  --font-size-h6: 16px;
  --font-weight-light: 300;          /* body labels, buttons, nav links */
  --font-weight-normal: 400;         /* headings */
  --font-weight-badge: 500;

  /* Radii */
  --radius-base: 6px;                /* buttons, inputs, dropdowns, badges */
  --radius-sm: 5.6px;                /* .btn-sm */
  --radius-lg: 8px;                  /* .btn-lg */
  --radius-card: 10px;

  /* Shadows */
  --shadow-card: 0 7.5px 35px rgba(90,97,105,.10), 0 15px 22.5px rgba(90,97,105,.10),
                 0 4px 8.5px rgba(90,97,105,.12), 0 2px 3px rgba(90,97,105,.10);
  --shadow-dropdown: 0 8px 64px rgba(0,0,0,.11), 0 10px 20px rgba(0,0,0,.05),
                     0 2px 3px rgba(0,0,0,.06);
  --shadow-input-focus: 0 5px 11.5px rgba(0,123,255,.10), 0 2.5px 2px rgba(0,0,0,.06);
  --shadow-btn-hover: 0 5px 15px rgba(0,0,0,.05), 0 4px 10px rgba(0,123,255,.25);

  /* Component metrics */
  --navbar-height: 68px;
  --navbar-padding: 12px 24px;
  --container-max-width: 1140px;
  --page-padding: 24px;
  --sidebar-width: 220px;
  --card-body-padding: 30px 24px;
  --btn-padding: 12px 20px;
  --btn-height: 42px;
  --btn-sm-padding: 5.6px 16px;
  --btn-lg-padding: 12px 28px;
  --input-height: 41px;
  --input-padding: 8px 16px;
  --form-group-margin: 16px;
  --label-margin-bottom: 8px;
  --table-cell-padding: 12px;
  --heading-margin-bottom: 12px;
  --dropdown-item-padding: 8px 20px;
  --badge-padding: 6px 8px;
}
```

## Fonts & icon libraries (exact sources)

- **Base framework**: Bootstrap **4.1.3** (`https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css`) themed by **Shards UI** (`/static/css/shards.css`, customized: primary re-mapped to #257BB6, success to #1CBD6B).
- **Poppins** (weights 300, 400, 500, 600) — `@import`ed inside shards.css from Google Fonts (`fonts.googleapis.com/css?family=Poppins:300,400,500,600|Roboto+Mono`). Used for **headings and buttons**.
- **Roboto** (300–900 + italics) — loaded via `<link>` `fonts.googleapis.com/css?family=Roboto:300,...,900i` but body text actually renders in the **system font stack** (Bootstrap default). Include it for fidelity on machines where "Roboto" resolves in the stack.
- **Roboto Mono** (400) — loaded via the shards.css import (monospace).
- **Icons actually used in the UI: Bootstrap Icons 1.9.1** (`https://cdn.jsdelivr.net/npm/bootstrap-icons@1.9.1/font/bootstrap-icons.css`) — e.g. `bi-person-circle`, `bi-search`, `bi-caret-down-square`, `bi-geo-alt-fill`. No `fa-` or Material classes found in the DOM on the measured pages.
- **Font Awesome Pro (v5 + v6 faces)** is also loaded from a self-hosted kit (`/static/fontawesome/css/all.css`) but appears unused on the calendar/settings/contact-list pages. For a clone, Bootstrap Icons is sufficient.
- Supporting CSS also loaded: bootstrap-table 1.21.0, FullCalendar 3.9.0, jQuery UI 1.12.1 base theme, flatpickr (CDN), plus site CSS (`employee.css`, `sidebar.css`, `calendar.css`, `tasks.css`).

## Not measured / caveats

- True `:hover`/`:focus` rendered states were read from the CSSOM rules (shards.css), not by triggering pseudo-states — values are exact per stylesheet.
- `h2`/`h3` real-world instances did not appear on the three pages (values taken from computed styles of injected elements, which resolve the live cascade).
- Viewport during measurement was 2560px wide; responsive (`pt-sm/px-sm`) values below the `sm` breakpoint collapse to 0.
- `.btn-warning`, `.btn-info`, `.btn-dark`, `.badge`, alert tokens were resolved via injected elements against the live cascade (no visible instance on the three pages).
