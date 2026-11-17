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
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
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
      <div className="nav-container container">
        <button
          type="button"
          className="menu-toggle nav-icon"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span className="material-symbols-outlined">{isMenuOpen ? 'close' : 'menu'}</span>
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
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsCollectionsOpen(false);
                }}
              >
                All Collections
              </Link>
              <Link
                to="/category/rakhi"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsCollectionsOpen(false);
                }}
              >
                Rakhi
              </Link>
            </div>
          </div>
          <Link to="/before-we-melt" onClick={() => setIsMenuOpen(false)}>Before We Melt</Link>
        </div>

        <Link to="/" className="logo logo-hor" aria-label="House of Radha home">
          HOUSE OF RADHA
        </Link>

        <div className="nav-right">
          <Link to="/category/collections" className="nav-icon" aria-label="Search collections">
            <span className="material-symbols-outlined">search</span>
          </Link>

          {user ? (
            <div className="user-menu-dropdown">
              {user.role === 'admin' && (
                <Link to="/admin/dashboard" className="nav-icon admin-nav-text" title="Dashboard">
                  <span className="material-symbols-outlined">dashboard</span>
                  <span className="admin-nav-label">Dashboard</span>
                </Link>
              )}
              <Link to="/profile" className="nav-icon" title="Profile">
                <span className="material-symbols-outlined">person</span>
              </Link>
              <Link to="/profile" className="user-name">
                Hi, {user.firstName}
              </Link>
              <Link to="/orders" className="nav-icon" title="Orders">
                <span className="material-symbols-outlined">receipt_long</span>
              </Link>
              <button type="button" className="logout-btn nav-icon" onClick={logout} title="Logout">
                <span className="material-symbols-outlined">logout</span>
                <span className="logout-text">Logout</span>
              </button>
            </div>
          ) : (
            <Link to="/login" className="nav-icon" title="Sign in">
              <span className="material-symbols-outlined">person</span>
            </Link>
          )}

          <Link to="/cart" className="nav-icon cart-icon" aria-label="Cart">
            <span className="material-symbols-outlined">shopping_bag</span>
            {count > 0 && <span className="cart-count">{count}</span>}
          </Link>
        </div>
      </div>
      {isMenuOpen && <div className="nav-overlay" onClick={() => setIsMenuOpen(false)} aria-hidden />}
    </nav>
  );
};

export default Navbar;
