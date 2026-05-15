import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mrnAPI, mrnAttachmentsAPI, mrnPdfAPI, grnAPI, attachmentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AttachmentUploadModal from './AttachmentUploadModal';

function MRNDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [linkedGRNs, setLinkedGRNs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recordRes, attachRes, grnRes] = await Promise.all([
        mrnAPI.getById(id),
        mrnAttachmentsAPI.getByMRN(id).catch(() => ({ data: { data: [] } })),
        grnAPI.getAll({ mrn_id: id }).catch(() => ({ data: { data: [] } }))
      ]);
      setRecord(recordRes.data.data);
      setAttachments(attachRes.data.data || []);
      const grnData = grnRes.data.data;
      setLinkedGRNs(Array.isArray(grnData) ? grnData : (grnData?.records || []));
    } catch (err) {
      console.error('Failed to load MRN:', err);
    } finally {
      setLoading(false);
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

  const canEdit = record.status === 'Draft' && ['Admin', 'Manager', 'Store Keeper'].includes(user?.role);

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>
            {record.mrn_number}
            <span className={`badge badge-${(record.status || 'draft').toLowerCase()}`} style={{ marginLeft: 12 }}>
              {record.status}
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
            <div className="label">Supplier</div>
            <div className="value">{record.supplier_name}</div>
          </div>
          <div className="detail-item">
            <div className="label">Category</div>
            <div className="value">{record.purchase_category}</div>
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
            <div className="label">Quantity</div>
            <div className="value">{record.quantity}</div>
          </div>
          <div className="detail-item">
            <div className="label">Unit Price</div>
            <div className="value">{parseFloat(record.unit_price || 0).toFixed(2)}</div>
          </div>
          <div className="detail-item">
            <div className="label">Total Amount</div>
            <div className="value">{parseFloat(record.total_amount || 0).toFixed(2)}</div>
          </div>
          <div className="detail-item">
            <div className="label">Purchase Reason</div>
            <div className="value">{record.purchase_reason || '-'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Received Date</div>
            <div className="value">{record.received_date ? new Date(record.received_date).toLocaleDateString() : '-'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Status</div>
            <div className="value">{record.status}</div>
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
