import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Navbar.css';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const { user, logout } = useAuth();
  const { count } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isCollectionsOpen) return;
    const closeDropdown = () => setIsCollectionsOpen(false);
    document.addEventListener('click', closeDropdown);
    return () => document.removeEventListener('click', closeDropdown);
  }, [isCollectionsOpen]);

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
            <div className="nav-dropdown" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="nav-dropdown-toggle"
                onClick={() => setIsCollectionsOpen((v) => !v)}
                aria-expanded={isCollectionsOpen}
              >
                Collections
                <span className="material-symbols-outlined nav-dropdown-caret">
                  {isCollectionsOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              <div className={`nav-dropdown-menu ${isCollectionsOpen ? 'open' : ''}`}>
                <Link
                  to="/category/collections"
                  onClick={() => { setIsMenuOpen(false); setIsCollectionsOpen(false); }}
                >
                  All Collections
                </Link>
                <Link
                  to="/category/rakhi"
                  onClick={() => { setIsMenuOpen(false); setIsCollectionsOpen(false); }}
                >
                  Rakhi
                </Link>
              </div>
            </div>
            <Link to="/before-we-melt" onClick={() => setIsMenuOpen(false)}>Before We Melt</Link>
          </div>
          {isMenuOpen && <div className="nav-overlay" onClick={() => setIsMenuOpen(false)} />}
        </div>

        <div className="nav-center">
          <Link to="/" className="logo">
            HOUSE OF RADHA
          </Link>
        </div>

        <div className="nav-right">
          <button className="nav-icon" aria-label="Search">
            <span className="material-symbols-outlined">search</span>
          </button>

          {user ? (
            <div className="user-menu-dropdown">
              {user.role === 'admin' && (
                <Link to="/admin/dashboard" className="admin-nav-link nav-icon" title="Admin Dashboard">
                  <span className="material-symbols-outlined">dashboard</span>
                  <span className="admin-nav-text">Dashboard</span>
                </Link>
              )}
              <Link to="/profile" className="nav-icon" aria-label="My profile" title="My profile">
                <span className="material-symbols-outlined">person</span>
              </Link>
              <Link to="/profile" className="user-name">Hi, {user.firstName}</Link>
              <Link to="/orders" className="nav-icon" aria-label="My orders" title="My orders">
                <span className="material-symbols-outlined">receipt_long</span>
              </Link>
              <button onClick={logout} className="logout-btn" aria-label="Log out">
                <span className="material-symbols-outlined">logout</span>
                <span className="logout-text">Logout</span>
              </button>
            </div>
          ) : (
            <Link to="/login" className="nav-icon" aria-label="Sign in">
              <span className="material-symbols-outlined">person</span>
            </Link>
          )}

          <Link to="/cart" className="nav-icon cart-icon" aria-label="Bag">
            <span className="material-symbols-outlined">shopping_bag</span>
            {count > 0 && <span className="cart-count">{count}</span>}
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
