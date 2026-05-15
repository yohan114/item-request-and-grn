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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mrnStatus, setMrnStatus] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('');
  const [savedId, setSavedId] = useState(id || null);
  const [form, setForm] = useState({
    request_for: '',
    supplier_name: '',
    project_name: '',
    request_person_name: '',
    request_person_designation: '',
    approval_person_name: '',
    approval_person_designation: ''
  });
  const [items, setItems] = useState([{ item_name: '', description: '', quantity: '', unit: '', remarks: '' }]);

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

      // If MRN is approved and not rejected, redirect back
      if (data.approval_status === 'Approved') {
        setError('Cannot edit an approved MRN');
        setTimeout(() => navigate(`/mrns/${id}`), 1500);
        return;
      }

      // Allow editing if status is Draft (includes rejected MRNs that go back to Draft)
      if (data.status !== 'Draft') {
        setError('Cannot edit MRN in current status');
        setTimeout(() => navigate(`/mrns/${id}`), 1500);
        return;
      }

      setMrnStatus(data.status || '');
      setApprovalStatus(data.approval_status || '');
      setSavedId(data.id);

      setForm({
        request_for: data.request_for || '',
        supplier_name: data.supplier_name || '',
        project_name: data.project_name || '',
        request_person_name: data.request_person_name || '',
        request_person_designation: data.request_person_designation || '',
        approval_person_name: data.approval_person_name || '',
        approval_person_designation: data.approval_person_designation || ''
      });
      const parsedItems = parseMrnItems(data.items);
      if (parsedItems.length > 0) {
        setItems(parsedItems.map(item => ({
          item_name: item.item_name || '',
          description: item.description || '',
          quantity: item.quantity !== undefined ? String(item.quantity) : '',
          unit: item.unit || '',
          remarks: item.remarks || ''
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
    setItems(prev => [...prev, { item_name: '', description: '', quantity: '', unit: '', remarks: '' }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!form.request_for.trim()) {
      setError('Request For is required');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].item_name.trim()) {
        setError(`Item ${i + 1}: Item Name is required`);
        return;
      }
      if (!items[i].description.trim()) {
        setError(`Item ${i + 1}: Description is required`);
        return;
      }
      if (!items[i].quantity || parseFloat(items[i].quantity) <= 0) {
        setError(`Item ${i + 1}: Quantity must be greater than 0`);
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        request_for: form.request_for,
        supplier_name: form.supplier_name || undefined,
        project_name: form.project_name || undefined,
        items: items.map(item => ({
          item_name: item.item_name,
          description: item.description,
          quantity: parseFloat(item.quantity),
          unit: item.unit || undefined,
          remarks: item.remarks || undefined
        })),
        request_person_name: form.request_person_name || undefined,
        request_person_designation: form.request_person_designation || undefined,
        approval_person_name: form.approval_person_name || undefined,
        approval_person_designation: form.approval_person_designation || undefined
      };

      if (isEdit) {
        await mrnAPI.update(id, payload);
        setSuccessMsg('MRN updated successfully');
        setMrnStatus('Draft');
      } else {
        const res = await mrnAPI.create(payload);
        const newId = res.data.data?.id;
        if (newId) {
          setSavedId(newId);
          setMrnStatus('Draft');
          setApprovalStatus('Pending');
          setSuccessMsg('MRN created successfully. You can now submit it for approval.');
        } else {
          navigate('/mrns');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save MRN');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!savedId) return;
    if (!confirm('Submit this MRN for approval?')) return;
    try {
      setSubmitting(true);
      setError('');
      await mrnAPI.submit(savedId);
      setSuccessMsg('MRN submitted for approval successfully');
      setMrnStatus('Submitted');
      setApprovalStatus('Pending');
      setTimeout(() => navigate(`/mrns/${savedId}`), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit MRN for approval');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  const canSubmitForApproval = savedId && mrnStatus === 'Draft' && (approvalStatus === 'Pending' || approvalStatus === 'Rejected' || approvalStatus === '');

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
        {successMsg && <div className="alert alert-success" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: 6, marginBottom: 16 }}>{successMsg}</div>}

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

          <div className="form-row">
            <div className="form-group">
              <label>Supplier Name</label>
              <input
                type="text"
                name="supplier_name"
                className="form-control"
                value={form.supplier_name}
                onChange={handleChange}
                placeholder="Supplier name (optional)"
              />
            </div>
            <div className="form-group">
              <label>Project Name</label>
              <input
                type="text"
                name="project_name"
                className="form-control"
                value={form.project_name}
                onChange={handleChange}
                placeholder="Project name (optional)"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Items *</label>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Remarks</th>
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
                          value={item.item_name}
                          onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                          placeholder="Item Name"
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
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          placeholder="Qty"
                          min="1"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          placeholder="e.g. pcs, kg"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={item.remarks}
                          onChange={(e) => handleItemChange(index, 'remarks', e.target.value)}
                          placeholder="Remarks"
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
            {canSubmitForApproval && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmitForApproval}
                disabled={submitting}
                style={{ background: '#16a34a' }}
              >
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            )}
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
