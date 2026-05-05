import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container nav-container">
        <div className="nav-left">
          <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <span className="material-symbols-outlined">
              {isMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
          <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
            <Link to="/category/women" onClick={() => setIsMenuOpen(false)}>Women</Link>
            <Link to="/category/men" onClick={() => setIsMenuOpen(false)}>Men</Link>
            <Link to="/category/collections" onClick={() => setIsMenuOpen(false)}>Collections</Link>
          </div>
        </div>

        <div className="nav-center">
          <Link to="/" className="logo">
            HOUSE OF RADHA
          </Link>
        </div>

        <div className="nav-right">
          <button className="nav-icon">
            <span className="material-symbols-outlined">search</span>
          </button>
          <Link to="/login" className="nav-icon">
            <span className="material-symbols-outlined">person</span>
          </Link>
          <button className="nav-icon cart-icon">
            <span className="material-symbols-outlined">shopping_bag</span>
            <span className="cart-count">0</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
