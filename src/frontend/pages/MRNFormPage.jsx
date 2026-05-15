import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mrnAPI } from '../services/api';
import { parseMrnItems } from '../services/utils';

function MRNFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    request_for: '',
    request_person_name: '',
    request_person_designation: '',
    approval_person_name: '',
    approval_person_designation: ''
  });
  const [items, setItems] = useState([{ item_no: '', description: '', qty: '' }]);

  const today = new Date().toLocaleDateString();

  useEffect(() => {
    if (isEdit) {
      loadRecord();
    }
  }, [id]);

  const loadRecord = async () => {
    try {
      setLoading(true);
      const res = await mrnAPI.getById(id);
      const data = res.data.data;

      // If MRN is approved, redirect back
      if (data.approval_status === 'Approved') {
        setError('Cannot edit an approved MRN');
        setTimeout(() => navigate(`/mrns/${id}`), 1500);
        return;
      }

      setForm({
        request_for: data.request_for || '',
        request_person_name: data.request_person_name || '',
        request_person_designation: data.request_person_designation || '',
        approval_person_name: data.approval_person_name || '',
        approval_person_designation: data.approval_person_designation || ''
      });
      const parsedItems = parseMrnItems(data.items);
      if (parsedItems.length > 0) {
        setItems(parsedItems);
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
    setItems(prev => [...prev, { item_no: '', description: '', qty: '' }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.request_for.trim()) {
      setError('Request For is required');
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
    }

    try {
      setSaving(true);
      const payload = {
        request_for: form.request_for,
        items: items.map(item => ({
          item_no: item.item_no,
          description: item.description,
          qty: parseFloat(item.qty)
        })),
        request_person_name: form.request_person_name || undefined,
        request_person_designation: form.request_person_designation || undefined,
        approval_person_name: form.approval_person_name || undefined,
        approval_person_designation: form.approval_person_designation || undefined
      };

      if (isEdit) {
        await mrnAPI.update(id, payload);
      } else {
        await mrnAPI.create(payload);
      }
      navigate('/mrns');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save MRN');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>{isEdit ? 'Edit' : 'New'} Material Request Note</h2>
          <button className="btn btn-secondary" onClick={() => navigate('/mrns')}>
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
              <label>Request For *</label>
              <input
                type="text"
                name="request_for"
                className="form-control"
                value={form.request_for}
                onChange={handleChange}
                placeholder="e.g. Vehicle, Office Equipment"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Items *</label>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Item No</th>
                    <th>Description</th>
                    <th>Quantity</th>
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
                          min="1"
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

          <div className="btn-group mt-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (isEdit ? 'Update MRN' : 'Create MRN')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/mrns')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MRNFormPage;
