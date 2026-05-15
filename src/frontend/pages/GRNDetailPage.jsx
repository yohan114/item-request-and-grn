import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { grnAPI, grnAttachmentsAPI, grnPdfAPI, attachmentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AttachmentUploadModal from './AttachmentUploadModal';

function GRNDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

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

  const linkedMRN = record.mrn || record.MRN || null;
  const canEdit = record.status === 'Pending' && ['Admin', 'Manager', 'Store Keeper'].includes(user?.role);

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>
            {record.grn_number}
            <span className={`badge badge-${(record.status || 'pending').toLowerCase()}`} style={{ marginLeft: 12 }}>
              {record.status}
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
            <div className="label">Supplier</div>
            <div className="value">{record.supplier_name}</div>
          </div>
          <div className="detail-item">
            <div className="label">Item Name</div>
            <div className="value">{record.item_name}</div>
          </div>
          <div className="detail-item">
            <div className="label">Item Description</div>
            <div className="value">{record.item_description || '-'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Status</div>
            <div className="value">{record.status}</div>
          </div>
          <div className="detail-item">
            <div className="label">Received Date</div>
            <div className="value">{record.received_date ? new Date(record.received_date).toLocaleDateString() : '-'}</div>
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
            <div className="label">Invoice Attached</div>
            <div className="value">{record.invoice_attached ? 'Yes' : 'No'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Store Confirmation</div>
            <div className="value">{record.store_confirmation ? 'Yes' : 'No'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Remarks</div>
            <div className="value">{record.remarks || '-'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Created</div>
            <div className="value">{new Date(record.created_at || record.createdAt).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Linked MRN */}
      {linkedMRN && (
        <div className="card">
          <div className="card-header">
            <h2>Linked MRN</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/mrns/${linkedMRN.id}`)}>View MRN</button>
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <div className="label">MRN Number</div>
              <div className="value">{linkedMRN.mrn_number}</div>
            </div>
            <div className="detail-item">
              <div className="label">Supplier</div>
              <div className="value">{linkedMRN.supplier_name}</div>
            </div>
            <div className="detail-item">
              <div className="label">Item</div>
              <div className="value">{linkedMRN.item_name}</div>
            </div>
            <div className="detail-item">
              <div className="label">Status</div>
              <div className="value">{linkedMRN.status}</div>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Details */}
      <div className="card">
        <div className="card-header">
          <h2>Quantity Details</h2>
        </div>
        <div className="detail-grid">
          <div className="detail-item">
            <div className="label">Received Quantity</div>
            <div className="value">{record.received_quantity ?? '-'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Checked Quantity</div>
            <div className="value">{record.checked_quantity ?? '-'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Accepted Quantity</div>
            <div className="value">{record.accepted_quantity ?? '-'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Rejected Quantity</div>
            <div className="value">{record.rejected_quantity ?? '-'}</div>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="card">
        <div className="card-header">
          <h2>Documents</h2>
        </div>
        <div className="btn-group">
          <button className="btn btn-primary btn-sm" onClick={handleDownloadPDF}>Download GRN Sheet</button>
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
