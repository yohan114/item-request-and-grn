import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { localPurchasesAPI } from '../services/api';

function LocalPurchaseFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    supplier_name: '',
    purchase_category: 'Office Supplies',
    item_name: '',
    item_description: '',
    quantity: 1,
    unit_price: 0,
    invoice_number: '',
    invoice_date: '',
    received_date: '',
    remarks: ''
  });

  useEffect(() => {
    if (isEdit) {
      loadRecord();
    }
  }, [id]);

  const loadRecord = async () => {
    try {
      setLoading(true);
      const res = await localPurchasesAPI.getById(id);
      const data = res.data.data;
      setForm({
        supplier_name: data.supplier_name || '',
        purchase_category: data.purchase_category || data.category || 'Office Supplies',
        item_name: data.item_name || '',
        item_description: data.item_description || '',
        quantity: data.quantity || 1,
        unit_price: data.unit_price || 0,
        invoice_number: data.invoice_number || '',
        invoice_date: data.invoice_date ? data.invoice_date.split('T')[0] : '',
        received_date: data.received_date ? data.received_date.split('T')[0] : '',
        remarks: data.remarks || ''
      });
    } catch (err) {
      setError('Failed to load record');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const totalPrice = (parseFloat(form.quantity) || 0) * (parseFloat(form.unit_price) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.supplier_name.trim()) { setError('Supplier name is required'); return; }
    if (!form.item_name.trim()) { setError('Item name is required'); return; }
    if (!form.quantity || form.quantity <= 0) { setError('Quantity must be greater than 0'); return; }
    if (!form.unit_price || form.unit_price < 0) { setError('Unit price must be valid'); return; }

    try {
      setSaving(true);
      const payload = {
        ...form,
        quantity: parseFloat(form.quantity),
        unit_price: parseFloat(form.unit_price),
        total_amount: totalPrice
      };

      if (isEdit) {
        await localPurchasesAPI.update(id, payload);
      } else {
        await localPurchasesAPI.create(payload);
      }
      navigate('/local-purchases');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>{isEdit ? 'Edit' : 'New'} Local Purchase</h2>
          <button className="btn btn-secondary" onClick={() => navigate('/local-purchases')}>
            Cancel
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Supplier Name *</label>
              <input
                type="text"
                name="supplier_name"
                className="form-control"
                value={form.supplier_name}
                onChange={handleChange}
                placeholder="Enter supplier name"
                required
              />
            </div>
            <div className="form-group">
              <label>Category *</label>
              <select name="purchase_category" className="form-control" value={form.purchase_category} onChange={handleChange}>
                <option value="Office Supplies">Office Supplies</option>
                <option value="IT Equipment">IT Equipment</option>
                <option value="Furniture">Furniture</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Raw Materials">Raw Materials</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Item Name *</label>
            <input
              type="text"
              name="item_name"
              className="form-control"
              value={form.item_name}
              onChange={handleChange}
              placeholder="Enter item name"
              required
            />
          </div>

          <div className="form-group">
            <label>Item Description</label>
            <textarea
              name="item_description"
              className="form-control"
              value={form.item_description}
              onChange={handleChange}
              placeholder="Enter item description..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Quantity *</label>
              <input
                type="number"
                name="quantity"
                className="form-control"
                value={form.quantity}
                onChange={handleChange}
                min="1"
                required
              />
            </div>
            <div className="form-group">
              <label>Unit Price *</label>
              <input
                type="number"
                name="unit_price"
                className="form-control"
                value={form.unit_price}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Total Price</label>
            <input
              type="text"
              className="form-control"
              value={totalPrice.toFixed(2)}
              readOnly
              style={{ background: '#f8fafc' }}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Invoice Number</label>
              <input
                type="text"
                name="invoice_number"
                className="form-control"
                value={form.invoice_number}
                onChange={handleChange}
                placeholder="Invoice number"
              />
            </div>
            <div className="form-group">
              <label>Invoice Date</label>
              <input
                type="date"
                name="invoice_date"
                className="form-control"
                value={form.invoice_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Received Date</label>
            <input
              type="date"
              name="received_date"
              className="form-control"
              value={form.received_date}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Remarks</label>
            <textarea
              name="remarks"
              className="form-control"
              value={form.remarks}
              onChange={handleChange}
              placeholder="Additional notes..."
            />
          </div>

          <div className="btn-group mt-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (isEdit ? 'Update Record' : 'Create Record')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/local-purchases')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LocalPurchaseFormPage;
