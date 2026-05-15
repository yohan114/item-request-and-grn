import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { localPurchasesAPI, attachmentsAPI, approvalsAPI, pdfAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AttachmentUploadModal from './AttachmentUploadModal';

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
      setRecord(recordRes.data.data);
      setAttachments(attachRes.data.data || []);
      setHistory(historyRes.data.data || []);
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

  const canApprove = ['Admin', 'Manager'].includes(user?.role) && record.status === 'Pending';
  const canComplete = ['Admin', 'Manager', 'Store Keeper'].includes(user?.role) && record.status === 'Approved';

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>
            {record.item_name}
            <span className={`badge badge-${(record.status || 'pending').toLowerCase()}`} style={{ marginLeft: 12 }}>
              {record.status}
            </span>
          </h2>
          <div className="btn-group">
            {record.status === 'Pending' && ['Admin', 'Manager', 'Store Keeper'].includes(user?.role) && (
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
            <div className="value">{record.category}</div>
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
            <div className="label">Total Price</div>
            <div className="value">{parseFloat(record.total_price || 0).toFixed(2)}</div>
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
            <div className="label">Remarks</div>
            <div className="value">{record.remarks || '-'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Created</div>
            <div className="value">{new Date(record.created_at).toLocaleString()}</div>
          </div>
        </div>
      </div>

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
