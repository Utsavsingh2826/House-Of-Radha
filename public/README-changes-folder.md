# Website change assets

Drop images from the **WEBSITE CHANGES** deck / `changes` folder here if you want to override carousel art without rebuilding:

| File | Used for |
|------|----------|
| `hor-logo.png` | Replace `src/assets/images/hor-logo.svg` in Navbar/Footer |
| `carousel-rakhi.jpg` | Slide 1 (optional; default uses `rakhi-hero.png`) |
| `carousel-sister-bc-it-02.jpg` | Slide 2 fallback if SKU BC-IT-02 has no Cloudinary image |

Slide 2 also loads **BC-IT-02** from the live catalog API when available.
