# Flutter — Promo Banner Aspect Ratio

Match the website CMS promotional banners (`promo-banner-frame`).

## Ratio

| | Value |
|---|---|
| **Aspect ratio** | `16 / 6` (= `8 / 3`) |
| **Width : Height** | `16 : 6` |
| **Height from width** | `height = width * (6 / 16)` |

Website source: `src/shared/component/banner/promotional-banner.css` → `aspect-ratio: 16 / 6;`  
Image fit: `object-fit: cover` → Flutter `BoxFit.cover`

## Flutter example

```dart
AspectRatio(
  aspectRatio: 16 / 6, // same as 8 / 3
  child: ClipRRect(
    borderRadius: BorderRadius.circular(24),
    child: Image.network(
      imageUrl,
      fit: BoxFit.cover,
      width: double.infinity,
    ),
  ),
)
```

Or with explicit height:

```dart
final width = MediaQuery.sizeOf(context).width;
final height = width * (6 / 16);

SizedBox(
  width: width,
  height: height,
  child: Image.network(imageUrl, fit: BoxFit.cover),
)
```

## Suggested image export size

Any size with **16×6** proportions, e.g.:

- `1600 × 600`
- `1280 × 480`
- `800 × 300`

## Note (mobile web only)

On the website below `768px` there is also `min-height: 220px`, which can stretch taller than `16/6` on very narrow screens. For **app/web parity**, prefer pure `16/6` without a min height.
