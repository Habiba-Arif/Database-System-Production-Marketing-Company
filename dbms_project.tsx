import React, { useState, useEffect } from 'react';
import { Package, ShoppingCart, FileText, Trash2, Download, Plus, Edit, Save, X, Search, Database, TrendingUp } from 'lucide-react';

const DBMS = () => {
  const [activeTab, setActiveTab] = useState('database');
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form states
  const [productForm, setProductForm] = useState({
    id: '',
    name: '',
    category: '',
    price: '',
    stock: '',
    description: ''
  });

  const [saleForm, setSaleForm] = useState({
    productId: '',
    quantity: '',
    customerName: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Load data from storage on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const productsData = await window.storage.get('products');
      const salesData = await window.storage.get('sales');
      const invoicesData = await window.storage.get('invoices');
      
      if (productsData) setProducts(JSON.parse(productsData.value));
      if (salesData) setSales(JSON.parse(salesData.value));
      if (invoicesData) setInvoices(JSON.parse(invoicesData.value));
    } catch (error) {
      console.log('Initializing new database');
    }
  };

  const saveData = async (type, data) => {
    try {
      await window.storage.set(type, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const handleAddProduct = async () => {
    if (!productForm.name || !productForm.price || !productForm.stock) {
      alert('Please fill all required fields');
      return;
    }

    const newProduct = {
      ...productForm,
      id: editingProduct ? editingProduct.id : Date.now().toString(),
      price: parseFloat(productForm.price),
      stock: parseInt(productForm.stock)
    };

    let updatedProducts;
    if (editingProduct) {
      updatedProducts = products.map(p => p.id === editingProduct.id ? newProduct : p);
    } else {
      updatedProducts = [...products, newProduct];
    }

    setProducts(updatedProducts);
    await saveData('products', updatedProducts);
    
    setProductForm({ id: '', name: '', category: '', price: '', stock: '', description: '' });
    setEditingProduct(null);
    setActiveTab('database');
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm(product);
    setActiveTab('add');
  };

  const handleDeleteRecord = async (type, id) => {
    if (!isAuthorized) {
      alert('Authorization required to delete records');
      return;
    }

    if (!confirm('Are you sure you want to delete this record?')) return;

    if (type === 'product') {
      const updated = products.filter(p => p.id !== id);
      setProducts(updated);
      await saveData('products', updated);
    } else if (type === 'sale') {
      const updated = sales.filter(s => s.id !== id);
      setSales(updated);
      await saveData('sales', updated);
    } else if (type === 'invoice') {
      const updated = invoices.filter(i => i.id !== id);
      setInvoices(updated);
      await saveData('invoices', updated);
    }
  };

  const handleAddSale = async () => {
    if (!saleForm.productId || !saleForm.quantity || !saleForm.customerName) {
      alert('Please fill all required fields');
      return;
    }

    const product = products.find(p => p.id === saleForm.productId);
    if (!product) {
      alert('Product not found');
      return;
    }

    const quantity = parseInt(saleForm.quantity);
    if (quantity > product.stock) {
      alert('Insufficient stock');
      return;
    }

    const totalAmount = product.price * quantity;
    const saleId = Date.now().toString();

    const newSale = {
      id: saleId,
      productId: product.id,
      productName: product.name,
      quantity,
      customerName: saleForm.customerName,
      date: saleForm.date,
      unitPrice: product.price,
      totalAmount
    };

    const newInvoice = {
      id: `INV-${saleId}`,
      saleId,
      customerName: saleForm.customerName,
      date: saleForm.date,
      items: [{
        productName: product.name,
        quantity,
        unitPrice: product.price,
        total: totalAmount
      }],
      totalAmount,
      status: 'Paid'
    };

    // Update stock
    const updatedProducts = products.map(p => 
      p.id === product.id ? { ...p, stock: p.stock - quantity } : p
    );

    const updatedSales = [...sales, newSale];
    const updatedInvoices = [...invoices, newInvoice];

    setProducts(updatedProducts);
    setSales(updatedSales);
    setInvoices(updatedInvoices);

    await saveData('products', updatedProducts);
    await saveData('sales', updatedSales);
    await saveData('invoices', updatedInvoices);

    setSaleForm({ productId: '', quantity: '', customerName: '', date: new Date().toISOString().split('T')[0] });
    setActiveTab('sales');
  };

  const handleAuthorization = () => {
    if (password === 'admin123') {
      setIsAuthorized(true);
      alert('Authorization successful');
    } else {
      alert('Invalid password');
    }
    setPassword('');
  };

  const generateReport = () => {
    const filtered = searchTerm 
      ? products.filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.category.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : products;

    const totalProducts = filtered.length;
    const totalStock = filtered.reduce((sum, p) => sum + p.stock, 0);
    const totalValue = filtered.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);

    const report = `
DATABASE MANAGEMENT SYSTEM - REPORT
Generated: ${new Date().toLocaleString()}
Search Term: ${searchTerm || 'All Records'}

INVENTORY SUMMARY:
- Total Products: ${totalProducts}
- Total Stock Units: ${totalStock}
- Total Inventory Value: $${totalValue.toFixed(2)}

SALES SUMMARY:
- Total Sales Transactions: ${sales.length}
- Total Revenue: $${totalSales.toFixed(2)}

PRODUCT DETAILS:
${filtered.map(p => `
Product: ${p.name}
Category: ${p.category}
Price: $${p.price}
Stock: ${p.stock} units
Value: $${(p.price * p.stock).toFixed(2)}
`).join('\n')}
    `;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${Date.now()}.txt`;
    a.click();
  };

  const filteredProducts = searchTerm
    ? products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : products;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-10 h-10 text-indigo-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Database Management System</h1>
                <p className="text-gray-600">Production & Marketing Company</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-semibold text-green-600">● Connected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6 p-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('database')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                activeTab === 'database' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Database className="w-5 h-5" />
              Main Database
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                activeTab === 'add' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Plus className="w-5 h-5" />
              Add/Edit Product
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                activeTab === 'sales' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              Sales Department
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                activeTab === 'invoices' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-5 h-5" />
              Invoice Department
            </button>
            <button
              onClick={() => setActiveTab('remove')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                activeTab === 'remove' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Trash2 className="w-5 h-5" />
              Remove Records
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Main Database Tab */}
          {activeTab === 'database' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Product Database</h2>
                <div className="flex gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                  <button
                    onClick={generateReport}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    <Download className="w-5 h-5" />
                    Generate Report
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg">
                  <p className="text-sm opacity-90">Total Products</p>
                  <p className="text-3xl font-bold">{products.length}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg">
                  <p className="text-sm opacity-90">Total Sales</p>
                  <p className="text-3xl font-bold">{sales.length}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg">
                  <p className="text-sm opacity-90">Total Revenue</p>
                  <p className="text-3xl font-bold">${sales.reduce((sum, s) => sum + s.totalAmount, 0).toFixed(2)}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Price</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Stock</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{product.id}</td>
                        <td className="px-4 py-3 text-sm font-medium">{product.name}</td>
                        <td className="px-4 py-3 text-sm">{product.category}</td>
                        <td className="px-4 py-3 text-sm">${product.price}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded ${product.stock < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{product.description}</td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredProducts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No products found. Add your first product to get started.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add/Edit Product Tab */}
          {activeTab === 'add' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Name *</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <input
                    type="text"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter category"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity *</label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    rows="3"
                    placeholder="Enter product description"
                  />
                </div>
                <div className="md:col-span-2 flex gap-3">
                  <button
                    onClick={handleAddProduct}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
                  >
                    <Save className="w-5 h-5" />
                    {editingProduct ? 'Update Product' : 'Add Product'}
                  </button>
                  {editingProduct && (
                    <button
                      onClick={() => {
                        setEditingProduct(null);
                        setProductForm({ id: '', name: '', category: '', price: '', stock: '', description: '' });
                      }}
                      className="flex items-center gap-2 bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition"
                    >
                      <X className="w-5 h-5" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sales Department Tab */}
          {activeTab === 'sales' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Sales Department</h2>
              
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold mb-4">Create New Sale</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Product *</label>
                    <select
                      value={saleForm.productId}
                      onChange={(e) => setSaleForm({ ...saleForm, productId: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Choose a product</option>
                      {products.filter(p => p.stock > 0).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} (${p.price}) - Stock: {p.stock}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                    <input
                      type="number"
                      value={saleForm.quantity}
                      onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                    <input
                      type="text"
                      value={saleForm.customerName}
                      onChange={(e) => setSaleForm({ ...saleForm, customerName: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={saleForm.date}
                      onChange={(e) => setSaleForm({ ...saleForm, date: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button
                      onClick={handleAddSale}
                      className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Process Sale
                    </button>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-4">Sales History</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sale ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Quantity</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Unit Price</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{sale.id}</td>
                        <td className="px-4 py-3 text-sm font-medium">{sale.productName}</td>
                        <td className="px-4 py-3 text-sm">{sale.customerName}</td>
                        <td className="px-4 py-3 text-sm">{sale.quantity}</td>
                        <td className="px-4 py-3 text-sm">${sale.unitPrice}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-600">${sale.totalAmount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm">{sale.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sales.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No sales recorded yet. Process your first sale to get started.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Invoice Department Tab */}
          {activeTab === 'invoices' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Invoice Department</h2>
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{invoice.id}</h3>
                        <p className="text-gray-600">Customer: {invoice.customerName}</p>
                        <p className="text-sm text-gray-500">Date: {invoice.date}</p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                        {invoice.status}
                      </span>
                    </div>
                    <div className="border-t pt-4">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Product</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Quantity</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Unit Price</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoice.items.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 text-sm">{item.productName}</td>
                              <td className="px-4 py-2 text-sm">{item.quantity}</td>
                              <td className="px-4 py-2 text-sm">${item.unitPrice}</td>
                              <td className="px-4 py-2 text-sm font-semibold">${item.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-4 text-right">
                        <p className="text-2xl font-bold text-indigo-600">
                          Total: ${invoice.totalAmount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {invoices.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No invoices generated yet. Sales will automatically generate invoices.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Remove Records Tab */}
          {activeTab === 'remove' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Remove Records</h2>
              
              {!isAuthorized ? (
                <div className="max-w-md mx-auto bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-4">Authorization Required</h3>
                  <p className="text-sm text-yellow-700 mb-4">
                    Enter password to authorize record deletion
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleAuthorization()}
                    />
                    <button
                      onClick={handleAuthorization}
                      className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition"
                    >
                      Authorize
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">Default password: admin123</p>
                </div>
              ) : (
                <div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-green-800 font-semibold">✓ Authorized - You can now delete records</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Products</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ID</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Stock</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {products.map((product) => (
                              <tr key={product.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm">{product.id}</td>
                                <td className="px-4 py-3 text-sm font-medium">{product.name}</td>
                                <td className="px-4 py-3 text-sm">{product.category}</td>
                                <td className="px-4 py-3 text-sm">{product.stock}</td>
                                <td className="px-4 py-3 text-sm">
                                  <button
                                    onClick={() => handleDeleteRecord('product', product.id)}
                                    className="flex items-center gap-1 text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {products.length === 0 && (
                          <div className="text-center py-4 text-gray-500">No products to delete</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3">Sales</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sale ID</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {sales.map((sale) => (
                              <tr key={sale.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm">{sale.id}</td>
                                <td className="px-4 py-3 text-sm">{sale.productName}</td>
                                <td className="px-4 py-3 text-sm">{sale.customerName}</td>
                                <td className="px-4 py-3 text-sm">${sale.totalAmount.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm">
                                  <button
                                    onClick={() => handleDeleteRecord('sale', sale.id)}
                                    className="flex items-center gap-1 text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {sales.length === 0 && (
                          <div className="text-center py-4 text-gray-500">No sales to delete</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3">Invoices</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Invoice ID</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {invoices.map((invoice) => (
                              <tr key={invoice.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm">{invoice.id}</td>
                                <td className="px-4 py-3 text-sm">{invoice.customerName}</td>
                                <td className="px-4 py-3 text-sm">{invoice.date}</td>
                                <td className="px-4 py-3 text-sm">${invoice.totalAmount.toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm">
                                  <button
                                    onClick={() => handleDeleteRecord('invoice', invoice.id)}
                                    className="flex items-center gap-1 text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {invoices.length === 0 && (
                          <div className="text-center py-4 text-gray-500">No invoices to delete</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DBMS;