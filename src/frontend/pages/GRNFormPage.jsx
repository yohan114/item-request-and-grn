import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { grnAPI, mrnAPI } from '../services/api';

function GRNFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [linkedMRN, setLinkedMRN] = useState(null);
  const [form, setForm] = useState({
    mrn_id: searchParams.get('mrn_id') || '',
    supplier_name: '',
    item_name: '',
    item_description: '',
    received_quantity: '',
    checked_quantity: '',
    accepted_quantity: '',
    rejected_quantity: '',
    store_confirmation: false,
    received_date: '',
    invoice_number: '',
    invoice_date: '',
    remarks: ''
  });

  useEffect(() => {
    if (isEdit) {
      loadRecord();
    } else if (form.mrn_id) {
      loadMRN(form.mrn_id);
    }
  }, [id]);

  const loadRecord = async () => {
    try {
      setLoading(true);
      const res = await grnAPI.getById(id);
      const data = res.data.data;
      setForm({
        mrn_id: data.mrn_id || '',
        supplier_name: data.supplier_name || '',
        item_name: data.item_name || '',
        item_description: data.item_description || '',
        received_quantity: data.received_quantity ?? '',
        checked_quantity: data.checked_quantity ?? '',
        accepted_quantity: data.accepted_quantity ?? '',
        rejected_quantity: data.rejected_quantity ?? '',
        store_confirmation: data.store_confirmation || false,
        received_date: data.received_date ? data.received_date.split('T')[0] : '',
        invoice_number: data.invoice_number || '',
        invoice_date: data.invoice_date ? data.invoice_date.split('T')[0] : '',
        remarks: data.remarks || ''
      });
      if (data.mrn_id) {
        setLinkedMRN(data.mrn || data.MRN || null);
      }
    } catch (err) {
      setError('Failed to load record');
    } finally {
      setLoading(false);
    }
  };

  const loadMRN = async (mrnId) => {
    try {
      const res = await mrnAPI.getById(mrnId);
      const mrn = res.data.data;
      setLinkedMRN(mrn);
      setForm(prev => ({
        ...prev,
        supplier_name: mrn.supplier_name || prev.supplier_name,
        item_name: mrn.item_name || prev.item_name,
        item_description: mrn.item_description || prev.item_description
      }));
    } catch (err) {
      console.error('Failed to load linked MRN:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.supplier_name.trim()) { setError('Supplier name is required'); return; }
    if (!form.item_name.trim()) { setError('Item name is required'); return; }

    const accepted = parseFloat(form.accepted_quantity) || 0;
    const rejected = parseFloat(form.rejected_quantity) || 0;
    const received = parseFloat(form.received_quantity) || 0;
    if (received > 0 && (accepted + rejected) > received) {
      setError('Accepted + Rejected quantity cannot exceed Received quantity');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...form,
        received_quantity: parseFloat(form.received_quantity) || 0,
        checked_quantity: parseFloat(form.checked_quantity) || 0,
        accepted_quantity: accepted,
        rejected_quantity: rejected
      };

      if (isEdit) {
        await grnAPI.update(id, payload);
      } else {
        await grnAPI.create(payload);
      }
      navigate('/grns');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save GRN');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>{isEdit ? 'Edit' : 'New'} Goods Received Note</h2>
          <button className="btn btn-secondary" onClick={() => navigate('/grns')}>
            Cancel
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Linked MRN */}
          <div className="form-group">
            <label>Linked MRN</label>
            {linkedMRN ? (
              <input
                type="text"
                className="form-control"
                value={linkedMRN.mrn_number || form.mrn_id}
                readOnly
                style={{ background: '#f8fafc' }}
              />
            ) : (
              <input
                type="text"
                name="mrn_id"
                className="form-control"
                value={form.mrn_id}
                onChange={handleChange}
                placeholder="Enter MRN ID (optional)"
              />
            )}
          </div>

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
              <label>Received Quantity</label>
              <input
                type="number"
                name="received_quantity"
                className="form-control"
                value={form.received_quantity}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>Checked Quantity</label>
              <input
                type="number"
                name="checked_quantity"
                className="form-control"
                value={form.checked_quantity}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Accepted Quantity</label>
              <input
                type="number"
                name="accepted_quantity"
                className="form-control"
                value={form.accepted_quantity}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>Rejected Quantity</label>
              <input
                type="number"
                name="rejected_quantity"
                className="form-control"
                value={form.rejected_quantity}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="store_confirmation"
              name="store_confirmation"
              checked={form.store_confirmation}
              onChange={handleChange}
            />
            <label htmlFor="store_confirmation" style={{ margin: 0 }}>Store Confirmation</label>
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
              {saving ? 'Saving...' : (isEdit ? 'Update GRN' : 'Create GRN')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/grns')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GRNFormPage;
