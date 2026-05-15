import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { grnAPI } from '../services/api';
import { parseMrnItems } from '../services/utils';

function GRNFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    supplier_name: '',
    project_name: '',
    request_person_name: '',
    request_person_designation: '',
    approval_person_name: '',
    approval_person_designation: ''
  });
  const [items, setItems] = useState([{ item_no: '', description: '', qty: '', price: '' }]);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [existingInvoice, setExistingInvoice] = useState(null);

  const today = new Date().toLocaleDateString();

  useEffect(() => {
    if (isEdit) {
      loadRecord();
    }
  }, [id]);

  const loadRecord = async () => {
    try {
      setLoading(true);
      const res = await grnAPI.getById(id);
      const data = res.data.data;
      setForm({
        supplier_name: data.supplier_name || '',
        project_name: data.project_name || '',
        request_person_name: data.request_person_name || '',
        request_person_designation: data.request_person_designation || '',
        approval_person_name: data.approval_person_name || '',
        approval_person_designation: data.approval_person_designation || ''
      });
      if (data.invoice_attachment) {
        setExistingInvoice(data.invoice_attachment);
      }
      const parsedItems = parseMrnItems(data.items);
      if (parsedItems.length > 0) {
        setItems(parsedItems.map(item => ({
          item_no: item.item_no || '',
          description: item.description || '',
          qty: item.qty !== undefined ? String(item.qty) : '',
          price: item.price !== undefined ? String(item.price) : ''
        })));
      }
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

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addItem = () => {
    setItems(prev => [...prev, { item_no: '', description: '', qty: '', price: '' }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.supplier_name.trim()) {
      setError('Supplier Name is required');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].item_no.trim()) {
        setError(`Item ${i + 1}: Item No is required`);
        return;
      }
      if (!items[i].description.trim()) {
        setError(`Item ${i + 1}: Description is required`);
        return;
      }
      if (!items[i].qty || parseFloat(items[i].qty) <= 0) {
        setError(`Item ${i + 1}: Quantity must be greater than 0`);
        return;
      }
      if (items[i].price === '' || parseFloat(items[i].price) < 0) {
        setError(`Item ${i + 1}: Price must be 0 or more`);
        return;
      }
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('supplier_name', form.supplier_name);
      if (form.project_name) formData.append('project_name', form.project_name);
      formData.append('items', JSON.stringify(items.map(item => ({
        item_no: item.item_no,
        description: item.description,
        qty: parseFloat(item.qty),
        price: parseFloat(item.price)
      }))));
      if (form.request_person_name) formData.append('request_person_name', form.request_person_name);
      if (form.request_person_designation) formData.append('request_person_designation', form.request_person_designation);
      if (form.approval_person_name) formData.append('approval_person_name', form.approval_person_name);
      if (form.approval_person_designation) formData.append('approval_person_designation', form.approval_person_designation);

      if (invoiceFile) {
        formData.append('invoice_file', invoiceFile);
      }

      if (isEdit) {
        await grnAPI.update(id, formData);
      } else {
        await grnAPI.create(formData);
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
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input
                type="text"
                className="form-control"
                value={today}
                readOnly
                style={{ background: '#f8fafc' }}
              />
            </div>
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
          </div>

          <div className="form-group">
            <label>Project Name</label>
            <input
              type="text"
              name="project_name"
              className="form-control"
              value={form.project_name}
              onChange={handleChange}
              placeholder="Enter project name (optional)"
            />
          </div>

          <div className="form-group">
            <label>Items *</label>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Item No</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={item.item_no}
                          onChange={(e) => handleItemChange(index, 'item_no', e.target.value)}
                          placeholder="Item No"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Description"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={item.qty}
                          onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                          placeholder="Qty"
                          min="0.01"
                          step="0.01"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={item.price}
                          onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                          placeholder="Price"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td>
                        {items.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => removeItem(index)}
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn btn-secondary" onClick={addItem} style={{ marginTop: 8 }}>
              + Add Item
            </button>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Request Person Name</label>
              <input
                type="text"
                name="request_person_name"
                className="form-control"
                value={form.request_person_name}
                onChange={handleChange}
                placeholder="Name of requesting person"
              />
            </div>
            <div className="form-group">
              <label>Request Person Designation</label>
              <input
                type="text"
                name="request_person_designation"
                className="form-control"
                value={form.request_person_designation}
                onChange={handleChange}
                placeholder="Designation"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Approval Person Name</label>
              <input
                type="text"
                name="approval_person_name"
                className="form-control"
                value={form.approval_person_name}
                onChange={handleChange}
                placeholder="Name of approval person"
              />
            </div>
            <div className="form-group">
              <label>Approval Person Designation</label>
              <input
                type="text"
                name="approval_person_designation"
                className="form-control"
                value={form.approval_person_designation}
                onChange={handleChange}
                placeholder="Designation"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Invoice Attachment (JPG, PNG, PDF)</label>
            {existingInvoice && !invoiceFile && (
              <div style={{ marginBottom: 8, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
                <span style={{ color: '#166534', fontSize: 14 }}>Current file: {existingInvoice}</span>
              </div>
            )}
            <input
              type="file"
              className="form-control"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => setInvoiceFile(e.target.files[0] || null)}
            />
            {invoiceFile && (
              <div style={{ marginTop: 6, fontSize: 13, color: 'var(--gray-600)' }}>
                Selected: {invoiceFile.name} ({(invoiceFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
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
