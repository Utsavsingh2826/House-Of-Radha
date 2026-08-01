import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { requireAuth } from '../lib/requireAuth';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import './ProductDetail.css';

const ProductDetail = () => {
    const { sku } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { addToCart, loading: cartLoading } = useCart();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedImg, setSelectedImg] = useState(0);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [sku]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        api(`/api/products/${encodeURIComponent(sku)}`, { auth: false })
            .then((res) => {
                setProduct(res?.data ?? null);
                setSelectedImg(0);
            })
            .catch((err) => {
                setError(err.message || 'Failed to load product');
            })
            .finally(() => setLoading(false));
    }, [sku]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 1800);
        return () => clearTimeout(t);
    }, [toast]);

    const handleAddToCart = async () => {
        if (!user) {
            requireAuth(navigate, location, { action: 'addToCart', sku });
            return;
        }
        const result = await addToCart(sku, 1);
        setToast(result.success ? 'Added to bag ✓' : (result.error || 'Failed'));
    };

    const handleBuyNow = () => {
        if (!user) {
            requireAuth(navigate, location, { action: 'buyNow', sku });
            return;
        }
        navigate(`/checkout?buyNow=${encodeURIComponent(sku)}&qty=1`);
    };

    if (loading) {
        return (
            <div className="pd-page container">
                <p className="pd-state">Loading product…</p>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="pd-page container">
                <p className="pd-state">{error || 'Product not found.'}</p>
                <button className="pd-back-btn" onClick={() => navigate(-1)}>← Go back</button>
            </div>
        );
    }

    const images = Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : product.image
            ? [product.image]
            : [];

    return (
        <div className="pd-page">
            <div className="container pd-container">
                {/* ---- Gallery ---- */}
                <div className="pd-gallery">
                    <motion.div
                        className="pd-main-img-wrapper"
                        key={selectedImg}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.35 }}
                    >
                        {images.length > 0 ? (
                            <img
                                src={getOptimizedImageUrl(images[selectedImg], 800, 800)}
                                alt={product.name}
                            />
                        ) : (
                            <div className="pd-no-image">No image available</div>
                        )}
                    </motion.div>

                    {images.length > 1 && (
                        <div className="pd-thumbnails">
                            {images.map((img, idx) => (
                                <button
                                    key={idx}
                                    className={`pd-thumb${idx === selectedImg ? ' active' : ''}`}
                                    onClick={() => setSelectedImg(idx)}
                                    aria-label={`View image ${idx + 1}`}
                                >
                                    <img src={getOptimizedImageUrl(img, 120, 120)} alt="" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ---- Info ---- */}
                <div className="pd-info">
                    <span className="pd-breadcrumb" onClick={() => navigate(-1)}>
                        ← Back
                    </span>

                    <span className="pd-meta-tag">
                        {product.gender === 'female' ? 'Women' : product.gender === 'male' ? 'Men' : 'Unisex'}
                        {product.category ? ` · ${product.category.trim()}` : ''}
                        {product.subcategory ? ` · ${product.subcategory.trim()}` : ''}
                    </span>

                    <h1 className="pd-name">{product.name}</h1>
                    <p className="pd-sku">SKU: {product.sku}</p>

                    <div className="pd-price-row">
                        <span className="pd-price">{product.priceDisplay || 'Price on request'}</span>
                        {product.weightLabel && (
                            <span className="pd-weight">{product.weightLabel}</span>
                        )}
                    </div>

                    {product.description && (
                        <p className="pd-description">{product.description}</p>
                    )}

                    <div className="pd-cta">
                        <button
                            className="pd-cart-btn"
                            onClick={handleAddToCart}
                            disabled={cartLoading}
                        >
                            {cartLoading ? 'Adding…' : 'Add to Cart'}
                        </button>
                        <button className="pd-buy-btn" onClick={handleBuyNow}>
                            Buy Now
                        </button>
                    </div>

                    {toast && <p className="pd-toast">{toast}</p>}

                    <div className="pd-hallmark">
                        <span>925 Sterling Silver · Hallmarked</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
