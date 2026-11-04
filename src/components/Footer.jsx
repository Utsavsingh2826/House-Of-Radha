import React from 'react';
import { Link } from 'react-router-dom';
import horLogo from '../assets/images/hor-logo.svg';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link to="/" className="footer-logo-link">
            <img src={horLogo} alt="" className="footer-logo-img" />
            <span className="footer-logo">HOUSE OF RADHA</span>
          </Link>
          <p className="footer-tagline">Devotion meets eternity</p>
          <p>
            Every piece of handcrafted jewellery will have 925 silver hallmarking. Quality and
            tradition in every sparkle.
          </p>
          <div className="social-links">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
              <span className="material-symbols-outlined">public</span> Instagram
            </a>
          </div>
        </div>

        <div className="footer-links">
          <h3>Shop</h3>
          <ul>
            <li><Link to="/category/women">Women</Link></li>
            <li><Link to="/category/men">Men</Link></li>
            <li><Link to="/category/rakhi">Rakhi Collections</Link></li>
            <li><Link to="/category/dainty">Dainty Collection</Link></li>
            <li><Link to="/category/temple">Temple Jewelry</Link></li>
          </ul>
        </div>

        <div className="footer-links">
          <h3>Support</h3>
          <ul>
            <li><Link to="/orders">Orders</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
            <li><Link to="/returns-refunds">Returns &amp; Refunds</Link></li>
            <li><Link to="/faq-silver">FAQs about silver jewellery</Link></li>
            <li><Link to="/returns-refunds">925 Hallmarking</Link></li>
          </ul>
        </div>

        <div className="footer-contact">
          <h3>Visit Us</h3>
          <p>
            <span className="material-symbols-outlined">location_on</span> Mumbai, India
          </p>
          <p>
            <span className="material-symbols-outlined">call</span>{' '}
            <a href="https://wa.me/917400181182">+91 7400 181 182</a>
          </p>
          <p>
            <span className="material-symbols-outlined">mail</span>{' '}
            <a href="mailto:support@houseofradha.com">support@houseofradha.com</a>
          </p>
        </div>
      </div>
      <div className="footer-bottom container">
        <p>&copy; {new Date().getFullYear()} House of Radha. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
