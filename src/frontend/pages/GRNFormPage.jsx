import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { grnAPI, mrnAPI, receivedItemsAPI } from '../services/api';
import { parseMrnItems } from '../services/utils';

function GRNFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const preSelectedMrnId = searchParams.get('mrn_id') || '';
  const isEdit = !!id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    supplier_name: '',
    project_name: '',
    invoice_number: '',
    remarks: ''
  });
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [existingInvoice, setExistingInvoice] = useState(null);

  // MRN link mode (always on for new GRNs)
  const [mrns, setMrns] = useState([]);
  const [selectedMrnId, setSelectedMrnId] = useState(preSelectedMrnId);
  const [receivedItems, setReceivedItems] = useState([]);
  const [selectedReceivedItemIds, setSelectedReceivedItemIds] = useState([]);
  const [loadingMrns, setLoadingMrns] = useState(false);
  const [loadingReceivedItems, setLoadingReceivedItems] = useState(false);

  // Edit mode for rejected GRN
  const [isRejected, setIsRejected] = useState(false);

  const today = new Date().toLocaleDateString();

  useEffect(() => {
    if (isEdit) {
      loadRecord();
    } else {
      loadApprovedMrns();
    }
  }, [id]);

  useEffect(() => {
    if (selectedMrnId && !isEdit) {
      loadReceivedItemsForMrn(selectedMrnId);
      // Auto-fill supplier from MRN
      const mrn = mrns.find(m => m.id === selectedMrnId);
      if (mrn) {
        setForm(prev => ({
          ...prev,
          supplier_name: mrn.supplier_name || prev.supplier_name,
          project_name: mrn.project_name || prev.project_name
        }));
      }
    } else if (!selectedMrnId && !isEdit) {
      setReceivedItems([]);
      setSelectedReceivedItemIds([]);
    }
  }, [selectedMrnId, mrns]);

  const loadRecord = async () => {
    try {
      setLoading(true);
      const res = await grnAPI.getById(id);
      const data = res.data.data;

      setIsRejected(data.approval_status === 'Rejected' || data.status === 'Rejected');

      setForm({
        supplier_name: data.supplier_name || '',
        project_name: data.project_name || '',
        invoice_number: data.invoice_number || '',
        remarks: data.remarks || ''
      });
      if (data.invoice_attachment) {
        setExistingInvoice(data.invoice_attachment);
      }
      if (data.mrn_id) {
        setSelectedMrnId(data.mrn_id);
        // Load MRNs and received items for editing
        await loadApprovedMrns();
        await loadReceivedItemsForMrn(data.mrn_id);
        // Pre-select existing received items
        if (data.received_item_ids) {
          let rIds = data.received_item_ids;
          if (typeof rIds === 'string') {
            try { rIds = JSON.parse(rIds); } catch (e) { rIds = []; }
          }
          setSelectedReceivedItemIds(Array.isArray(rIds) ? rIds : []);
        }
      } else {
        await loadApprovedMrns();
      }
    } catch (err) {
      setError('Failed to load record');
    } finally {
      setLoading(false);
    }
  };

  const loadApprovedMrns = async () => {
    try {
      setLoadingMrns(true);
      const res = await mrnAPI.getAll({ approval_status: 'Approved', limit: 100 });
      const data = res.data.data;
      const allMrns = Array.isArray(data) ? data : (data?.records || []);
      setMrns(allMrns);
    } catch (err) {
      console.error('Failed to load MRNs:', err);
    } finally {
      setLoadingMrns(false);
    }
  };

  const loadReceivedItemsForMrn = async (mrnId) => {
    try {
      setLoadingReceivedItems(true);
      const res = await receivedItemsAPI.getByMrn(mrnId, { grn_status: 'Pending', limit: 100 });
      const items = res.data.data || [];
      setReceivedItems(items);
      if (!isEdit) {
        setSelectedReceivedItemIds([]);
      }
    } catch (err) {
      console.error('Failed to load received items:', err);
    } finally {
      setLoadingReceivedItems(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const toggleReceivedItem = (itemId) => {
    setSelectedReceivedItemIds(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(rid => rid !== itemId);
      }
      return [...prev, itemId];
    });
  };

  const selectAllReceivedItems = () => {
    if (selectedReceivedItemIds.length === receivedItems.length) {
      setSelectedReceivedItemIds([]);
    } else {
      setSelectedReceivedItemIds(receivedItems.map(ri => ri.id));
    }
  };

  const getReceivedItemDetails = (ri) => {
    let details = ri.item_details;
    if (typeof details === 'string') {
      try { details = JSON.parse(details); } catch (e) { details = {}; }
    }
    return details || {};
  };

  const handleMrnChange = (e) => {
    const mrnId = e.target.value;
    setSelectedMrnId(mrnId);
    setSelectedReceivedItemIds([]);
    setReceivedItems([]);
    if (mrnId) {
      const mrn = mrns.find(m => m.id === mrnId);
      if (mrn) {
        setForm(prev => ({
          ...prev,
          supplier_name: mrn.supplier_name || '',
          project_name: mrn.project_name || prev.project_name
        }));
      }
      loadReceivedItemsForMrn(mrnId);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedMrnId) {
      setError('Please select an MRN');
      return;
    }

    if (selectedReceivedItemIds.length === 0) {
      setError('Please select at least one received item');
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('mrn_id', selectedMrnId);
      formData.append('received_item_ids', JSON.stringify(selectedReceivedItemIds));
      formData.append('supplier_name', form.supplier_name);
      if (form.project_name) formData.append('project_name', form.project_name);
      if (form.invoice_number) formData.append('invoice_number', form.invoice_number);
      if (form.remarks) formData.append('remarks', form.remarks);

      // Build items from received items
      const items = selectedReceivedItemIds.map(riId => {
        const ri = receivedItems.find(r => r.id === riId);
        const details = getReceivedItemDetails(ri);
        return {
          item_name: details.item_name || details.item_no || '',
          description: details.description || '',
          quantity: ri ? ri.received_qty : 0
        };
      });
      formData.append('items', JSON.stringify(items));

      if (invoiceFile) {
        formData.append('invoice_file', invoiceFile);
      }

      if (isEdit) {
        // For rejected GRN, use resubmit
        if (isRejected) {
          await grnAPI.resubmit(id, formData);
        } else {
          await grnAPI.update(id, formData);
        }
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
          <h2>{isEdit ? (isRejected ? 'Edit & Resubmit' : 'Edit') : 'New'} Goods Received Note</h2>
          <button className="btn btn-secondary" onClick={() => navigate('/grns')}>
            Cancel
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {isRejected && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: 6, marginBottom: 16, color: '#991b1b' }}>
            This GRN was rejected. You can edit and resubmit it.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Select MRN */}
          <div className="card" style={{ marginBottom: 16, padding: 16, background: '#f8fafc' }}>
            <h3 style={{ marginBottom: 12 }}>Step 1: Select MRN</h3>
            <div className="form-group">
              <label>Select Approved MRN *</label>
              {loadingMrns ? (
                <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Loading MRNs...</p>
              ) : (
                <select
                  className="form-control"
                  value={selectedMrnId}
                  onChange={handleMrnChange}
                >
                  <option value="">-- Select MRN --</option>
                  {mrns.map(mrn => (
                    <option key={mrn.id} value={mrn.id}>
                      {mrn.mrn_number} {mrn.supplier_name ? `- ${mrn.supplier_name}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Step 2: Select Received Items */}
          {selectedMrnId && (
            <div className="card" style={{ marginBottom: 16, padding: 16, background: '#f8fafc' }}>
              <h3 style={{ marginBottom: 12 }}>Step 2: Select Received Items</h3>
              <div className="form-group">
                <label>Received Items (GRN Pending)</label>
                {loadingReceivedItems ? (
                  <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Loading received items...</p>
                ) : receivedItems.length === 0 ? (
                  <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>No pending received items for this MRN.</p>
                ) : (
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedReceivedItemIds.length === receivedItems.length && receivedItems.length > 0}
                        onChange={selectAllReceivedItems}
                      />
                      <strong>Select All</strong>
                    </label>
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Select</th>
                            <th>RI Number</th>
                            <th>Item Name</th>
                            <th>Description</th>
                            <th>Received Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receivedItems.map(ri => {
                            const details = getReceivedItemDetails(ri);
                            return (
                              <tr key={ri.id}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={selectedReceivedItemIds.includes(ri.id)}
                                    onChange={() => toggleReceivedItem(ri.id)}
                                  />
                                </td>
                                <td>{ri.ri_number}</td>
                                <td>{details.item_name || details.item_no || '-'}</td>
                                <td>{details.description || '-'}</td>
                                <td>{ri.received_qty}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Invoice & Details */}
          {selectedReceivedItemIds.length > 0 && (
            <div className="card" style={{ marginBottom: 16, padding: 16, background: '#f8fafc' }}>
              <h3 style={{ marginBottom: 12 }}>Step 3: Invoice & Details</h3>

              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="text"
                    className="form-control"
                    value={today}
                    readOnly
                    style={{ background: '#fff' }}
                  />
                </div>
                <div className="form-group">
                  <label>Supplier Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.supplier_name}
                    readOnly
                    style={{ background: '#f1f5f9' }}
                  />
                </div>
              </div>

              <div className="form-row">
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
                <div className="form-group">
                  <label>Invoice Number</label>
                  <input
                    type="text"
                    name="invoice_number"
                    className="form-control"
                    value={form.invoice_number}
                    onChange={handleChange}
                    placeholder="Invoice number (optional)"
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

              <div className="form-group">
                <label>Remarks</label>
                <textarea
                  className="form-control"
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  placeholder="Optional remarks..."
                  rows={3}
                />
              </div>

              {/* Summary of selected items */}
              <div className="form-group">
                <label>Items to include in GRN ({selectedReceivedItemIds.length} selected)</label>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Description</th>
                        <th>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReceivedItemIds.map(riId => {
                        const ri = receivedItems.find(r => r.id === riId);
                        if (!ri) return null;
                        const details = getReceivedItemDetails(ri);
                        return (
                          <tr key={riId}>
                            <td>{details.item_name || details.item_no || '-'}</td>
                            <td>{details.description || '-'}</td>
                            <td>{ri.received_qty}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="btn-group mt-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (isEdit ? (isRejected ? 'Resubmit GRN' : 'Update GRN') : 'Create GRN')}
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
