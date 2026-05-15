import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { localPurchasesAPI, attachmentsAPI, approvalsAPI, pdfAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AttachmentUploadModal from './AttachmentUploadModal';

const ALL_STATUSES = ['MRN Created', 'MRN Uploaded', 'Item Purchased', 'Goods Received at Stores', 'GRN Pending', 'Invoice Attached', 'GRN Completed', 'Pending Approval', 'Approved', 'Rejected', 'Completed'];

const STATUS_TRANSITIONS = {
  'MRN Created': { next: 'MRN Uploaded', label: 'Mark as MRN Uploaded' },
  'MRN Uploaded': { next: 'Item Purchased', label: 'Mark as Item Purchased' },
  'Item Purchased': { next: 'Goods Received at Stores', label: 'Mark as Goods Received' },
  'Goods Received at Stores': { next: 'GRN Pending', label: 'Mark as GRN Pending' },
  'GRN Pending': { next: 'Invoice Attached', label: 'Mark as Invoice Attached' },
  'Invoice Attached': { next: 'GRN Completed', label: 'Mark as GRN Completed' },
  'GRN Completed': { next: 'Pending Approval', label: 'Submit for Approval' }
};

function WorkflowStepper({ currentStatus }) {
  const currentIndex = ALL_STATUSES.indexOf(currentStatus);
  const isRejected = currentStatus === 'Rejected';

  return (
    <div className="workflow-stepper" style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', padding: '16px 0', gap: '4px', flexWrap: 'wrap' }}>
      {ALL_STATUSES.filter(s => {
        if (isRejected) return s !== 'Completed';
        if (currentStatus === 'Completed') return s !== 'Rejected';
        return true;
      }).map((status, idx) => {
        const statusIndex = ALL_STATUSES.indexOf(status);
        const isCurrent = status === currentStatus;
        const isCompleted = !isRejected && statusIndex < currentIndex;
        const isRejectedStatus = status === 'Rejected' && isRejected;

        let bgColor = '#e2e8f0';
        let textColor = '#64748b';
        if (isCurrent || isRejectedStatus) {
          bgColor = isRejectedStatus || status === 'Rejected' ? '#fecaca' : '#bfdbfe';
          textColor = isRejectedStatus || status === 'Rejected' ? '#dc2626' : '#1d4ed8';
        } else if (isCompleted) {
          bgColor = '#bbf7d0';
          textColor = '#16a34a';
        }

        return (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: isCurrent ? 600 : 400,
              backgroundColor: bgColor,
              color: textColor,
              whiteSpace: 'nowrap'
            }}>
              {isCompleted && '\u2713 '}{status}
            </div>
            {idx < ALL_STATUSES.filter(s => {
              if (isRejected) return s !== 'Completed';
              if (currentStatus === 'Completed') return s !== 'Rejected';
              return true;
            }).length - 1 && (
              <span style={{ color: '#cbd5e1', fontSize: '12px' }}>&rarr;</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LocalPurchaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [comments, setComments] = useState('');
  const [grnForm, setGrnForm] = useState({
    received_quantity: '',
    checked_quantity: '',
    accepted_quantity: '',
    rejected_quantity: '',
    grn_remarks: '',
    store_confirmation: false
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recordRes, attachRes, historyRes] = await Promise.all([
        localPurchasesAPI.getById(id),
        attachmentsAPI.getByPurchase(id).catch(() => ({ data: { data: [] } })),
        approvalsAPI.getHistory(id).catch(() => ({ data: { data: [] } }))
      ]);
      const data = recordRes.data.data;
      setRecord(data);
      setAttachments(attachRes.data.data || []);
      setHistory(historyRes.data.data || []);
      // Pre-fill GRN form from existing record data
      if (data) {
        setGrnForm({
          received_quantity: data.received_quantity || '',
          checked_quantity: data.checked_quantity || '',
          accepted_quantity: data.accepted_quantity || '',
          rejected_quantity: data.rejected_quantity || '',
          grn_remarks: data.grn_remarks || '',
          store_confirmation: data.store_confirmation || false
        });
      }
    } catch (err) {
      console.error('Failed to load record:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this record?')) return;
    setActionLoading('approve');
    try {
      await approvalsAPI.approve(id, { comments });
      setComments('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) { alert('Please provide a reason for rejection'); return; }
    if (!confirm('Reject this record?')) return;
    setActionLoading('reject');
    try {
      await approvalsAPI.reject(id, { comments });
      setComments('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading('');
    }
  };

  const handleComplete = async () => {
    if (!confirm('Mark this record as completed?')) return;
    setActionLoading('complete');
    try {
      await approvalsAPI.complete(id, { comments });
      setComments('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading('');
    }
  };

  const handleAdvanceStatus = async () => {
    const transition = STATUS_TRANSITIONS[record.status];
    if (!transition) return;
    if (!confirm(`Advance status to "${transition.next}"?`)) return;
    setActionLoading('advance');
    try {
      await approvalsAPI.advanceStatus(id, { status: transition.next, remarks: comments });
      setComments('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to advance status');
    } finally {
      setActionLoading('');
    }
  };

  const handleSaveGRN = async () => {
    if (!grnForm.store_confirmation) {
      alert('Please confirm store receipt before saving GRN details');
      return;
    }
    setActionLoading('grn');
    try {
      await localPurchasesAPI.update(id, {
        received_quantity: parseFloat(grnForm.received_quantity) || 0,
        checked_quantity: parseFloat(grnForm.checked_quantity) || 0,
        accepted_quantity: parseFloat(grnForm.accepted_quantity) || 0,
        rejected_quantity: parseFloat(grnForm.rejected_quantity) || 0,
        grn_remarks: grnForm.grn_remarks,
        store_confirmation: grnForm.store_confirmation,
        grn_completed: true
      });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save GRN details');
    } finally {
      setActionLoading('');
    }
  };

  const handleDownloadPDF = async (type) => {
    try {
      const res = type === 'mrn' ? await pdfAPI.getMRN(id) : await pdfAPI.getGRN(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Failed to download ${type.toUpperCase()} sheet`);
    }
  };

  const handleDownloadAttachment = async (attachId, filename) => {
    try {
      const res = await attachmentsAPI.download(attachId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed');
    }
  };

  const handleDeleteAttachment = async (attachId) => {
    if (!confirm('Delete this attachment?')) return;
    try {
      await attachmentsAPI.delete(attachId);
      loadData();
    } catch (err) {
      alert('Delete failed');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!record) return <div className="empty-state"><h3>Record not found</h3></div>;

  const canApprove = ['Admin', 'Manager'].includes(user?.role) && record.status === 'Pending Approval';
  const canComplete = ['Admin', 'Manager', 'Store Keeper'].includes(user?.role) && record.status === 'Approved';
  const canAdvance = ['Admin', 'Manager', 'Store Keeper'].includes(user?.role) && STATUS_TRANSITIONS[record.status];
  const showGRNSection = ['Invoice Attached'].includes(record.status) && ['Admin', 'Manager', 'Store Keeper'].includes(user?.role);

  // Check conditions for advance buttons
  const canAdvanceNow = (() => {
    if (!canAdvance) return false;
    const status = record.status;
    if (status === 'MRN Created') {
      // Need MRN attachment
      return attachments.some(a => ['Manual MRN Photo', 'Manual MRN Scanned Copy'].includes(a.attachment_type));
    }
    if (status === 'GRN Pending') {
      return record.invoice_attached;
    }
    if (status === 'Invoice Attached') {
      return record.grn_completed;
    }
    return true;
  })();

  return (
    <div>
      {/* Workflow Progress Tracker */}
      <div className="card">
        <div className="card-header">
          <h2>Workflow Progress</h2>
        </div>
        <WorkflowStepper currentStatus={record.status} />
      </div>

      <div className="card">
        <div className="card-header">
          <h2>
            {record.item_name}
            <span className={`badge badge-${(record.status || 'pending').toLowerCase().replace(/\s+/g, '-')}`} style={{ marginLeft: 12 }}>
              {record.status}
            </span>
          </h2>
          <div className="btn-group">
            {record.status === 'MRN Created' && ['Admin', 'Manager', 'Store Keeper'].includes(user?.role) && (
              <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/local-purchases/${id}/edit`)}>Edit</button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/local-purchases')}>Back</button>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <div className="label">Supplier</div>
            <div className="value">{record.supplier_name}</div>
          </div>
          <div className="detail-item">
            <div className="label">Category</div>
            <div className="value">{record.purchase_category || record.category}</div>
          </div>
          <div className="detail-item">
            <div className="label">Quantity</div>
            <div className="value">{record.quantity}</div>
          </div>
          <div className="detail-item">
            <div className="label">Unit Price</div>
            <div className="value">{parseFloat(record.unit_price || 0).toFixed(2)}</div>
          </div>
          <div className="detail-item">
            <div className="label">Total Amount</div>
            <div className="value">{parseFloat(record.total_amount || record.total_price || 0).toFixed(2)}</div>
          </div>
          <div className="detail-item">
            <div className="label">Invoice Number</div>
            <div className="value">{record.invoice_number || '-'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Invoice Date</div>
            <div className="value">{record.invoice_date ? new Date(record.invoice_date).toLocaleDateString() : '-'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Received Date</div>
            <div className="value">{record.received_date ? new Date(record.received_date).toLocaleDateString() : '-'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Store Received</div>
            <div className="value">{record.store_received ? 'Yes' : 'No'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Invoice Attached</div>
            <div className="value">{record.invoice_attached ? 'Yes' : 'No'}</div>
          </div>
          <div className="detail-item">
            <div className="label">GRN Completed</div>
            <div className="value">{record.grn_completed ? 'Yes' : 'No'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Remarks</div>
            <div className="value">{record.remarks || '-'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Created</div>
            <div className="value">{new Date(record.created_at).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Advance Status */}
      {canAdvance && (
        <div className="card">
          <div className="card-header">
            <h2>Advance Workflow</h2>
          </div>
          {!canAdvanceNow && record.status === 'MRN Created' && (
            <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 12 }}>
              Upload a Manual MRN Photo or Scanned Copy attachment before advancing.
            </p>
          )}
          {!canAdvanceNow && record.status === 'GRN Pending' && (
            <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 12 }}>
              An invoice must be attached before advancing.
            </p>
          )}
          {!canAdvanceNow && record.status === 'Invoice Attached' && (
            <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 12 }}>
              GRN must be completed before advancing.
            </p>
          )}
          <div className="form-group">
            <label>Remarks (optional)</label>
            <textarea
              className="form-control"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add remarks for this status change..."
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAdvanceStatus}
            disabled={!!actionLoading || !canAdvanceNow}
          >
            {actionLoading === 'advance' ? 'Processing...' : STATUS_TRANSITIONS[record.status].label}
          </button>
        </div>
      )}

      {/* GRN Completion Section */}
      {showGRNSection && (
        <div className="card">
          <div className="card-header">
            <h2>GRN Completion</h2>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Received Quantity</label>
              <input
                type="number"
                className="form-control"
                value={grnForm.received_quantity}
                onChange={(e) => setGrnForm(prev => ({ ...prev, received_quantity: e.target.value }))}
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>Checked Quantity</label>
              <input
                type="number"
                className="form-control"
                value={grnForm.checked_quantity}
                onChange={(e) => setGrnForm(prev => ({ ...prev, checked_quantity: e.target.value }))}
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
                className="form-control"
                value={grnForm.accepted_quantity}
                onChange={(e) => setGrnForm(prev => ({ ...prev, accepted_quantity: e.target.value }))}
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label>Rejected Quantity</label>
              <input
                type="number"
                className="form-control"
                value={grnForm.rejected_quantity}
                onChange={(e) => setGrnForm(prev => ({ ...prev, rejected_quantity: e.target.value }))}
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div className="form-group">
            <label>GRN Remarks</label>
            <textarea
              className="form-control"
              value={grnForm.grn_remarks}
              onChange={(e) => setGrnForm(prev => ({ ...prev, grn_remarks: e.target.value }))}
              placeholder="Enter GRN remarks..."
            />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="store_confirmation"
              checked={grnForm.store_confirmation}
              onChange={(e) => setGrnForm(prev => ({ ...prev, store_confirmation: e.target.checked }))}
            />
            <label htmlFor="store_confirmation" style={{ margin: 0 }}>Store Confirmation</label>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleSaveGRN}
            disabled={!!actionLoading}
          >
            {actionLoading === 'grn' ? 'Saving...' : 'Save GRN Details'}
          </button>
        </div>
      )}

      {/* PDF Downloads */}
      <div className="card">
        <div className="card-header">
          <h2>Documents</h2>
        </div>
        <div className="btn-group">
          <button className="btn btn-primary btn-sm" onClick={() => handleDownloadPDF('mrn')}>Download MRN Sheet</button>
          <button className="btn btn-primary btn-sm" onClick={() => handleDownloadPDF('grn')}>Download GRN Sheet</button>
        </div>
      </div>

      {/* Attachments */}
      <div className="card">
        <div className="card-header">
          <h2>Attachments ({attachments.length})</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>Upload File</button>
        </div>
        {attachments.length === 0 ? (
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>No attachments yet.</p>
        ) : (
          <ul className="attachment-list">
            {attachments.map(att => (
              <li key={att.id} className="attachment-item">
                <div className="file-info">
                  <span className="file-name">{att.original_name || att.filename}</span>
                  <span className="file-meta">{att.attachment_type} - {(att.file_size / 1024).toFixed(1)} KB</span>
                </div>
                <div className="btn-group">
                  <button className="btn btn-secondary btn-sm" onClick={() => handleDownloadAttachment(att.id, att.original_name || att.filename)}>Download</button>
                  {['Admin', 'Manager'].includes(user?.role) && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteAttachment(att.id)}>Delete</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Approval Actions */}
      {(canApprove || canComplete) && (
        <div className="card">
          <div className="card-header">
            <h2>Actions</h2>
          </div>
          <div className="form-group">
            <label>Comments</label>
            <textarea
              className="form-control"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add comments (required for rejection)..."
            />
          </div>
          <div className="btn-group">
            {canApprove && (
              <>
                <button className="btn btn-success" onClick={handleApprove} disabled={!!actionLoading}>
                  {actionLoading === 'approve' ? 'Processing...' : 'Approve'}
                </button>
                <button className="btn btn-danger" onClick={handleReject} disabled={!!actionLoading}>
                  {actionLoading === 'reject' ? 'Processing...' : 'Reject'}
                </button>
              </>
            )}
            {canComplete && (
              <button className="btn btn-primary" onClick={handleComplete} disabled={!!actionLoading}>
                {actionLoading === 'complete' ? 'Processing...' : 'Mark Completed'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Approval History */}
      {history.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Approval History</h2>
          </div>
          <div className="timeline">
            {history.map((item, idx) => (
              <div key={idx} className="timeline-item">
                <div className="event">
                  <strong>{item.action}</strong> by {item.performed_by_name || item.User?.full_name || 'System'}
                  {item.comments && <span> - {item.comments}</span>}
                </div>
                <div className="time">{new Date(item.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showUpload && (
        <AttachmentUploadModal
          purchaseId={id}
          onClose={() => setShowUpload(false)}
          onUploaded={loadData}
        />
      )}
    </div>
  );
}

export default LocalPurchaseDetailPage;
