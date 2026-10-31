import React from 'react';
import { Link } from 'react-router-dom';
import './PolicyPage.css';

const WHATSAPP = '917400181182';
const WHATSAPP_DISPLAY = '+91 7400 181 182';

const Contact = () => {
  return (
    <div className="policy-page">
      <div className="container">
        <header className="policy-header">
          <h1>Contact us</h1>
          <p className="policy-intro">
            We&apos;re here to help with orders, exchanges, returns, and product questions.
          </p>
        </header>

        <div className="policy-content">
          <div className="contact-cards">
            <div className="contact-card">
              <h3>WhatsApp / Call</h3>
              <p>
                <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">
                  {WHATSAPP_DISPLAY}
                </a>
              </p>
            </div>
            <div className="contact-card">
              <h3>Email</h3>
              <p>
                <a href="mailto:support@houseofradha.com">support@houseofradha.com</a>
              </p>
              <p>
                For exchanges, you may also write to{' '}
                <a href="mailto:contact@houseofradha.com">contact@houseofradha.com</a>.
              </p>
            </div>
          </div>

          <section style={{ marginTop: '2.5rem' }}>
            <h2>Policies</h2>
            <p>
              Read our{' '}
              <Link to="/returns-refunds">Exchange, Return &amp; Refund Policy</Link>, including
              information on taxes for India and international shipping.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Contact;
