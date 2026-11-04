import React from 'react';
import { Link } from 'react-router-dom';
import './PolicyPage.css';

const FaqSilver = () => (
  <div className="policy-page">
    <div className="container">
      <header className="policy-header">
        <h1>FAQs about silver jewellery</h1>
        <p className="policy-intro">
          Quick answers about 925 silver, care, and what to expect from House of Radha pieces.
        </p>
      </header>
      <div className="policy-content">
        <section>
          <h2>Is your jewellery real silver?</h2>
          <p>
            Yes. Every piece is crafted in <strong>92.5% sterling silver</strong> and hallmark stamped
            where applicable, as noted on the product page.
          </p>
        </section>
        <section>
          <h2>Will silver tarnish?</h2>
          <p>
            Sterling silver may develop a natural patina over time. Store pieces dry, avoid harsh
            chemicals, and polish gently with a soft cloth. See our{' '}
            <Link to="/returns-refunds">care &amp; returns</Link> page for more.
          </p>
        </section>
        <section>
          <h2>Questions about an order?</h2>
          <p>
            Reach us on WhatsApp at +91 7400 181 182 or email{' '}
            <a href="mailto:support@houseofradha.com">support@houseofradha.com</a>.
          </p>
        </section>
      </div>
    </div>
  </div>
);

export default FaqSilver;
