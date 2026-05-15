import React, { useState, useRef } from 'react';
import { attachmentsAPI, mrnAttachmentsAPI, grnAttachmentsAPI } from '../services/api';

function AttachmentUploadModal({ purchaseId, entityType, entityId, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [type, setType] = useState('Manual MRN Photo');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragover, setDragover] = useState(false);
  const fileInputRef = useRef(null);

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  const handleFileSelect = (selectedFile) => {
    setError('');
    if (!selectedFile) return;

    if (selectedFile.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleUpload = async () => {
    if (!file) { setError('Please select a file'); return; }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('attachment_type', type);

    setUploading(true);
    setProgress(0);

    try {
      const onProgress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      if (entityType === 'mrn') {
        await mrnAttachmentsAPI.upload(entityId, formData, onProgress);
      } else if (entityType === 'grn') {
        await grnAttachmentsAPI.upload(entityId, formData, onProgress);
      } else {
        await attachmentsAPI.upload(purchaseId, formData, onProgress);
      }
      onUploaded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload Attachment</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group">
          <label>Attachment Type</label>
          <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="Manual MRN Photo">Manual MRN Photo</option>
            <option value="Manual MRN Scanned Copy">Manual MRN Scanned Copy</option>
            <option value="GRN Photo">GRN Photo</option>
            <option value="GRN Scanned Copy">GRN Scanned Copy</option>
            <option value="Invoice">Invoice</option>
            <option value="Delivery Note">Delivery Note</option>
            <option value="Quotation">Quotation</option>
            <option value="Payment Proof">Payment Proof</option>
            <option value="Signed MRN Sheet">Signed MRN Sheet</option>
            <option value="Signed GRN Sheet">Signed GRN Sheet</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div
          className={`upload-area ${dragover ? 'dragover' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
          onDragLeave={() => setDragover(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
          {file ? (
            <div>
              <p style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{file.name}</p>
              <p>{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 24 }}>&#128206;</p>
              <p>Drag and drop a file here or click to browse</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>Max size: 10MB</p>
            </div>
          )}
        </div>

        {uploading && (
          <div className="progress-bar mt-1">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
        )}

        <div className="btn-group mt-2">
          <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? `Uploading... ${progress}%` : 'Upload'}
          </button>
          <button className="btn btn-secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default AttachmentUploadModal;
