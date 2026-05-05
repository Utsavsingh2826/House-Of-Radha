import React from 'react';
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
            <a href="#"><span className="material-symbols-outlined">share</span> Facebook</a>
            <a href="#"><span className="material-symbols-outlined">alternate_email</span> Twitter</a>
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
            <li><a href="#">Contact Us</a></li>
            <li><a href="#">Shipping & Returns</a></li>
            <li><a href="#">Care Guide</a></li>
            <li><a href="#">925 Hallmarking</a></li>
          </ul>
        </div>

        <div className="footer-contact">
          <h3>Visit Us</h3>
          <p><span className="material-symbols-outlined">location_on</span> 123 Luxury Lane, Jewelry District</p>
          <p><span className="material-symbols-outlined">call</span> +91 98765 43210</p>
          <p><span className="material-symbols-outlined">mail</span> care@houseofradha.com</p>
        </div>
      </div>
      <div className="footer-bottom container">
        <p>&copy; {new Date().getFullYear()} House of Radha. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
