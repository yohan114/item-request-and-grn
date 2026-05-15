import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { receivedItemsAPI, mrnAPI } from '../services/api';

function ReceivedItemFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [mrns, setMrns] = useState([]);
  const [mrnItems, setMrnItems] = useState([]);
  const [loadingMrnItems, setLoadingMrnItems] = useState(false);

  const [selectedMrnId, setSelectedMrnId] = useState('');
  const [selectedMrnNumber, setSelectedMrnNumber] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
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
      const res = await mrnAPI.getAll({ limit: 1000 });
      const data = res.data.data;
      setMrns(Array.isArray(data) ? data : []);
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
      const res = await mrnAPI.getById(mrnId);
      const data = res.data.data;
      let items = data.items;
      if (typeof items === 'string') {
        try {
          items = JSON.parse(items);
        } catch (e) {
          items = [];
        }
      }
      setMrnItems(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Failed to load MRN items:', err);
      setMrnItems([]);
    } finally {
      setLoadingMrnItems(false);
    }
  };

  const handleMrnChange = (e) => {
    const mrnId = e.target.value;
    setSelectedMrnId(mrnId);
    setSelectedItem(null);
    setMrnItems([]);

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

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('mrn_id', selectedMrnId);
      formData.append('mrn_number', selectedMrnNumber);
      formData.append('item_details', JSON.stringify(selectedItem));
      formData.append('received_qty', receivedQty);
      if (notes) formData.append('notes', notes);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (isEdit) {
        await receivedItemsAPI.update(id, formData);
      } else {
        await receivedItemsAPI.create(formData);
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
            <label>MRN Number *</label>
            <select
              className="form-control"
              value={selectedMrnId}
              onChange={handleMrnChange}
              disabled={isEdit}
            >
              <option value="">-- Select MRN --</option>
              {mrns.map(mrn => (
                <option key={mrn.id} value={mrn.id}>
                  {mrn.mrn_number}
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
                      <th>Item No</th>
                      <th>Description</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mrnItems.map((item, index) => {
                      const isSelected = selectedItem &&
                        selectedItem.item_no === item.item_no &&
                        selectedItem.description === item.description;
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
                          <td>{item.item_no}</td>
                          <td>{item.description}</td>
                          <td>{item.qty}</td>
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
              <strong>Selected Item:</strong> {selectedItem.item_no} - {selectedItem.description} (Qty: {selectedItem.qty})
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

export default ReceivedItemFormPage;
