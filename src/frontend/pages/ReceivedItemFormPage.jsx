import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { receivedItemsAPI, mrnAPI } from '../services/api';
import { parseMrnItems } from '../services/utils';

function ReceivedItemFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [mrns, setMrns] = useState([]);
  const [mrnItems, setMrnItems] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [loadingMrnItems, setLoadingMrnItems] = useState(false);

  const [selectedMrnId, setSelectedMrnId] = useState('');
  const [selectedMrnNumber, setSelectedMrnNumber] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [receivedQty, setReceivedQty] = useState('');
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [existingImage, setExistingImage] = useState(null);

  useEffect(() => {
    loadMRNs();
    if (isEdit) {
      loadRecord();
    }
  }, [id]);

  const loadMRNs = async () => {
    try {
      // Only show approved MRNs
      const res = await mrnAPI.getAll({ approval_status: 'Approved', limit: 1000 });
      const data = res.data.data;
      setMrns(Array.isArray(data) ? data : (data?.records || []));
    } catch (err) {
      console.error('Failed to load MRNs:', err);
    }
  };

  const loadRecord = async () => {
    try {
      setLoading(true);
      const res = await receivedItemsAPI.getById(id);
      const data = res.data.data;
      setSelectedMrnId(data.mrn_id || '');
      setSelectedMrnNumber(data.mrn_number || '');
      setReceivedQty(data.received_qty ? String(data.received_qty) : '');
      setNotes(data.notes || '');
      if (data.image) {
        setExistingImage(data.image);
      }
      // Parse item_details
      let itemDetails = data.item_details;
      if (typeof itemDetails === 'string') {
        try {
          itemDetails = JSON.parse(itemDetails);
        } catch (e) {
          itemDetails = {};
        }
      }
      setSelectedItem(itemDetails);
      if (data.item_index !== undefined && data.item_index !== null) {
        setSelectedItemIndex(data.item_index);
      }
      // Load MRN items for the selected MRN
      if (data.mrn_id) {
        loadMRNItems(data.mrn_id);
      }
    } catch (err) {
      setError('Failed to load record');
    } finally {
      setLoading(false);
    }
  };

  const loadMRNItems = async (mrnId) => {
    try {
      setLoadingMrnItems(true);
      const [mrnRes, pendingRes] = await Promise.all([
        mrnAPI.getById(mrnId),
        mrnAPI.getPendingItems(mrnId).catch(() => ({ data: { data: [] } }))
      ]);
      const data = mrnRes.data.data;
      const items = parseMrnItems(data.items);
      setMrnItems(items);
      setPendingItems(pendingRes.data.data || []);
    } catch (err) {
      console.error('Failed to load MRN items:', err);
      setMrnItems([]);
      setPendingItems([]);
    } finally {
      setLoadingMrnItems(false);
    }
  };

  const handleMrnChange = (e) => {
    const mrnId = e.target.value;
    setSelectedMrnId(mrnId);
    setSelectedItem(null);
    setSelectedItemIndex(null);
    setMrnItems([]);
    setPendingItems([]);

    if (mrnId) {
      const mrn = mrns.find(m => m.id === mrnId);
      setSelectedMrnNumber(mrn?.mrn_number || '');
      loadMRNItems(mrnId);
    } else {
      setSelectedMrnNumber('');
    }
  };

  const handleItemSelect = (index) => {
    const item = mrnItems[index];
    setSelectedItem(item || null);
    setSelectedItemIndex(index);
  };

  const getRemainingQty = (index) => {
    if (!pendingItems || pendingItems.length === 0) return null;
    // Match by index or by item_name
    const item = mrnItems[index];
    if (!item) return null;
    const pending = pendingItems.find(p =>
      (p.item_name && p.item_name === item.item_name) ||
      (p.item_no && p.item_no === item.item_name) ||
      (p.item_no && p.item_no === item.item_no)
    );
    return pending ? pending.remaining_qty : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedMrnId) {
      setError('Please select an MRN');
      return;
    }
    if (!selectedItem) {
      setError('Please select an item from the MRN');
      return;
    }
    if (!receivedQty || parseFloat(receivedQty) <= 0) {
      setError('Received quantity must be greater than 0');
      return;
    }

    // Validate against remaining quantity
    const remaining = getRemainingQty(selectedItemIndex);
    if (remaining !== null && parseFloat(receivedQty) > remaining) {
      setError(`Received quantity (${receivedQty}) exceeds remaining quantity (${remaining})`);
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('mrn_id', selectedMrnId);
      formData.append('mrn_number', selectedMrnNumber);
      formData.append('item_details', JSON.stringify(selectedItem));
      formData.append('received_qty', receivedQty);
      if (selectedItemIndex !== null) {
        formData.append('item_index', selectedItemIndex);
      }
      if (notes) formData.append('notes', notes);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (isEdit) {
        await receivedItemsAPI.update(id, formData);
      } else {
        const createRes = await receivedItemsAPI.create(formData);
        if (createRes.data.mrn_auto_closed) {
          alert('MRN has been auto-closed as all items are now received.');
        }
      }
      navigate('/received-items');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save received item');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>{isEdit ? 'Edit' : 'New'} Received Item</h2>
          <button className="btn btn-secondary" onClick={() => navigate('/received-items')}>
            Cancel
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>MRN Number * (Approved MRNs only)</label>
            <select
              className="form-control"
              value={selectedMrnId}
              onChange={handleMrnChange}
              disabled={isEdit}
            >
              <option value="">-- Select Approved MRN --</option>
              {mrns.map(mrn => (
                <option key={mrn.id} value={mrn.id}>
                  {mrn.mrn_number} {mrn.supplier_name ? `- ${mrn.supplier_name}` : ''}
                </option>
              ))}
            </select>
          </div>

          {loadingMrnItems && <div className="loading">Loading MRN items...</div>}

          {mrnItems.length > 0 && (
            <div className="form-group">
              <label>Select Item from MRN *</label>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>Item Name</th>
                      <th>Description</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Remaining</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mrnItems.map((item, index) => {
                      const isSelected = selectedItemIndex === index;
                      const remaining = getRemainingQty(index);
                      return (
                        <tr
                          key={index}
                          style={{
                            cursor: 'pointer',
                            background: isSelected ? '#eff6ff' : undefined
                          }}
                          onClick={() => handleItemSelect(index)}
                        >
                          <td>
                            <input
                              type="radio"
                              name="selectedItem"
                              checked={isSelected}
                              onChange={() => handleItemSelect(index)}
                            />
                          </td>
                          <td>{item.item_name}</td>
                          <td>{item.description}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit || '-'}</td>
                          <td style={{ fontWeight: 600, color: remaining && remaining > 0 ? '#d97706' : '#16a34a' }}>
                            {remaining !== null ? remaining : '-'}
                          </td>
                          <td>
                            <span className="badge" style={getItemStatusStyle(item.item_status)}>
                              {item.item_status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedItem && (
            <div className="form-group" style={{ padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
              <strong>Selected Item:</strong> {selectedItem.item_name || selectedItem.item_no} - {selectedItem.description} (Qty: {selectedItem.quantity || selectedItem.qty})
              {getRemainingQty(selectedItemIndex) !== null && (
                <span style={{ marginLeft: 12, color: '#d97706', fontWeight: 600 }}>
                  Remaining: {getRemainingQty(selectedItemIndex)}
                </span>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Received Quantity *</label>
            <input
              type="number"
              className="form-control"
              value={receivedQty}
              onChange={(e) => setReceivedQty(e.target.value)}
              placeholder="Enter received quantity"
              min="0.01"
              step="0.01"
              required
            />
            {selectedItem && getRemainingQty(selectedItemIndex) !== null && (
              <small style={{ color: '#6b7280', marginTop: 4, display: 'block' }}>
                Max allowed: {getRemainingQty(selectedItemIndex)}
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Image (JPG, PNG)</label>
            {existingImage && !imageFile && (
              <div style={{ marginBottom: 8, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
                <span style={{ color: '#166534', fontSize: 14 }}>Current file: {existingImage}</span>
              </div>
            )}
            <input
              type="file"
              className="form-control"
              accept=".jpg,.jpeg,.png"
              onChange={(e) => setImageFile(e.target.files[0] || null)}
            />
            {imageFile && (
              <div style={{ marginTop: 6, fontSize: 13, color: 'var(--gray-600)' }}>
                Selected: {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              className="form-control"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={3}
            />
          </div>

          <div className="btn-group mt-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (isEdit ? 'Update Received Item' : 'Create Received Item')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/received-items')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getItemStatusStyle(itemStatus) {
  switch (itemStatus) {
    case 'Pending Approval': return { background: '#94a3b8', color: '#fff' };
    case 'Approved': return { background: '#16a34a', color: '#fff' };
    case 'Pending Receive': return { background: '#f59e0b', color: '#fff' };
    case 'Partially Received': return { background: '#d97706', color: '#fff' };
    case 'Fully Received': return { background: '#059669', color: '#fff' };
    case 'GRN Pending': return { background: '#6366f1', color: '#fff' };
    case 'GRN Completed': return { background: '#0d9488', color: '#fff' };
    default: return { background: '#94a3b8', color: '#fff' };
  }
}

export default ReceivedItemFormPage;
