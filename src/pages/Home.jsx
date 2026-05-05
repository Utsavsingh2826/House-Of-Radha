import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
          
          <div className="collections-grid">
            {collections.map((col, index) => (
              <motion.div 
                key={col.id} 
                className="collection-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <div className="collection-img-wrapper">
                  <img src={col.image} alt={col.title} />
                  <div className="collection-overlay">
                    <Link to={col.link} className="btn btn-outline">View Collection</Link>
                  </div>
                </div>
                <div className="collection-info">
                  <h3>{col.title}</h3>
                  <p>{col.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
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
