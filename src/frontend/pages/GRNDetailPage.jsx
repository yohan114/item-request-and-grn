import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { grnAPI, grnAttachmentsAPI, grnPdfAPI, attachmentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { parseMrnItems } from '../services/utils';
import AttachmentUploadModal from './AttachmentUploadModal';

function GRNDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recordRes, attachRes] = await Promise.all([
        grnAPI.getById(id),
        grnAttachmentsAPI.getByGRN(id).catch(() => ({ data: { data: [] } }))
      ]);
      setRecord(recordRes.data.data);
      setAttachments(attachRes.data.data || []);
    } catch (err) {
      console.error('Failed to load GRN:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this GRN?')) return;
    try {
      setApproving(true);
      await grnAPI.approve(id, { approval_remarks: approvalRemarks });
      setApprovalRemarks('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve GRN');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!approvalRemarks.trim()) {
      alert('Please provide remarks for rejection');
      return;
    }
    if (!confirm('Are you sure you want to reject this GRN?')) return;
    try {
      setApproving(true);
      await grnAPI.reject(id, { approval_remarks: approvalRemarks });
      setApprovalRemarks('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject GRN');
    } finally {
      setApproving(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await grnPdfAPI.getGRN(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `grn-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download GRN sheet');
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
  if (!record) return <div className="empty-state"><h3>GRN not found</h3></div>;

  const canEdit = record.status === 'Pending' && ['Admin', 'Manager', 'Store Keeper'].includes(user?.role);
  const canApprove = record.approval_status === 'Pending' && ['Engineer', 'Manager', 'Admin'].includes(user?.role);
  const items = parseMrnItems(record.items);

  const getReceivedItemDetails = (ri) => {
    let details = ri.item_details;
    if (typeof details === 'string') {
      try { details = JSON.parse(details); } catch (e) { details = {}; }
    }
    return details || {};
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>
            {record.grn_number}
            <span className={`badge badge-${(record.status || 'pending').toLowerCase()}`} style={{ marginLeft: 12 }}>
              {record.status}
            </span>
            <span className={`badge badge-${record.approval_status === 'Approved' ? 'approved' : record.approval_status === 'Rejected' ? 'rejected' : 'pending'}`} style={{ marginLeft: 8 }}>
              {record.approval_status || 'Pending'}
            </span>
          </h2>
          <div className="btn-group">
            {canEdit && (
              <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/grns/${id}/edit`)}>Edit</button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/grns')}>Back</button>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <div className="label">GRN Number</div>
            <div className="value">{record.grn_number}</div>
          </div>
          <div className="detail-item">
            <div className="label">Supplier Name</div>
            <div className="value">{record.supplier_name}</div>
          </div>
          <div className="detail-item">
            <div className="label">Project Name</div>
            <div className="value">{record.project_name || '-'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Status</div>
            <div className="value">{record.status}</div>
          </div>
          <div className="detail-item">
            <div className="label">Approval Status</div>
            <div className="value">{record.approval_status || 'Pending'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Date</div>
            <div className="value">{new Date(record.created_at || record.createdAt).toLocaleDateString()}</div>
          </div>
          {record.approver && (
            <div className="detail-item">
              <div className="label">{record.approval_status === 'Approved' ? 'Approved By' : 'Rejected By'}</div>
              <div className="value">{record.approver.full_name || record.approver.username}</div>
            </div>
          )}
          {record.approval_remarks && (
            <div className="detail-item">
              <div className="label">Approval Remarks</div>
              <div className="value">{record.approval_remarks}</div>
            </div>
          )}
        </div>
      </div>

      {/* Approval Section */}
      {canApprove && (
        <div className="card">
          <div className="card-header">
            <h2>GRN Approval</h2>
          </div>
          <div className="form-group">
            <label>Remarks</label>
            <textarea
              className="form-control"
              rows="3"
              value={approvalRemarks}
              onChange={(e) => setApprovalRemarks(e.target.value)}
              placeholder="Enter approval/rejection remarks..."
            />
          </div>
          <div className="btn-group" style={{ marginTop: 12 }}>
            <button
              className="btn btn-primary"
              onClick={handleApprove}
              disabled={approving}
            >
              {approving ? 'Processing...' : 'Approve GRN'}
            </button>
            <button
              className="btn btn-danger"
              onClick={handleReject}
              disabled={approving}
            >
              {approving ? 'Processing...' : 'Reject GRN'}
            </button>
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="card">
        <div className="card-header">
          <h2>Items</h2>
        </div>
        {items.length === 0 ? (
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>No items.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Item No</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.item_no}</td>
                    <td>{item.description}</td>
                    <td>{item.qty}</td>
                    <td>{item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Linked Received Items */}
      {record.receivedItems && record.receivedItems.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Linked Received Items</h2>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>RI Number</th>
                  <th>Item No</th>
                  <th>Description</th>
                  <th>Received Qty</th>
                  <th>GRN Status</th>
                </tr>
              </thead>
              <tbody>
                {record.receivedItems.map(ri => {
                  const details = getReceivedItemDetails(ri);
                  return (
                    <tr key={ri.id}>
                      <td>
                        <Link to={`/received-items/${ri.id}`}>{ri.ri_number}</Link>
                      </td>
                      <td>{details.item_no || '-'}</td>
                      <td>{details.description || '-'}</td>
                      <td>{ri.received_qty}</td>
                      <td>
                        <span className={`badge badge-${ri.grn_status === 'GRN Approved' ? 'approved' : ri.grn_status === 'GRN Created' ? 'pending' : 'pending'}`}>
                          {ri.grn_status || 'Pending'}
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

      {/* Signature Info */}
      {(record.request_person_name || record.approval_person_name) && (
        <div className="card">
          <div className="card-header">
            <h2>Signature Info</h2>
          </div>
          <div className="detail-grid">
            {record.request_person_name && (
              <div className="detail-item">
                <div className="label">Request Person</div>
                <div className="value">{record.request_person_name}{record.request_person_designation ? ` (${record.request_person_designation})` : ''}</div>
              </div>
            )}
            {record.approval_person_name && (
              <div className="detail-item">
                <div className="label">Approval Person</div>
                <div className="value">{record.approval_person_name}{record.approval_person_designation ? ` (${record.approval_person_designation})` : ''}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documents */}
      <div className="card">
        <div className="card-header">
          <h2>Documents</h2>
        </div>
        <div className="btn-group">
          <button className="btn btn-primary btn-sm" onClick={handleDownloadPDF}>Download GRN Sheet</button>
        </div>
      </div>

      {/* Invoice Attachment */}
      {record.invoice_attachment && (
        <div className="card">
          <div className="card-header">
            <h2>Invoice Attachment</h2>
          </div>
          <div style={{ padding: '12px 0' }}>
            {record.invoice_attachment.match(/\.(jpg|jpeg|png)$/i) ? (
              <div>
                <img
                  src={`/uploads/${record.invoice_attachment}`}
                  alt="Invoice"
                  style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 6, border: '1px solid var(--gray-200)' }}
                />
                <div style={{ marginTop: 8 }}>
                  <a
                    href={`/uploads/${record.invoice_attachment}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    View Full Image
                  </a>
                </div>
              </div>
            ) : (
              <div>
                <a
                  href={`/uploads/${record.invoice_attachment}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  View / Download Invoice ({record.invoice_attachment.split('.').pop().toUpperCase()})
                </a>
              </div>
            )}
          </div>
        </div>
      )}

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

      {showUpload && (
        <AttachmentUploadModal
          entityType="grn"
          entityId={id}
          onClose={() => setShowUpload(false)}
          onUploaded={loadData}
        />
      )}
    </div>
  );
}

export default GRNDetailPage;
