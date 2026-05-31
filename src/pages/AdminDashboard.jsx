import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { getOptimizedImageUrl } from '../lib/cloudinary';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'products'

  // User list states
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Product states
  const [productsList, setProductsList] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [prodSku, setProdSku] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodGender, setProdGender] = useState('unisex');
  const [prodGenderLabel, setProdGenderLabel] = useState('');
  const [prodCategory, setProdCategory] = useState('Bracelet');
  const [prodSubcategory, setProdSubcategory] = useState('Band Bracelet');
  const [prodWeight, setProdWeight] = useState('');
  const [prodWeightLabel, setProdWeightLabel] = useState('');
  const [prodPriceRaw, setProdPriceRaw] = useState('');
  const [prodPriceAmount, setProdPriceAmount] = useState('');
  const [prodPriceDisplay, setProdPriceDisplay] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodKeywords, setProdKeywords] = useState('');
  const [prodImage, setProdImage] = useState('');
  const [prodImages, setProdImages] = useState([]);
  const [prodAvailable, setProdAvailable] = useState(true);
  const [prodFormError, setProdFormError] = useState('');
  const [prodFormSuccess, setProdFormSuccess] = useState('');
  const [prodSubmitting, setProdSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchProducts();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await api('/api/auth/admin-users', { auth: true });
      if (res.success) {
        setUsersList(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      // Fetch all products including unavailable ones
      const res = await api('/api/products?all=true', { auth: false });
      if (res.success) {
        setProductsList(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const resetProductForm = () => {
    setProdSku('');
    setProdName('');
    setProdGender('unisex');
    setProdGenderLabel('');
    setProdCategory('Bracelet');
    setProdSubcategory('Band Bracelet');
    setProdWeight('');
    setProdWeightLabel('');
    setProdPriceRaw('');
    setProdPriceAmount('');
    setProdPriceDisplay('');
    setProdDescription('');
    setProdKeywords('');
    setProdImage('');
    setProdImages([]);
    setProdAvailable(true);
    setProdFormError('');
    setIsEditing(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);

    try {
      const res = await api('/api/auth/admin-create-user', {
        method: 'POST',
        auth: true,
        body: {
          firstName,
          lastName,
          email,
          password,
          role,
        },
      });

      if (res.success) {
        setFormSuccess(`Successfully created new ${role}: ${firstName} ${lastName}`);
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        setRole('user');
        fetchUsers();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (e, isGallery = false) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    setProdFormError('');
    setProdFormSuccess('');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const res = await api('/api/products/upload', {
          method: 'POST',
          auth: true,
          body: { image: reader.result }
        });

        if (res.success) {
          if (isGallery) {
            setProdImages((prev) => [...prev, res.url]);
          } else {
            setProdImage(res.url);
            setProdImages((prev) => prev.length === 0 ? [res.url] : prev);
          }
          setProdFormSuccess('Image uploaded successfully to Cloudinary!');
        }
      } catch (err) {
        setProdFormError(err.message || 'Image upload failed');
      } finally {
        setUploadingImage(false);
      }
    };
  };

  const handleRemoveGalleryImage = (index) => {
    setProdImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setProdFormError('');
    setProdFormSuccess('');

    if (!prodSku) {
      setProdFormError('SKU is required');
      return;
    }
    if (!prodName) {
      setProdFormError('Product name is required');
      return;
    }
    if (prodPriceAmount === '') {
      setProdFormError('Price Amount is required');
      return;
    }

    setProdSubmitting(true);

    try {
      const priceAmt = parseInt(prodPriceAmount, 10);
      const displayPrice = prodPriceDisplay || `₹${(priceAmt / 100).toLocaleString('en-IN')}`;
      const rawPrice = prodPriceRaw || displayPrice;

      const payload = {
        sku: prodSku.trim().toUpperCase(),
        name: prodName.trim(),
        gender: prodGender,
        genderLabel: prodGenderLabel || prodGender.charAt(0).toUpperCase() + prodGender.slice(1),
        category: prodCategory.trim(),
        subcategory: prodSubcategory.trim(),
        weight: prodWeight ? parseFloat(prodWeight) : 0,
        weightLabel: prodWeightLabel || (prodWeight ? `${prodWeight}g` : ''),
        priceRaw: rawPrice,
        priceAmount: priceAmt,
        priceDisplay: displayPrice,
        description: prodDescription.trim(),
        keywords: prodKeywords.trim(),
        image: prodImage || (prodImages.length > 0 ? prodImages[0] : ''),
        images: prodImages,
        available: prodAvailable,
      };

      const res = await api('/api/products', {
        method: 'POST',
        auth: true,
        body: payload
      });

      if (res.success) {
        setProdFormSuccess(isEditing ? 'Product updated successfully!' : 'Product created successfully!');
        resetProductForm();
        fetchProducts();
      }
    } catch (err) {
      setProdFormError(err.message || 'Failed to save product');
    } finally {
      setProdSubmitting(false);
    }
  };

  const handleEditProduct = (prod) => {
    setProdSku(prod.sku);
    setProdName(prod.name);
    setProdGender(prod.gender || 'unisex');
    setProdGenderLabel(prod.genderLabel || '');
    setProdCategory(prod.category || 'Bracelet');
    setProdSubcategory(prod.subcategory || 'Band Bracelet');
    setProdWeight(prod.weight !== undefined ? prod.weight : '');
    setProdWeightLabel(prod.weightLabel || '');
    setProdPriceRaw(prod.priceRaw || '');
    setProdPriceAmount(prod.priceAmount !== undefined ? prod.priceAmount : '');
    setProdPriceDisplay(prod.priceDisplay || '');
    setProdDescription(prod.description || '');
    setProdKeywords(prod.keywords || '');
    setProdImage(prod.image || '');
    setProdImages(prod.images || []);
    setProdAvailable(prod.available !== false);
    setIsEditing(true);
    setProdFormError('');
    setProdFormSuccess('');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProduct = async (sku) => {
    if (!window.confirm(`Are you sure you want to permanently delete product ${sku}?`)) return;

    setProdFormError('');
    setProdFormSuccess('');

    try {
      const res = await api(`/api/products/${encodeURIComponent(sku)}`, {
        method: 'DELETE',
        auth: true
      });

      if (res.success) {
        setProdFormSuccess(`Product ${sku} deleted successfully.`);
        if (prodSku.toUpperCase() === sku.toUpperCase()) {
          resetProductForm();
        }
        fetchProducts();
      }
    } catch (err) {
      setProdFormError(err.message || 'Failed to delete product');
    }
  };

  return (
    <div className="admin-dashboard-page">
      <header className="admin-nav">
        <div className="admin-nav-container">
          <div className="brand">
            <span className="brand-logo">HOUSE OF RADHA</span>
            <span className="brand-sub">ADMIN CONTROL PANEL</span>
          </div>
          <div className="admin-profile">
            <span>Welcome, {user?.firstName} ({user?.role})</span>
            <button onClick={logout} className="admin-logout-link">
              <span className="material-symbols-outlined align-middle mr-1">logout</span>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="admin-main-content">
        <div className="admin-tabs">
          <button
            className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            User Directory
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Product Catalog
          </button>
        </div>

        {activeTab === 'users' ? (
          <div className="admin-grid">
            {/* User Creation Section */}
            <div className="admin-card admin-glassmorphic-card">
              <div className="card-header">
                <h3>Create User Account</h3>
                <p>Register new clients or administrative partners</p>
              </div>
              
              <form onSubmit={handleCreateUser} className="admin-form">
                {formError && <p className="admin-error-box">{formError}</p>}
                {formSuccess && <p className="admin-success-box">{formSuccess}</p>}

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-label">First Name</label>
                    <input
                      type="text"
                      className="admin-input-field"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Last Name</label>
                    <input
                      type="text"
                      className="admin-input-field"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Email Address</label>
                  <input
                    type="email"
                    className="admin-input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@email.com"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Password</label>
                  <input
                    type="password"
                    className="admin-input-field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Min 6 characters"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Account Role</label>
                  <select
                    className="admin-input-field"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="user">Standard User (Client)</option>
                    <option value="admin">Administrator (AdminUser)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="admin-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>
            </div>

            {/* User Management Directory */}
            <div className="admin-card admin-glassmorphic-card">
              <div className="card-header">
                <h3>System Directory</h3>
                <p>Registered customer database and team members</p>
              </div>

              {loadingUsers ? (
                <div className="admin-spinner-container">
                  <div className="admin-spinner"></div>
                </div>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Created Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((usr) => (
                        <tr key={usr.id || usr.email}>
                          <td className="user-name-cell">
                            {usr.firstName} {usr.lastName}
                          </td>
                          <td>{usr.email}</td>
                          <td>
                            <span className={`role-badge ${usr.role}`}>
                              {usr.role}
                            </span>
                          </td>
                          <td>{new Date(usr.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="admin-grid" style={{ gridTemplateColumns: '450px 1fr' }}>
            {/* Product Creation Section */}
            <div className="admin-card admin-glassmorphic-card">
              <div className="card-header">
                <h3>{isEditing ? 'Edit Product Details' : 'Create Product Catalog Item'}</h3>
                <p>{isEditing ? `Modifying SKU: ${prodSku}` : 'Add new hallmarked jewelry pieces to MongoDB'}</p>
              </div>
              
              <form onSubmit={handleSaveProduct} className="admin-form">
                {prodFormError && <p className="admin-error-box">{prodFormError}</p>}
                {prodFormSuccess && <p className="admin-success-box">{prodFormSuccess}</p>}

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-label">Product SKU *</label>
                    <input
                      type="text"
                      className="admin-input-field"
                      value={prodSku}
                      onChange={(e) => setProdSku(e.target.value)}
                      required
                      disabled={isEditing}
                      placeholder="e.g. BC-BN-018"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Product Name *</label>
                    <input
                      type="text"
                      className="admin-input-field"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      required
                      placeholder="e.g. Band Bracelet Royal"
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-label">Gender Category</label>
                    <select
                      className="admin-input-field"
                      value={prodGender}
                      onChange={(e) => setProdGender(e.target.value)}
                    >
                      <option value="unisex">Unisex</option>
                      <option value="female">Female (Women)</option>
                      <option value="male">Male (Men)</option>
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Gender Label (Optional)</label>
                    <input
                      type="text"
                      className="admin-input-field"
                      value={prodGenderLabel}
                      onChange={(e) => setProdGenderLabel(e.target.value)}
                      placeholder="e.g. Female / Male"
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-label">Category</label>
                    <input
                      type="text"
                      className="admin-input-field"
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      placeholder="e.g. Bracelet"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Subcategory</label>
                    <input
                      type="text"
                      className="admin-input-field"
                      value={prodSubcategory}
                      onChange={(e) => setProdSubcategory(e.target.value)}
                      placeholder="e.g. Band Bracelet"
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-label">Weight (grams)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="admin-input-field"
                      value={prodWeight}
                      onChange={(e) => setProdWeight(e.target.value)}
                      placeholder="e.g. 5.5"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Weight Label</label>
                    <input
                      type="text"
                      className="admin-input-field"
                      value={prodWeightLabel}
                      onChange={(e) => setProdWeightLabel(e.target.value)}
                      placeholder="e.g. 5.5g"
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Price Amount (in ₹ Paisa, e.g. 5000 for ₹50.00) *</label>
                  <input
                    type="number"
                    className="admin-input-field"
                    value={prodPriceAmount}
                    onChange={(e) => setProdPriceAmount(e.target.value)}
                    required
                    placeholder="e.g. 5000"
                  />
                  <span className="form-help-text">Standard integer representation (Amount = Rupees * 100)</span>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-label">Price Display String</label>
                    <input
                      type="text"
                      className="admin-input-field"
                      value={prodPriceDisplay}
                      onChange={(e) => setProdPriceDisplay(e.target.value)}
                      placeholder="e.g. P50 / ₹50"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Price Raw Value</label>
                    <input
                      type="text"
                      className="admin-input-field"
                      value={prodPriceRaw}
                      onChange={(e) => setProdPriceRaw(e.target.value)}
                      placeholder="e.g. P50"
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Description</label>
                  <textarea
                    className="admin-input-field"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    value={prodDescription}
                    onChange={(e) => setProdDescription(e.target.value)}
                    placeholder="Enter premium jewelry description details..."
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-label">Keywords (Comma separated)</label>
                  <input
                    type="text"
                    className="admin-input-field"
                    value={prodKeywords}
                    onChange={(e) => setProdKeywords(e.target.value)}
                    placeholder="e.g. Convenient, Festive, Pure"
                  />
                </div>

                {/* Main Image Upload Section */}
                <div className="admin-form-group">
                  <label className="admin-label">Main Image Upload (Cloudinary) *</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, false)}
                    disabled={uploadingImage}
                  />
                  {prodImage && (
                    <div className="image-upload-preview">
                      <img
                        src={getOptimizedImageUrl(prodImage, 100, 100)}
                        alt="Primary Product Preview"
                        className="preview-thumbnail"
                      />
                      <span className="form-help-text">Primary Catalog Image Loaded</span>
                    </div>
                  )}
                </div>

                {/* Gallery Images Upload Section */}
                <div className="admin-form-group">
                  <label className="admin-label">Additional Gallery Images</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true)}
                    disabled={uploadingImage}
                  />
                  {prodImages.length > 0 && (
                    <div className="preview-gallery">
                      {prodImages.map((imgUrl, index) => (
                        <div key={index} className="preview-gallery-item">
                          <img
                            src={getOptimizedImageUrl(imgUrl, 60, 60)}
                            alt={`Gallery Preview ${index}`}
                            className="preview-gallery-img"
                          />
                          <button
                            type="button"
                            className="remove-gallery-img-btn"
                            onClick={() => handleRemoveGalleryImage(index)}
                            title="Remove Image"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="admin-form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={prodAvailable}
                      onChange={(e) => setProdAvailable(e.target.checked)}
                    />
                    Mark Product as Available in Store Catalog
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    type="submit"
                    className="admin-submit-btn"
                    style={{ flex: 1, marginTop: 0 }}
                    disabled={prodSubmitting || uploadingImage}
                  >
                    {prodSubmitting ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      className="clear-btn"
                      onClick={resetProductForm}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Product Management Catalog */}
            <div className="admin-card admin-glassmorphic-card">
              <div className="card-header">
                <h3>Jewelry Inventory Directory</h3>
                <p>Total listed items: {productsList.length}</p>
              </div>

              {loadingProducts ? (
                <div className="admin-spinner-container">
                  <div className="admin-spinner"></div>
                </div>
              ) : productsList.length === 0 ? (
                <p className="form-help-text" style={{ textAlign: 'center', padding: '2rem' }}>
                  No products found in MongoDB.
                </p>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>SKU</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsList.map((prod) => (
                        <tr key={prod.sku}>
                          <td>
                            <img
                              src={getOptimizedImageUrl(prod.image, 50, 50) || '/placeholder-jewelry.svg'}
                              alt=""
                              className="product-thumbnail-cell"
                            />
                          </td>
                          <td className="user-name-cell">{prod.sku}</td>
                          <td>{prod.name}</td>
                          <td>{prod.priceDisplay || `₹${(prod.priceAmount / 100).toLocaleString('en-IN')}`}</td>
                          <td>
                            <span className={prod.available ? 'product-row-available' : 'product-row-unavailable'}>
                              {prod.available ? 'Available' : 'Draft'}
                            </span>
                          </td>
                          <td>
                            <div className="action-btn-group">
                              <button
                                type="button"
                                className="action-btn edit"
                                onClick={() => handleEditProduct(prod)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="action-btn delete"
                                onClick={() => handleDeleteProduct(prod.sku)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
