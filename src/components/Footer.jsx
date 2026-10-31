import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <h2 className="footer-logo">HOUSE OF RADHA</h2>
          <p>Every piece of handcrafted jewellery will have 925 silver hallmarking. Quality and tradition in every sparkle.</p>
          <div className="social-links">
            <a href="#"><span className="material-symbols-outlined">public</span> Instagram</a>
          </div>
        </div>

        <div className="footer-links">
          <h3>Shop</h3>
          <ul>
            <li><a href="/category/women">Women</a></li>
            <li><a href="/category/men">Men</a></li>
            <li><a href="/category/dainty">Dainty Collection</a></li>
            <li><a href="/category/temple">Temple Jewelry</a></li>
          </ul>
        </div>

        <div className="footer-links">
          <h3>Support</h3>
          <ul>
            <li><Link to="/orders">Orders</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
            <li><Link to="/returns-refunds">Returns &amp; Refunds</Link></li>
            <li><a href="#">Care Guide</a></li>
            <li><a href="#">925 Hallmarking</a></li>
          </ul>
        </div>

        <div className="footer-contact">
          <h3>Visit Us</h3>
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
