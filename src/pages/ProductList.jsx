import React, { useMemo, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { requireAuth } from '../lib/requireAuth';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import './ProductList.css';

const CATEGORY_TITLES = {
  women: { title: "Women's Jewellery", subtitle: 'Hand-finished pieces, designed to be worn every day' },
  men: { title: "Men's Fashion", subtitle: 'Premium silver kadas, bracelets and statement pieces' },
  collections: { title: 'All Collections', subtitle: 'The complete House of Radha edit' },
  dainty: { title: 'The Dainty & Modern', subtitle: 'Office wear, party, mostly diamonds' },
  temple: { title: 'The Temple Jewelry', subtitle: 'Brides, festive shoppers, traditionalists' },
  fusion: { title: 'The Fusion Collection', subtitle: 'Oxidized & Ethnic Silver' },
  rakhi: { title: 'Rakhi Collection', subtitle: 'Special festive rakhi designs with matching charm stories' },
};

const filterByRoute = (id, products) => {
  const available = products.filter((p) => p.available && Number(p.priceAmount) > 0);
  if (!id) return available;
  switch (id) {
    case 'women':
      return available.filter((p) => p.gender === 'female');
    case 'men':
      return available.filter((p) => p.gender === 'male');
    case 'rakhi':
      return available.filter((p) => String(p.category || '').toUpperCase() === 'RAKHI');
    case 'collections':
      return available;
    default:
      return available;
  }
};

const ProductList = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addToCart, loading: cartLoading } = useCart();

  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const products = useMemo(
    () => filterByRoute(id, allProducts),
    [id, allProducts]
  );
  const meta = CATEGORY_TITLES[id] ?? { title: 'All Jewellery', subtitle: '925 silver hallmarked' };

  // Per-card transient toast: { sku, message }.
  const [toast, setToast] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setLoadingProducts(true);
    setFetchError(null);
    api('/api/products', { auth: false })
      .then((res) => {
        if (cancelled) return;
        setAllProducts(Array.isArray(res?.data) ? res.data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setFetchError(err.message || 'Failed to load products');
        setAllProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  const handleAddToCart = async (e, sku) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await addToCart(sku, 1);
    setToast({
      sku,
      message: result.success ? 'Added to bag' : (result.error || 'Failed'),
    });
  };

  const handleBuyNow = (e, sku) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      requireAuth(navigate, location, { action: 'buyNow', sku });
      return;
    }
    navigate(`/checkout?buyNow=${encodeURIComponent(sku)}&qty=1`);
  };

  return (
    <div className="product-page">
      <header className="page-header container">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          key={meta.title}
        >
          {meta.title}
        </motion.h1>
        <p className="page-subtitle">{meta.subtitle}</p>
        <p className="hallmark-tag">925 Silver Hallmarked</p>
      </header>

      <div className="filter-bar sticky">
        <div className="container filter-container">
          <div className="filter-left">
            <button className="filter-btn">
              <span className="material-symbols-outlined">filter_list</span> Filters
            </button>
            <span className="product-count">{products.length} products</span>
          </div>
          <div className="filter-right">
            <button className="sort-btn">
              Sort by: Featured <span className="material-symbols-outlined">expand_more</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container section">
        {loadingProducts ? (
          <p className="empty-state">Loading products...</p>
        ) : fetchError ? (
          <p className="empty-state">Could not load products: {fetchError}</p>
        ) : products.length === 0 ? (
          <p className="empty-state">No products available in this category yet.</p>
        ) : (
          <div className="product-grid">
            {products.map((product, index) => (
              <motion.article
                key={product.sku}
                className="product-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/products/${encodeURIComponent(product.sku)}`} className="product-card-link">
                  <div className="product-img-wrapper">
                    <img src={getOptimizedImageUrl(product.image, 500, 500)} alt={product.name} loading="lazy" />
                    {Array.isArray(product.images) && product.images.length > 1 && product.images[1] && (
                      <img
                        src={getOptimizedImageUrl(product.images[1], 500, 500)}
                        alt=""
                        aria-hidden="true"
                        className="product-img-alt"
                        loading="lazy"
                      />
                    )}

                    <div className="card-cta">
                      <button
                        type="button"
                        className="add-cart-btn"
                        disabled={cartLoading}
                        onClick={(e) => handleAddToCart(e, product.sku)}
                      >
                        Add to Cart
                      </button>
                      <button
                        type="button"
                        className="buy-now-btn"
                        onClick={(e) => handleBuyNow(e, product.sku)}
                      >
                        Buy Now
                      </button>
                    </div>

                    {toast && toast.sku === product.sku && (
                      <span className="card-toast">{toast.message}</span>
                    )}

                    {product.subcategory && product.subcategory !== 'Band Bracelet' && (
                      <span className="product-tag">{product.subcategory}</span>
                    )}
                  </div>
                  <div className="product-info">
                    <span className="collection-tag">
                      {product.gender === 'female' ? 'Women' : product.gender === 'male' ? 'Men' : 'Unisex'} &middot; {product.category}
                    </span>
                    <h3>{product.name}</h3>
                    <div className="product-meta-row">
                      <span className="price">{product.priceDisplay}</span>
                    </div>
                    <span className="product-sku">{product.sku}</span>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;
