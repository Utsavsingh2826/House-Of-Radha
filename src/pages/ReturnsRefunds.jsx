import React from 'react';
import { Link } from 'react-router-dom';
import './PolicyPage.css';

const WHATSAPP = '917400181182';
const WHATSAPP_DISPLAY = '+91 7400 181 182';

const ReturnsRefunds = () => {
  return (
    <div className="policy-page">
      <div className="container">
        <header className="policy-header">
          <h1>Exchange, Return &amp; Refund Policy</h1>
          <p className="policy-intro">
            At House of Radha, your satisfaction is our priority. We want you to feel confident when
            you shop with us, so we offer easy and transparent exchange and return options.
          </p>
        </header>

        <div className="policy-content">
          <section>
            <h2>Exchange policy</h2>
            <p>Exchange requests can be placed within <strong>7 days</strong> of delivery.</p>
            <p>
              <strong>Eligibility:</strong> Items must be unused, unworn, and returned in original
              packaging with all tags intact.
            </p>
            <p>
              <strong>Exchange charges:</strong> The paid amount will be adjusted against your
              replacement product. A nominal <strong>₹150 transit fee</strong> will be deducted.
            </p>
            <p>
              <strong>How to initiate:</strong> Contact us on{' '}
              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">
                WhatsApp ({WHATSAPP_DISPLAY})
              </a>{' '}
              or email{' '}
              <a href="mailto:contact@houseofradha.com">contact@houseofradha.com</a>, and our team
              will guide you through the exchange process.
            </p>
          </section>

          <section>
            <h2>Refund policy</h2>
            <p>
              We offer returns only in the form of <strong>store credit</strong> of the full amount
              to use on any future purchase. Store credit includes only the product fees and does
              not include other fees such as gift wrap, shipping, cash on delivery, or custom duty
              charges—those are non-refundable.
            </p>
            <p>
              No transit or processing fee applies when you choose store credit.
            </p>
            <p>
              <strong>Complete refunds</strong> are applicable only in limited cases:
            </p>
            <ul>
              <li>The order is out of stock</li>
              <li>The order is not delivered</li>
            </ul>
            <p>
              <strong>Processing time:</strong> Refunds are initiated within{' '}
              <strong>7 business days</strong>. For prepaid orders, the refund is credited to the
              original payment source. For COD orders, refunds are made only to the bank account of
              the individual whose name appears on the billing details.
            </p>
          </section>

          <section>
            <h2>Refund &amp; exchange eligibility</h2>
            <ul>
              <li>
                Items must be unused, unworn, and returned in their original packaging with tags
                intact.
              </li>
              <li>Personalised or customised items are not eligible for refund or exchange.</li>
            </ul>
          </section>

          <section>
            <h2>How to initiate a return or exchange</h2>
            <p>Contact us via:</p>
            <ul>
              <li>
                Email:{' '}
                <a href="mailto:support@houseofradha.com">support@houseofradha.com</a>
              </li>
              <li>
                WhatsApp:{' '}
                <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">
                  {WHATSAPP_DISPLAY}
                </a>
              </li>
            </ul>
            <p>
              Our support team will help arrange a pickup and guide you through the process.
            </p>
          </section>

          <section>
            <h2>Taxes &amp; duties</h2>
            <p>
              Taxes and duties are included in the product price listed on the website for
              deliveries in <strong>India</strong>.
            </p>
            <p>
              <strong>International deliveries:</strong> For deliveries outside India, customs
              duties and local taxes, if applicable, must be paid by customers to our shipping
              partner at the time of delivery. The amount of duties and taxes depends on the
              policies of your destination country.
            </p>
            <p>
              Questions? Visit our <Link to="/contact">Contact</Link> page or reach us on WhatsApp
              at {WHATSAPP_DISPLAY}.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReturnsRefunds;
