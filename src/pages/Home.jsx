import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import { api } from '../lib/api';
import './Home.css';
import heroImg from '../assets/images/hero.png';
import templeImg from '../assets/images/temple.png';
import rakhiHeroImg from '../assets/images/rakhi-hero.png';
import jewelryCloseupImg from '../assets/images/jewelry-closeup.png';
import necklaceTempleImg from '../assets/images/necklace-temple.png';

const STATIC_HERO_SLIDES = [
  {
    id: 'rakhi',
    image: rakhiHeroImg,
    heading: 'Iss Saal Bhai Ki Chandi Hai!!',
    subheading: 'Shop Our Pure 925 Silver Rakhi Collection',
    text: '10% off on first order.',
    cta: 'Shop Rakhi Collection',
    link: '/category/rakhi',
    tone: 'default',
  },
  {
    id: 'sister',
    image: heroImg,
    skuForImage: 'BC-IT-02',
    heading: 'Gifts for Sister that Grow In Value, Devotion, And Memory.',
    text: "She won't fight about this with you!",
    cta: 'Shop Gifts for Sister & Bhabhis',
    link: '/category/women',
    tone: 'default',
  },
  {
    id: 'brother',
    image: jewelryCloseupImg,
    heading: 'Dapper & Dripping in Silver!',
    text:
      'For the Brother Who Deserves Nothing Less Than Extraordinary. Gift him fine silver accessories that bring sophistication to every celebration and carry sentimental value for a lifetime.',
    cta: 'Shop Gifts for Brother',
    link: '/category/men',
    tone: 'default',
  },
  {
    id: 'brand',
    image: necklaceTempleImg,
    heading: 'At House of Radha, we believe jewelry should speak to the soul.',
    text:
      'Inspired by the divine, eternal love of Radha and Krishna, we bring you heritage-rich craftsmanship with contemporary design.',
    cta: 'Shop Our Collection',
    link: '/category/collections',
    tone: 'brand',
  },
];

const Home = () => {
  const [productImages, setProductImages] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const skus = STATIC_HERO_SLIDES.map((s) => s.skuForImage).filter(Boolean);
      const entries = await Promise.all(
        skus.map(async (sku) => {
          try {
            const res = await api(`/api/products/${encodeURIComponent(sku)}`, { auth: false });
            const img = res?.data?.image || res?.data?.images?.[0];
            return img ? [sku, img] : null;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      const map = {};
      for (const e of entries) {
        if (e) map[e[0]] = e[1];
      }
      setProductImages(map);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const heroSlides = useMemo(
    () =>
      STATIC_HERO_SLIDES.map((slide) => ({
        ...slide,
        image: slide.skuForImage && productImages[slide.skuForImage] ? productImages[slide.skuForImage] : slide.image,
      })),
    [productImages]
  );

  const collections = [
    {
      id: 'dainty',
      title: 'The Dainty & Modern',
      description: 'Office wear, party, mostly diamonds',
      image: heroImg,
      link: '/category/dainty',
    },
    {
      id: 'temple',
      title: 'The Temple Jewelry',
      description: 'Brides, Festive shoppers, Traditionalists',
      image: templeImg,
      link: '/category/temple',
    },
    {
      id: 'fusion',
      title: 'The Fusion Collection',
      description: 'Oxidized / Ethnic Silver',
      image: jewelryCloseupImg,
      link: '/category/fusion',
    },
  ];

  return (
    <div className="home">
      <section className="hero">
        <Swiper
          modules={[Autoplay, Navigation, Pagination]}
          autoplay={{ delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}
          navigation={{ nextEl: '.hero-next', prevEl: '.hero-prev' }}
          pagination={{ clickable: true }}
          loop
          className="hero-swiper"
        >
          {heroSlides.map((slide) => (
            <SwiperSlide key={slide.id}>
              <div className="hero-slide">
                <div className="hero-slide-bg">
                  <img
                    src={typeof slide.image === 'string' && slide.image.startsWith('http') ? slide.image : slide.image}
                    alt=""
                    className="hero-slide-img"
                    loading={slide.id === 'rakhi' ? 'eager' : 'lazy'}
                  />
                </div>
                <div className="hero-slide-scrim" />
                <div className={`hero-slide-content ${slide.tone === 'brand' ? 'hero-slide-content--brand' : ''}`}>
                  {slide.subheading ? (
                    <>
                      <h1>{slide.heading}</h1>
                      <p className="hero-slide-sub">{slide.subheading}</p>
                    </>
                  ) : (
                    <h1>{slide.heading}</h1>
                  )}
                  <p>{slide.text}</p>
                  <Link to={slide.link} className="btn btn-primary">
                    {slide.cta}
                  </Link>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        <button type="button" className="hero-nav hero-prev" aria-label="Previous slide">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <button type="button" className="hero-nav hero-next" aria-label="Next slide">
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </section>

      <section className="section collections">
        <div className="container">
          <div className="section-header">
            <p className="hallmark-tag">RadhaRani&apos;s Divinity</p>
            <h2>
              In every age, there is a muse who commands the heart. Ours is RADHA — sovereign of grace,
              keeper of beauty, and eternal embodiment of the DIVINE FEMININE.
            </h2>
            <p>
              She is the spirit that moves every creation in this House, where artistry is an offering
              and beauty a sacred inheritance. Gold, silver, and diamond are simply the language we
              speak, but devotion, allure, and feminine power are the essence we carry.
            </p>
          </div>
        </div>

        <div className="container radharas-block">
          <p className="hallmark-tag">Collections — RadhaRas</p>
          <div className="radharas-copy">
            <p>
              In the quiet forests of Vrindavan, within the stillness of Seva Kunj, love unfolded in
              secrecy. Beneath the cloak of night, Radha and Krishna met in hidden bowers where even time
              seemed to pause. There, Krishna was not only the divine enchanter but the eternal lover —
              placing pearls upon her, lifting jewels from the forest floor, weaving blossoms into her hair.
            </p>
            <p>
              Each act was worship, each touch an offering. Radha, luminous as the queen of rasa, received
              these treasures as the language of their love. What shimmered upon her was not silver alone,
              but devotion made visible, tenderness turned radiant.
            </p>
            <p>
              It is this sacred mystery that breathes through our latest collection — RadhaRas pieces
              intricate and luminous, as if brushed by eternal hands. To wear them is to carry a fragment
              of that night in Seva Kunj, where love revealed itself, gesture by gesture, into transcendence.
            </p>
          </div>
          <Link to="/category/collections" className="btn btn-primary radharas-cta">
            Shop RadhaRas
          </Link>
        </div>

        <div className="collection-showcase">
          <p className="collection-showcase-label container">Curated edits</p>
          <Swiper
            modules={[Autoplay, Navigation, Pagination, A11y]}
            grabCursor
            loop
            speed={600}
            spaceBetween={24}
            slidesPerView={1}
            autoplay={{ delay: 6500, disableOnInteraction: false, pauseOnMouseEnter: true }}
            navigation={{ nextEl: '.collection-next', prevEl: '.collection-prev' }}
            pagination={{ el: '.collection-pagination', clickable: true }}
            breakpoints={{
              768: { spaceBetween: 32 },
              1100: { spaceBetween: 40 },
            }}
            className="collection-swiper container"
          >
            {collections.map((col, idx) => {
              const imgSrc =
                typeof col.image === 'string' && col.image.startsWith('http')
                  ? col.image
                  : col.image;
              const optimized =
                typeof imgSrc === 'string' && imgSrc.startsWith('http') && imgSrc.includes('cloudinary')
                  ? getOptimizedImageUrl(imgSrc, 900, 1100)
                  : imgSrc;
              return (
                <SwiperSlide key={col.id}>
                  <article className="collection-card">
                    <div className="collection-card-media">
                      <img src={optimized} alt={col.title} loading="lazy" />
                      <div className="collection-card-media-overlay" />
                      <span className="collection-card-index">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="collection-card-body">
                      <span className="collection-card-kicker">House of Radha · 925 Silver</span>
                      <h3 className="collection-card-title">{col.title}</h3>
                      <p className="collection-card-desc">{col.description}</p>
                      <p className="collection-card-note">
                        Hand-finished in our atelier — heritage craft with a contemporary silhouette.
                      </p>
                      <Link to={col.link} className="collection-card-cta">
                        Explore collection
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </Link>
                    </div>
                  </article>
                </SwiperSlide>
              );
            })}
          </Swiper>

          <div className="collection-controls container">
            <button type="button" className="collection-nav collection-prev" aria-label="Previous collection">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="collection-pagination" />
            <button type="button" className="collection-nav collection-next" aria-label="Next collection">
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      <section className="section rakhi-spotlight">
        <div className="container rakhi-spotlight-inner">
          <div className="rakhi-spotlight-copy">
            <p className="hallmark-tag">House of Radha</p>
            <h2>Rakhis that last forever for bonds that are eternal.</h2>
            <p className="rakhi-spotlight-lead">Pure 92.5% silver Rakhis</p>
            <p className="rakhi-spotlight-stamp">Well stamped with 925 silver</p>
            <Link to="/category/rakhi" className="btn btn-primary">
              Shop Rakhi Collections
            </Link>
          </div>
          <div className="rakhi-spotlight-visual">
            <img src={rakhiHeroImg} alt="Pure silver Rakhi collection" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
