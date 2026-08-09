import React from 'react';
import './BeforeWeMelt.css';

const BeforeWeMelt = () => {
    return (
        <div className="melt-page">
            <div className="container melt-container">
                <div className="melt-image-wrapper">
                    <div className="melt-image-placeholder">
                        <span>Silver jewellery creation photo — coming soon</span>
                    </div>
                </div>
                <div className="melt-content">
                    <p className="hallmark-tag">Before We Melt</p>
                    <p className="melt-text">
                        One of the best things about gold and silver is that their value never fades.
                        They can always be melted, refined, and given new life.
                    </p>
                    <p className="melt-text">
                        We're currently clearing space for upcoming collections and saying goodbye to
                        a few designs. But we'd love for them to find a home in your jewelry box before
                        they go to the melting pot.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BeforeWeMelt;
