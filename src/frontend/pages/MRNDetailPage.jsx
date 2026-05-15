import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mrnAPI, mrnAttachmentsAPI, mrnPdfAPI, grnAPI, attachmentsAPI } from '../services/api';
import { parseMrnItems } from '../services/utils';
import { useAuth } from '../context/AuthContext';
import AttachmentUploadModal from './AttachmentUploadModal';

function MRNDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [linkedGRNs, setLinkedGRNs] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
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
      const [recordRes, attachRes, grnRes, pendingRes] = await Promise.all([
        mrnAPI.getById(id),
        mrnAttachmentsAPI.getByMRN(id).catch(() => ({ data: { data: [] } })),
        grnAPI.getAll({ mrn_id: id }).catch(() => ({ data: { data: [] } })),
        mrnAPI.getPendingItems(id).catch(() => ({ data: { data: [] } }))
      ]);
      setRecord(recordRes.data.data);
      setAttachments(attachRes.data.data || []);
      const grnData = grnRes.data.data;
      setLinkedGRNs(Array.isArray(grnData) ? grnData : (grnData?.records || []));
      setPendingItems(pendingRes.data.data || []);
    } catch (err) {
      console.error('Failed to load MRN:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this MRN?')) return;
    try {
      setApproving(true);
      await mrnAPI.approve(id, { approval_remarks: approvalRemarks || undefined });
      setApprovalRemarks('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve MRN');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!approvalRemarks.trim()) {
      alert('Remarks are required for rejection');
      return;
    }
    if (!confirm('Are you sure you want to reject this MRN?')) return;
    try {
      setApproving(true);
      await mrnAPI.reject(id, { approval_remarks: approvalRemarks });
      setApprovalRemarks('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject MRN');
    } finally {
      setApproving(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const res = await mrnPdfAPI.getMRN(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mrn-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download MRN sheet');
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
  if (!record) return <div className="empty-state"><h3>MRN not found</h3></div>;

  const canEdit = record.status === 'Draft' && record.approval_status !== 'Approved' && ['Admin', 'Manager', 'Store Keeper'].includes(user?.role);
  const canApprove = record.approval_status === 'Pending' && ['Engineer', 'Manager', 'Admin'].includes(user?.role);

  const parsedItems = parseMrnItems(record.items);

  const getApprovalBadgeClass = (status) => {
    switch (status) {
      case 'Approved': return 'badge-completed';
      case 'Rejected': return 'badge-draft';
      case 'Pending': return 'badge-submitted';
      default: return 'badge-draft';
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>
            {record.mrn_number}
            <span className={`badge badge-${(record.status || 'draft').toLowerCase()}`} style={{ marginLeft: 12 }}>
              {record.status}
            </span>
            <span className={`badge ${getApprovalBadgeClass(record.approval_status)}`} style={{ marginLeft: 8 }}>
              {record.approval_status || 'Pending'}
            </span>
          </h2>
          <div className="btn-group">
            {canEdit && (
              <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/mrns/${id}/edit`)}>Edit</button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/mrns')}>Back</button>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <div className="label">MRN Number</div>
            <div className="value">{record.mrn_number}</div>
          </div>
          <div className="detail-item">
            <div className="label">Date</div>
            <div className="value">{new Date(record.created_at || record.createdAt).toLocaleDateString()}</div>
          </div>
          <div className="detail-item">
            <div className="label">Request For</div>
            <div className="value">{record.request_for}</div>
          </div>
          <div className="detail-item">
            <div className="label">Status</div>
            <div className="value">{record.status}</div>
          </div>
          <div className="detail-item">
            <div className="label">Approval Status</div>
            <div className="value">
              <span className={`badge ${getApprovalBadgeClass(record.approval_status)}`}>
                {record.approval_status || 'Pending'}
              </span>
            </div>
          </div>
          <div className="detail-item">
            <div className="label">Request Person</div>
            <div className="value">
              {record.request_person_name || '-'}
              {record.request_person_designation ? ` (${record.request_person_designation})` : ''}
            </div>
          </div>
          <div className="detail-item">
            <div className="label">Approval Person</div>
            <div className="value">
              {record.approval_person_name || '-'}
              {record.approval_person_designation ? ` (${record.approval_person_designation})` : ''}
            </div>
          </div>
          {record.approver && (
            <div className="detail-item">
              <div className="label">Approved/Rejected By</div>
              <div className="value">{record.approver.full_name || record.approver.username}</div>
            </div>
          )}
          {record.approval_remarks && (
            <div className="detail-item">
              <div className="label">Approval Remarks</div>
              <div className="value">{record.approval_remarks}</div>
            </div>
          )}
          <div className="detail-item">
            <div className="label">Created</div>
            <div className="value">{new Date(record.created_at || record.createdAt).toLocaleString()}</div>
          </div>
        </div>

        {/* Approval Actions */}
        {canApprove && (
          <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
            <h3>Approval Action</h3>
            <div className="form-group" style={{ marginTop: 8 }}>
              <label>Remarks</label>
              <textarea
                className="form-control"
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                placeholder="Enter remarks (required for rejection)"
                rows={3}
              />
            </div>
            <div className="btn-group" style={{ marginTop: 8 }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleApprove}
                disabled={approving}
              >
                {approving ? 'Processing...' : 'Approve'}
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleReject}
                disabled={approving}
              >
                {approving ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        )}

        {/* Items Table */}
        {parsedItems.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h3>Items</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Item No</th>
                    <th>Description</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedItems.map((item, index) => (
                    <tr key={index}>
                      <td>{item.item_no}</td>
                      <td>{item.description}</td>
                      <td>{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pending Items */}
      <div className="card">
        <div className="card-header">
          <h2>
            Pending Items
            {record.status === 'Completed' && (
              <span className="badge badge-completed" style={{ marginLeft: 12 }}>All Items Received</span>
            )}
          </h2>
        </div>
        {pendingItems.length === 0 ? (
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            {record.status === 'Completed' ? 'All items have been received.' : 'No pending items.'}
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Item No</th>
                  <th>Description</th>
                  <th>Required Qty</th>
                  <th>Received Qty</th>
                  <th>Remaining Qty</th>
                </tr>
              </thead>
              <tbody>
                {pendingItems.map((item, index) => (
                  <tr key={index}>
                    <td>{item.item_no}</td>
                    <td>{item.description}</td>
                    <td>{item.qty}</td>
                    <td>{item.total_received}</td>
                    <td style={{ color: item.remaining_qty > 0 ? '#d97706' : undefined, fontWeight: item.remaining_qty > 0 ? 600 : undefined }}>
                      {item.remaining_qty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="card">
        <div className="card-header">
          <h2>Documents</h2>
        </div>
        <div className="btn-group">
          <button className="btn btn-primary btn-sm" onClick={handleDownloadPDF}>Download MRN Sheet</button>
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

      {/* Linked GRNs */}
      <div className="card">
        <div className="card-header">
          <h2>Linked GRNs ({linkedGRNs.length})</h2>
          {['Admin', 'Manager', 'Store Keeper'].includes(user?.role) && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/grns/new?mrn_id=${id}`)}>Create GRN</button>
          )}
        </div>
        {linkedGRNs.length === 0 ? (
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>No GRNs linked to this MRN.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>GRN Number</th>
                  <th>Status</th>
                  <th>Received Qty</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {linkedGRNs.map(grn => (
                  <tr key={grn.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/grns/${grn.id}`)}>
                    <td>{grn.grn_number}</td>
                    <td><span className={`badge badge-${(grn.status || 'pending').toLowerCase()}`}>{grn.status}</span></td>
                    <td>{grn.received_quantity}</td>
                    <td>{grn.created_at ? new Date(grn.created_at || grn.createdAt).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUpload && (
        <AttachmentUploadModal
          entityType="mrn"
          entityId={id}
          onClose={() => setShowUpload(false)}
          onUploaded={loadData}
        />
      )}
    </div>
  );
}

export default MRNDetailPage;
