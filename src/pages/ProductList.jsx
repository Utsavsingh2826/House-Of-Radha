import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import './ProductList.css';

const ProductList = () => {
  const { id } = useParams();
  const [products, setProducts] = useState([]);
  const [categoryTitle, setCategoryTitle] = useState('Our Collection');

  const allProducts = [
    // Women - Dainty
    { id: 1, name: 'Chain with Pendant', category: 'dainty', price: '₹2,499', image: 'https://images.unsplash.com/photo-1599643478123-242f15110cb1?auto=format&fit=crop&q=80&w=600', collection: 'The Dainty & Modern' },
    { id: 2, name: 'Floating Solitaire', category: 'dainty', price: '₹4,999', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=600', collection: 'The Dainty & Modern' },
    { id: 3, name: 'Stackable Band', category: 'dainty', price: '₹1,299', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600', collection: 'The Dainty & Modern' },
    
    // Temple Jewelry
    { id: 4, name: 'Guttapusalu Necklace', category: 'temple', price: '₹12,499', image: 'https://images.unsplash.com/photo-1599643478123-242f15110cb1?auto=format&fit=crop&q=80&w=600', collection: 'The Temple Jewelry' },
    { id: 5, name: 'Lakshmi Choker', category: 'temple', price: '₹8,999', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=600', collection: 'The Temple Jewelry' },
    { id: 6, name: 'Traditional Jhumkas', category: 'temple', price: '₹3,499', image: 'https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&q=80&w=600', collection: 'The Temple Jewelry' },

    // Fusion
    { id: 7, name: 'Hasli Necklace', category: 'fusion', price: '₹5,499', image: 'https://images.unsplash.com/photo-1535633302703-942091448a52?auto=format&fit=crop&q=80&w=600', collection: 'The Fusion Collection' },
    { id: 8, name: 'Mandala Pendant Set', category: 'fusion', price: '₹2,999', image: 'https://images.unsplash.com/photo-1535633302703-942091448a52?auto=format&fit=crop&q=80&w=600', collection: 'The Fusion Collection' },
    
    // Men
    { id: 9, name: 'Hanuman Chalisa Kada', category: 'men', price: '₹3,999', image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=600', collection: "Men's Fashion" },
    { id: 10, name: 'Premium Brooch', category: 'men', price: '₹2,499', image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=600', collection: "Men's Fashion" },
  ];

  useEffect(() => {
    if (id) {
      setProducts(allProducts.filter(p => p.category === id));
      const titles = {
        dainty: 'The Dainty & Modern Collection',
        temple: 'The Temple Jewelry Collection',
        fusion: 'The Fusion Collection',
        men: "Men's Fashion",
        women: "Women's Jewelry"
      };
      setCategoryTitle(titles[id] || 'Our Collection');
    } else {
      setProducts(allProducts);
      setCategoryTitle('All Jewellery');
    }
    window.scrollTo(0, 0);
  }, [id]);

  return (
    <div className="product-page">
      <header className="page-header container">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          key={categoryTitle}
        >
          {categoryTitle}
        </motion.h1>
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
        <div className="product-grid">
          {products.map((product, index) => (
            <motion.div 
              key={product.id}
              className="product-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="product-img-wrapper">
                <img src={product.image} alt={product.name} />
                <button className="quick-add">Quick Add</button>
              </div>
              <div className="product-info">
                <span className="collection-tag">{product.collection}</span>
                <h3>{product.name}</h3>
                <p className="price">{product.price}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductList;
