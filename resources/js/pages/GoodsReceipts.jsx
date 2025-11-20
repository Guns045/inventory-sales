import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, Alert, Badge } from 'react-bootstrap';
import { useAPI } from '../contexts/APIContext';
import { usePermissions } from '../contexts/PermissionContext';
import './GoodsReceipts.css';

const GoodsReceipts = () => {
  const { get, post, put, delete: deleteRequest } = useAPI();
  const { user } = usePermissions();
  const { hasPermission, canRead, canCreate, canUpdate, canDelete } = usePermissions();

  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGoodsReceipt, setSelectedGoodsReceipt] = useState(null);
  const [receiptItems, setReceiptItems] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: 0,
    to: 0
  });
  const [formData, setFormData] = useState({
    purchase_order_id: '',
    warehouse_id: '',
    received_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [newItem, setNewItem] = useState({
    purchase_order_item_id: '',
    product_id: '',
    quantity_ordered: 0,
    quantity_received: 0,
    unit_price: 0,
    condition: 'GOOD',
    batch_number: ''
  });

  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Fetch goods receipts from API
  useEffect(() => {
    fetchGoodsReceipts();
    fetchPurchaseOrders();
    fetchWarehouses();
  }, []);

  // Close product suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProductSuggestions && !event.target.closest('.position-relative')) {
        setShowProductSuggestions(false);
        setProductSearch('');
        setSelectedItemIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProductSuggestions]);

  const fetchGoodsReceipts = async (page = 1) => {
    try {
      setLoading(true);
      setError('');
      const response = await get(`/goods-receipts?page=${page}`);
      if (response && response.data) {
        if (response.data.data) {
          setGoodsReceipts(response.data.data);
          setPagination({
            current_page: response.data.current_page,
            last_page: response.data.last_page,
            per_page: response.data.per_page,
            total: response.data.total,
            from: response.data.from,
            to: response.data.to
          });
        } else {
          const goodsReceiptsData = Array.isArray(response.data) ? response.data : [];
          setGoodsReceipts(goodsReceiptsData);
        }
      }
    } catch (err) {
      console.error('Error fetching goods receipts:', err);
      setError('Failed to fetch goods receipts');
      setGoodsReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await get('/purchase-orders/ready-for-goods-receipt');
      if (response && response.data) {
        setPurchaseOrders(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      console.error('Error fetching purchase orders:', err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await get('/warehouses');
      if (response && response.data) {
        setWarehouses(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      console.error('Error fetching warehouses:', err);
    }
  };

  const fetchProducts = async (searchTerm = '') => {
    try {
      setLoadingProducts(true);
      const response = await get(`/products?search=${searchTerm}&limit=20`);
      if (response && response.data) {
        setProducts(Array.isArray(response.data.data) ? response.data.data : []);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      // Try alternative endpoint if main one fails
      try {
        const altResponse = await get(`/settings/raw-products/search?search=${searchTerm}&limit=20`);
        if (altResponse && altResponse.data) {
          setProducts(Array.isArray(altResponse.data.data) ? altResponse.data.data : []);
        }
      } catch (altErr) {
        console.error('Error fetching raw products:', altErr);
        setProducts([]);
      }
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleProductSearch = (searchTerm, index) => {
    setProductSearch(searchTerm);
    setSelectedItemIndex(index);
    if (searchTerm.length >= 2) {
      fetchProducts(searchTerm);
      setShowProductSuggestions(true);
    } else {
      setShowProductSuggestions(false);
      setProducts([]);
    }
  };

  const handleProductSelect = (product, index) => {
    const updatedItems = [...items];
    const currentQuantity = updatedItems[index].quantity_received || 0;
    const unitPrice = product.price || 0;

    updatedItems[index] = {
      ...updatedItems[index],
      product_id: product.id,
      product_name: product.name,
      product_uom: product.uom || 'pcs',
      unit_price: unitPrice,
      line_total: currentQuantity * unitPrice
    };
    setItems(updatedItems);
    setShowProductSuggestions(false);
    setProductSearch('');
    setSelectedItemIndex(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePurchaseOrderChange = (poId) => {
    const selectedPO = purchaseOrders.find(po => po.id === parseInt(poId));
    setFormData(prev => ({
      ...prev,
      purchase_order_id: poId,
      warehouse_id: selectedPO?.warehouse_id || prev.warehouse_id
    }));

    if (selectedPO) {
      // Pre-fill items from PO
      const poItems = selectedPO.items.map(item => ({
        purchase_order_item_id: item.id,
        product_id: item.product_id,
        quantity_ordered: item.quantity_ordered || item.quantity,
        quantity_received: item.quantity_ordered || item.quantity, // Default to full quantity
        unit_price: item.unit_price,
        line_total: (item.quantity_ordered || item.quantity) * item.unit_price,
        condition: 'GOOD',
        batch_number: '',
        product_name: item.product?.name || 'Unknown Product',
        product_uom: item.product?.uom || 'pcs'
      }));
      setItems(poItems);
    } else {
      setItems([]);
    }
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };

    // Recalculate line total if quantity or price changed
    if (field === 'quantity_received' || field === 'unit_price') {
      updatedItems[index].line_total = (updatedItems[index].quantity_received || 0) * (updatedItems[index].unit_price || 0);
    }

    setItems(updatedItems);
  };

  const handleAddItem = () => {
    if (formData.purchase_order_id) {
      const selectedPO = purchaseOrders.find(po => po.id === parseInt(formData.purchase_order_id));
      if (selectedPO && selectedPO.items) {
        const availableItems = selectedPO.items.filter(poItem =>
          !items.find(item => item.purchase_order_item_id === poItem.id)
        );

        if (availableItems.length > 0) {
          const firstAvailable = availableItems[0];
          const newItem = {
            purchase_order_item_id: firstAvailable.id,
            product_id: firstAvailable.product_id,
            quantity_ordered: firstAvailable.quantity_ordered || firstAvailable.quantity,
            quantity_received: firstAvailable.quantity_ordered || firstAvailable.quantity,
            unit_price: firstAvailable.unit_price,
            line_total: (firstAvailable.quantity_ordered || firstAvailable.quantity) * firstAvailable.unit_price,
            condition: 'GOOD',
            batch_number: '',
            product_name: firstAvailable.product?.name || 'Unknown Product',
            product_uom: firstAvailable.product?.uom || 'pcs'
          };
          setItems([...items, newItem]);
        }
      }
    }
  };

  const handleRemoveItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const handleCreateGoodsReceipt = async (e) => {
    e.preventDefault();

    if (items.length === 0) {
      setError('Please add at least one item to the goods receipt');
      return;
    }

    try {
      const response = await post('/goods-receipts', {
        ...formData,
        items: items.map(item => ({
          purchase_order_item_id: item.purchase_order_item_id,
          product_id: item.product_id,
          quantity_ordered: item.quantity_ordered,
          quantity_received: item.quantity_received,
          unit_price: item.unit_price,
          condition: item.condition,
          batch_number: item.batch_number || null
        }))
      });

      if (response.data) {
        setSuccess('Goods receipt created successfully!');
        setFormData({
          purchase_order_id: '',
          warehouse_id: '',
          received_date: new Date().toISOString().split('T')[0],
          notes: ''
        });
        setItems([]);
        setShowCreateForm(false);
        fetchGoodsReceipts();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error creating goods receipt:', err);
      setError('Failed to create goods receipt');
      setSuccess('');
    }
  };

  const handleViewItems = async (receipt) => {
    setSelectedGoodsReceipt(receipt);
    try {
      const response = await get(`/goods-receipts/${receipt.id}/items`);
      if (response && response.data) {
        setReceiptItems(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      console.error('Error fetching receipt items:', err);
      setError('Failed to fetch receipt items');
    }
  };

  const handleReceiveGoods = async (id) => {
    if (!window.confirm('Are you sure you want to receive these goods? This will update stock levels.')) {
      return;
    }

    try {
      await post(`/goods-receipts/${id}/receive`);
      setSuccess('Goods received successfully!');
      fetchGoodsReceipts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error receiving goods:', err);
      setError('Failed to receive goods');
      setSuccess('');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this goods receipt?')) {
      return;
    }

    try {
      await deleteRequest(`/goods-receipts/${id}`);
      setSuccess('Goods receipt deleted successfully!');
      fetchGoodsReceipts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting goods receipt:', err);
      setError('Failed to delete goods receipt');
      setSuccess('');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'PENDING': { bg: 'warning', text: 'Pending' },
      'RECEIVED': { bg: 'success', text: 'Received' },
      'REJECTED': { bg: 'danger', text: 'Rejected' }
    };

    const config = statusConfig[status] || { bg: 'secondary', text: status };
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const getConditionBadge = (condition) => {
    const conditionConfig = {
      'GOOD': { bg: 'success', text: 'Good' },
      'DAMAGED': { bg: 'warning', text: 'Damaged' },
      'DEFECTIVE': { bg: 'danger', text: 'Defective' },
      'WRONG_ITEM': { bg: 'info', text: 'Wrong Item' }
    };

    const config = conditionConfig[condition] || { bg: 'secondary', text: condition };
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === '' || isNaN(Number(amount))) {
      return 'Rp 0';
    }
    const numericAmount = Number(amount);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(numericAmount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();

      return `${day}-${month}-${year}`;
    } catch (error) {
      return dateString; // Return original if error
    }
  };

  const canEditReceipt = (receipt) => {
    return hasPermission('goods-receipts.update') && receipt.status === 'PENDING';
  };

  const canDeleteReceipt = (receipt) => {
    return hasPermission('goods-receipts.delete') && receipt.status === 'PENDING';
  };

  const canReceiveGoods = (receipt) => {
    return hasPermission('goods-receipts.update') && receipt.status === 'PENDING';
  };

  const renderPagination = () => {
    if (pagination.last_page <= 1) return null;

    const pages = [];
    const currentPage = pagination.current_page;
    const lastPage = pagination.last_page;

    // Show limited page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(lastPage, currentPage + 2);

    if (currentPage <= 3) {
      endPage = Math.min(5, lastPage);
    }

    if (currentPage >= lastPage - 2) {
      startPage = Math.max(1, lastPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === currentPage ? "primary" : "outline-primary"}
          size="sm"
          className="me-1"
          onClick={() => fetchGoodsReceipts(i)}
        >
          {i}
        </Button>
      );
    }

    return (
      <div className="d-flex justify-content-center align-items-center mt-3">
        <Button
          variant="outline-primary"
          size="sm"
          className="me-2"
          disabled={currentPage <= 1}
          onClick={() => fetchGoodsReceipts(currentPage - 1)}
        >
          Previous
        </Button>
        {pages}
        <Button
          variant="outline-primary"
          size="sm"
          className="ms-2"
          disabled={currentPage >= lastPage}
          onClick={() => fetchGoodsReceipts(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading goods receipts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="goods-receipts">
      <Container fluid>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-1">Goods Receipts</h2>
            <p className="text-muted mb-0">
              Showing {pagination.from || 0} to {pagination.to || 0} of {pagination.total} goods receipts
            </p>
          </div>
          <div>
            {hasPermission('goods-receipts.create') && (
              <Button
                variant="primary"
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="d-flex align-items-center"
              >
                <i className={`bi ${showCreateForm ? 'bi-x-lg' : 'bi-plus-lg'} me-2`}></i>
                {showCreateForm ? 'Cancel' : 'Create Goods Receipt'}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} role="alert">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess('')} role="alert">
            {success}
          </Alert>
        )}

        {showCreateForm && (
          <div className="form-container">
            <h2>Add New Goods Receipt</h2>
            <Form onSubmit={handleCreateGoodsReceipt}>
              {/* Simple Header Section */}
              <div className="form-row">
                <div className="form-group">
                  <Form.Label>Purchase Order:</Form.Label>
                  <Form.Select
                    name="purchase_order_id"
                    value={formData.purchase_order_id}
                    onChange={(e) => handlePurchaseOrderChange(e.target.value)}
                    required
                  >
                    <option value="">Select Purchase Order</option>
                    {purchaseOrders.map(po => (
                      <option key={po.id} value={po.id}>
                        {po.po_number} - {po.supplier?.name || 'Unknown Supplier'} ({formatCurrency(po.total_amount)})
                      </option>
                    ))}
                  </Form.Select>
                </div>
                <div className="form-group">
                  <Form.Label>Deliver To:</Form.Label>
                  <Form.Select
                    name="warehouse_id"
                    value={formData.warehouse_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </Form.Select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <Form.Label>Received Date:</Form.Label>
                  <Form.Control
                    type="date"
                    name="received_date"
                    value={formData.received_date}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <Form.Label>Notes:</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={1}
                    placeholder="Enter notes about this goods receipt..."
                  />
                </div>
              </div>

                            {/* Order Items Table */}
              <div className="form-group" style={{marginTop: '2rem'}}>
                <h3>Order Items</h3>

                {/* Items Table */}
                {items.length > 0 && (
                  <div className="table-container" style={{marginTop: '1rem', marginBottom: '1rem'}}>
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th width="25%">Product</th>
                          <th width="10%">Qty Ordered</th>
                          <th width="10%">Qty Received</th>
                          <th width="15%">Unit Price</th>
                          <th width="15%" className="text-end">Line Total</th>
                          <th width="10%">Condition</th>
                          <th width="8%">Batch #</th>
                            <th width="5%">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={index}>
                            <td>
                              <strong>{item.product_name}</strong><br/>
                              <small>ID: {item.product_id}</small>
                            </td>
                            <td>{item.quantity_ordered}</td>
                            <td>
                              <Form.Control
                                type="number"
                                value={item.quantity_received}
                                onChange={(e) => handleItemChange(index, 'quantity_received', parseInt(e.target.value) || 0)}
                                size="sm"
                                min="0"
                                max={item.quantity_ordered}
                              />
                            </td>
                            <td>{formatCurrency(item.unit_price)}</td>
                            <td className="text-end">{formatCurrency(item.line_total)}</td>
                            <td>
                              <Form.Select
                                value={item.condition}
                                onChange={(e) => handleItemChange(index, 'condition', e.target.value)}
                                size="sm"
                              >
                                <option value="GOOD">Good</option>
                                <option value="DAMAGED">Damaged</option>
                                <option value="DEFECTIVE">Defective</option>
                                <option value="WRONG_ITEM">Wrong Item</option>
                              </Form.Select>
                            </td>
                            <td>
                              <Form.Control
                                type="text"
                                value={item.batch_number || ''}
                                onChange={(e) => handleItemChange(index, 'batch_number', e.target.value)}
                                placeholder="Batch #"
                                size="sm"
                              />
                            </td>
                              <td>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}

                {/* Totals Section */}
                {items.length > 0 && (
                  <div className="table-container" style={{marginTop: '1rem'}}>
                    <Table size="sm">
                      <tbody>
                        <tr className="table-primary fw-bold">
                          <td width="75%" className="text-end">Total:</td>
                          <td width="25%" className="text-end">
                            {formatCurrency(items.reduce((sum, item) => sum + (Number(item.line_total) || 0), 0))}
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>
                )}

                {items.length === 0 && (
                  <Alert variant="info">
                    <i className="bi bi-info-circle me-2"></i>
                    Select a purchase order to automatically add items.
                  </Alert>
                )}
              </div>

              <div className="form-actions" style={{marginTop: '2rem'}}>
                <Button type="submit" variant="success" disabled={items.length === 0}>
                  Create
                </Button>
                <Button type="button" variant="secondary" onClick={() => {
                  setShowCreateForm(false);
                  setFormData({
                    purchase_order_id: '',
                    warehouse_id: '',
                    received_date: new Date().toISOString().split('T')[0],
                    notes: ''
                  });
                  setItems([]);
                  setError('');
                }}>
                  Cancel
                </Button>
              </div>
            </Form>
          </div>
        )}

        <Card className="table-container">
          <Card.Body>
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>GR Number</th>
                    <th>Purchase Order</th>
                    <th>Supplier</th>
                    <th>Warehouse</th>
                    <th>Status</th>
                    <th>Received Date</th>
                    <th>Total Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {goodsReceipts.map((receipt) => (
                    <tr key={receipt.id}>
                      <td className="fw-medium">{receipt.receipt_number}</td>
                      <td>{receipt.purchase_order?.po_number || 'N/A'}</td>
                      <td>{receipt.purchase_order?.supplier?.name || 'N/A'}</td>
                      <td>{receipt.warehouse?.name || 'N/A'}</td>
                      <td>{getStatusBadge(receipt.status)}</td>
                      <td>{formatDate(receipt.receipt_date)}</td>
                      <td className="text-end">{formatCurrency(receipt.total_amount)}</td>
                      <td>
                        <div className="btn-group" role="group">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleViewItems(receipt)}
                            title="View Items"
                          >
                            <i className="bi bi-eye"></i>
                          </Button>
                          {canReceiveGoods(receipt) && (
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleReceiveGoods(receipt.id)}
                              title="Receive Goods"
                            >
                              <i className="bi bi-check-circle"></i>
                            </Button>
                          )}
                          {canDeleteReceipt(receipt) && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(receipt.id)}
                              title="Delete"
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>

        {/* View Items Section */}
        {selectedGoodsReceipt && receiptItems.length > 0 && (
          <Card className="mt-4">
            <Card.Header className="bg-info text-white">
              <i className="bi bi-eye me-2"></i>
              Goods Receipt Items - {selectedGoodsReceipt.receipt_number}
            </Card.Header>
            <Card.Body>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity Ordered</th>
                    <th>Quantity Received</th>
                    <th>Unit Price</th>
                    <th>Line Total</th>
                    <th>Condition</th>
                    <th>Batch Number</th>
                    </tr>
                </thead>
                <tbody>
                  {receiptItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="fw-medium">{item.product?.name || 'N/A'}</div>
                        {item.batch_number && (
                          <small className="text-muted">Batch: {item.batch_number}</small>
                        )}
                      </td>
                      <td>{item.quantity_ordered}</td>
                      <td>{item.quantity_received}</td>
                      <td>{formatCurrency(item.unit_price)}</td>
                      <td className="text-end">{formatCurrency(item.line_total)}</td>
                      <td>{getConditionBadge(item.condition)}</td>
                      <td>{item.batch_number || '-'}</td>
                      </tr>
                  ))}
                  <tr className="table-primary fw-bold">
                    <td colSpan={4} className="text-end">Total:</td>
                    <td className="text-end">
                      {formatCurrency(receiptItems.reduce((sum, item) => sum + (Number(item.line_total) || 0), 0))}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tbody>
              </Table>
              <div className="d-flex justify-content-end">
                <Button variant="secondary" onClick={() => {
                  setSelectedGoodsReceipt(null);
                  setReceiptItems([]);
                }}>
                  Close
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}

        {renderPagination()}
      </Container>
    </div>
  );
};

export default GoodsReceipts;