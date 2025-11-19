import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Form, Dropdown, InputGroup } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';
import './SelectProduct.css';

const SelectProduct = ({ value, onChange, onProductSelect, disabled = false, placeholder = "Search product by part number or name..." }) => {
  const { api } = useAPI();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const searchRef = useRef(null);

  useEffect(() => {
    if (value && value !== '') {
      fetchProductDetails(value);
    } else {
      setSelectedProduct(null);
      setSearchTerm('');
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    const handlePositionUpdate = () => {
      if (showDropdown) {
        calculateDropdownPosition();
      }
    };

    const handleScroll = () => {
      if (showDropdown) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handlePositionUpdate);
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handlePositionUpdate);
      document.removeEventListener('scroll', handleScroll);
    };
  }, [showDropdown]);

  const fetchProductDetails = async (productId) => {
    try {
      const response = await api.get(`/products/${productId}`);
      if (response && response.data) {
        const product = response.data;
        setSelectedProduct(product);
        setSearchTerm(`${product.sku || product.part_number || 'NO-SKU'} - ${product.description || product.name}`);
      }
    } catch (err) {
      console.error('Error fetching product details:', err);
    }
  };

  const calculateDropdownPosition = () => {
    if (searchRef.current) {
      const rect = searchRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      setDropdownPosition({
        top: rect.bottom + scrollTop,
        left: rect.left + scrollLeft,
        width: rect.width
      });
    }
  };

  const searchProducts = async (term) => {
    if (!term || term.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/products?search=${term}&per_page=50`);
      if (response && response.data) {
        const productsData = response.data.data || response.data;
        const productsArray = Array.isArray(productsData) ? productsData : [];
        setSuggestions(productsArray);

        if (productsArray.length > 0) {
          calculateDropdownPosition();
          setShowDropdown(true);
        } else {
          setShowDropdown(false);
        }
      }
    } catch (err) {
      console.error('Error searching products:', err);
      setSuggestions([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (term.length === 0) {
      setSelectedProduct(null);
      onChange({ target: { name: 'product_id', value: '' } });
      setShowDropdown(false);
    }

    const timeoutId = setTimeout(() => {
      searchProducts(term);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setSearchTerm(`${product.sku || product.part_number || 'NO-SKU'} - ${product.description || product.name}`);
    setShowDropdown(false);
    onChange({
      target: {
        name: 'product_id',
        value: product.id
      }
    });

    // Callback untuk mengupdate data lain saat produk dipilih
    if (onProductSelect) {
      onProductSelect(product);
    }
  };

  const handleClear = () => {
    setSelectedProduct(null);
    setSearchTerm('');
    setShowDropdown(false);
    onChange({ target: { name: 'product_id', value: '' } });
  };

  return (
    <div ref={searchRef} className="product-select-container position-relative">
      <InputGroup>
        <Form.Control
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className="product-search-input"
          onFocus={(e) => {
            if (searchTerm.length >= 2) {
              searchProducts(searchTerm);
            }
          }}
        />
        {searchTerm && (
          <InputGroup.Text
            onClick={handleClear}
            style={{ cursor: 'pointer', backgroundColor: '#f8f9fa' }}
            title="Clear selection"
          >
            ×
          </InputGroup.Text>
        )}
      </InputGroup>
    </div>
  );

  // Render dropdown using React Portal to escape container overflow
  const dropdown = showDropdown && suggestions.length > 0 ? createPortal(
    <div
      className="product-suggestions-dropdown"
      style={{
        position: 'fixed',
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        maxHeight: '300px',
        overflowY: 'auto',
        zIndex: 99999,
        backgroundColor: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '0.375rem',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        padding: '0.5rem 0'
      }}
    >
      {loading ? (
        <div
          className="dropdown-item disabled"
          style={{
            padding: '0.5rem 1rem',
            color: '#6c757d',
            fontSize: '0.85rem'
          }}
        >
          <em>Searching...</em>
        </div>
      ) : (
        suggestions.map((product, index) => (
          <div
            key={product.id}
            onClick={() => handleProductSelect(product)}
            className="product-suggest-item"
            style={{
              fontSize: '0.85rem',
              padding: '0.5rem 1rem',
              borderBottom: index < suggestions.length - 1 ? '1px solid #f8f9fa' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div className="fw-semibold">
              {product.sku || product.part_number || 'NO-SKU'}
            </div>
            <div className="text-muted small">
              {product.description || product.name}
            </div>
            <div className="text-primary small fw-bold">
              Rp {new Intl.NumberFormat('id-ID').format(product.buy_price || 0)}
            </div>
          </div>
        ))
      )}
      {!loading && suggestions.length === 0 && searchTerm.length >= 2 && (
        <div
          className="dropdown-item disabled"
          style={{
            padding: '0.5rem 1rem',
            color: '#6c757d',
            fontSize: '0.85rem'
          }}
        >
          <em>No products found</em>
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <>
      {component}
      {dropdown}
    </>
  );
};

export default SelectProduct;