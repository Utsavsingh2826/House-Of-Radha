import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFlip, Navigation, Pagination, Keyboard } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-flip';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './Home.css';
import heroImg from '../assets/images/hero.png';
import templeImg from '../assets/images/temple.png';

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
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Handcrafted Elegance in 925 Silver
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Discover the House of Radha. Where tradition meets modern craftsmanship.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Link to="/products" className="btn btn-primary">Shop Collection</Link>
          </motion.div>
        </div>
        <div className="hero-image-container">
          <img src={heroImg} alt="Jewelry Hero" className="hero-img" />
        </div>
      </section>

      {/* Collections Section */}
      <section className="section collections">
        <div className="container">
          <div className="section-header">
            <h2>Explore Our Collections</h2>
            <p>Every piece of handcrafted jewellery will have 925 silver hallmarking.</p>
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
              <p>Premium Silver Kadas, Brooches, and more.</p>
              <Link to="/category/men" className="text-link">
                Explore Men's Collection <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
            </div>
            <div className="featured-image">
               <img src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=1000" alt="Men's Jewelry" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
