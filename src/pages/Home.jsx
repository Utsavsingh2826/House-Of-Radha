import React from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFlip, Navigation, Pagination, Keyboard } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-flip';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './Home.css';
import heroImg from '../assets/images/hero.png';
import templeImg from '../assets/images/temple.png';
import rakhiHeroImg from '../assets/images/rakhi-hero.png';
import jewelryCloseupImg from '../assets/images/jewelry-closeup.png';
import necklaceTempleImg from '../assets/images/necklace-temple.png';

// Matches the 4-slide hero banner spec from the WEBSITE CHANGES deck.
// "sister" has no client-supplied photo yet — using heroImg as a placeholder
// until that image arrives.
const HERO_SLIDES = [
  {
    id: 'rakhi',
    image: rakhiHeroImg,
    heading: 'Iss Saal Bhai Ki Chandi Hai!',
    text: 'Shop our pure 925 silver Rakhi collection. 10% off on your first order.',
    cta: 'Shop Rakhi Collection',
    link: '/category/rakhi',
  },
  {
    id: 'sister',
    image: heroImg,
    heading: 'Gifts for Sister That Grow in Value, Devotion & Memory',
    text: "She won't fight about this with you!",
    cta: 'Shop Gifts for Sister & Bhabhis',
    link: '/category/women',
  },
  {
    id: 'brother',
    image: jewelryCloseupImg,
    heading: 'Dapper & Dripping in Silver!',
    text: 'For the Brother Who Deserves Nothing Less Than Extraordinary. Gift him fine silver accessories that bring sophistication to every celebration and carry sentimental value for a lifetime.',
    cta: 'Shop Gifts for Brother',
    link: '/category/men',
  },
  {
    id: 'brand',
    image: necklaceTempleImg,
    heading: 'Jewellery That Speaks to the Soul',
    text: 'Inspired by the divine, eternal love of Radha and Krishna, we bring you heritage-rich craftsmanship with contemporary design.',
    cta: 'Shop Our Collection',
    link: '/category/collections',
  },
];

const Home = () => {
  const collections = [
    {
      id: 'dainty',
      title: 'The Dainty & Modern',
      description: 'Office wear, party, mostly diamonds',
      image: heroImg,
      link: '/category/dainty'
    },
    {
      id: 'temple',
      title: 'The Temple Jewelry',
      description: 'Brides, Festive shoppers, Traditionalists',
      image: templeImg,
      link: '/category/temple'
    },
    {
      id: 'fusion',
      title: 'The Fusion Collection',
      description: 'Oxidized / Ethnic Silver',
      image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=1000',
      link: '/category/fusion'
    }
  ];

  return (
    <div className="home">
      {/* Hero Section — 4-slide banner carousel per WEBSITE CHANGES deck */}
      <section className="hero">
        <Swiper
          modules={[Autoplay, Navigation, Pagination]}
          autoplay={{ delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true }}
          navigation={{ nextEl: '.hero-next', prevEl: '.hero-prev' }}
          pagination={{ clickable: true }}
          loop
          className="hero-swiper"
        >
          {HERO_SLIDES.map((slide) => (
            <SwiperSlide key={slide.id}>
              <div className="hero-slide">
                <div className="hero-slide-bg" style={{ backgroundImage: `url(${slide.image})` }} />
                <div className="hero-slide-scrim" />
                <div className="hero-slide-content">
                  <h1>{slide.heading}</h1>
                  <p>{slide.text}</p>
                  <Link to={slide.link} className="btn btn-primary">{slide.cta}</Link>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        <button className="hero-nav hero-prev" aria-label="Previous slide">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <button className="hero-nav hero-next" aria-label="Next slide">
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </section>

      {/* Collections Section — header replaced with RadhaRani's Divinity text (no image) */}
      <section className="section collections">
        <div className="container">
          <div className="section-header">
            <p className="hallmark-tag">RadhaRani's Divinity</p>
            <h2>
              In every age, there is a muse who commands the heart. Ours is RADHA — sovereign
              of grace, keeper of beauty, and eternal embodiment of the divine feminine.
            </h2>
            <p>
              She is the spirit that moves every creation in this House, where artistry is an
              offering and beauty a sacred inheritance. Gold, silver, and diamond are simply
              the language we speak, but devotion, allure, and feminine power are the essence
              we carry.
            </p>
          </div>
        </div>

        <div className="mag-slider-wrapper">
          <Swiper
            modules={[Autoplay, EffectFlip, Navigation, Pagination, Keyboard]}
            effect="flip"
            flipEffect={{ slideShadows: true, limitRotation: true }}
            grabCursor
            loop
            speed={1300}
            keyboard={{ enabled: true }}
            autoplay={{ delay: 7500, disableOnInteraction: false, pauseOnMouseEnter: true }}
            navigation={{ nextEl: '.mag-next', prevEl: '.mag-prev' }}
            pagination={{
              el: '.mag-pagination',
              clickable: true,
              renderBullet: (index, className) =>
                `<button class="${className}" aria-label="Go to spread ${index + 1}"><span class="mag-bullet-num">0${index + 1}</span></button>`,
            }}
            className="mag-swiper"
          >
            {collections.map((col, idx) => {
              const firstLetter = (col.title.replace(/^The\s+/i, '') || col.title).charAt(0);
              return (
                <SwiperSlide key={col.id} className="mag-slide">
                  <div className="mag-spread">
                    <div className="mag-page mag-page-left">
                      <div className="mag-page-corner mag-page-corner-tl">
                        <span>Issue</span>
                        <strong>{String(idx + 1).padStart(2, '0')}</strong>
                      </div>
                      <div className="mag-page-corner mag-page-corner-tr">
                        <span>Page</span>
                        <strong>{String((idx + 1) * 2 - 1).padStart(3, '0')}</strong>
                      </div>

                      <div className="mag-article">
                        <span className="mag-kicker">Spring / Summer 2026 &mdash; Edition</span>
                        <h3 className="mag-headline">{col.title}</h3>
                        <span className="mag-byline">
                          <span className="mag-byline-line" />
                          Curated by House of Radha
                        </span>
                        <p className="mag-body">
                          <span className="mag-dropcap">{firstLetter}</span>
                          {col.description}. Every piece in this edition is hand-finished in our atelier &mdash; a study in restraint, intention, and the quiet luxury of 925 silver, born of tradition and rendered for the modern wardrobe.
                        </p>
                        <blockquote className="mag-quote">
                          &ldquo;Heirlooms are not bought. They are inherited &mdash; one piece, one moment, one story at a time.&rdquo;
                        </blockquote>
                        <Link to={col.link} className="mag-cta">
                          <span className="mag-cta-line" />
                          <span>Continue Reading</span>
                          <span className="material-symbols-outlined">arrow_forward</span>
                        </Link>
                      </div>

                      <div className="mag-page-corner mag-page-corner-bl">
                        <span>House of Radha &middot; Vol. III</span>
                      </div>
                      <div className="mag-page-corner mag-page-corner-br">
                        <span>{col.id.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="mag-spine" aria-hidden="true" />

                    <div className="mag-page mag-page-right">
                      <div className="mag-photo" style={{ backgroundImage: `url(${col.image})` }} />
                      <div className="mag-photo-caption">
                        <span>Fig. {String(idx + 1).padStart(2, '0')}</span>
                        <span className="mag-photo-caption-sep" />
                        <span>{col.title}</span>
                      </div>
                      <div className="mag-page-corner mag-page-corner-tr mag-corner-light">
                        <span>Page</span>
                        <strong>{String((idx + 1) * 2).padStart(3, '0')}</strong>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>

          <button className="mag-nav mag-prev" aria-label="Previous spread">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <button className="mag-nav mag-next" aria-label="Next spread">
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>

          <div className="mag-pagination" />
        </div>
      </section>

      {/* Featured Products Sneak Peek */}
      <section className="section bg-soft featured">
        <div className="container">
          <div className="featured-flex">
            <div className="featured-text">
              <h2>Men's Fashion</h2>
              <p>Premium silver kadas, brooches, and more.</p>
              <Link to="/category/men" className="text-link">
                Explore Men's Collection <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
            <div className="featured-image">
               <img src={jewelryCloseupImg} alt="Men's silver jewellery" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
