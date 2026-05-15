import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { receivedItemsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function ReceivedItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await receivedItemsAPI.getById(id);
      setRecord(res.data.data);
    } catch (err) {
      console.error('Failed to load received item:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!record) return <div className="empty-state"><h3>Received item not found</h3></div>;

  const canEdit = record.status === 'Pending' && ['Admin', 'Manager', 'Store Keeper'].includes(user?.role);

  let itemDetails = record.item_details;
  if (typeof itemDetails === 'string') {
    try {
      itemDetails = JSON.parse(itemDetails);
    } catch (e) {
      itemDetails = {};
    }
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>
            {record.ri_number}
            <span className={`badge badge-${(record.status || 'pending').toLowerCase()}`} style={{ marginLeft: 12 }}>
              {record.status}
            </span>
          </h2>
          <div className="btn-group">
            {canEdit && (
              <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/received-items/${id}/edit`)}>Edit</button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/received-items')}>Back</button>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <div className="label">RI Number</div>
            <div className="value">{record.ri_number}</div>
          </div>
          <div className="detail-item">
            <div className="label">MRN Number</div>
            <div className="value">
              {record.mrn_id ? (
                <Link to={`/mrns/${record.mrn_id}`}>{record.mrn_number || record.mrn_id}</Link>
              ) : (
                record.mrn_number || '-'
              )}
            </div>
          </div>
          <div className="detail-item">
            <div className="label">Status</div>
            <div className="value">{record.status}</div>
          </div>
          <div className="detail-item">
            <div className="label">Received Quantity</div>
            <div className="value">{record.received_qty}</div>
          </div>
          <div className="detail-item">
            <div className="label">Date</div>
            <div className="value">{new Date(record.created_at || record.createdAt).toLocaleDateString()}</div>
          </div>
          <div className="detail-item">
            <div className="label">Created By</div>
            <div className="value">{record.creator?.full_name || record.creator?.username || '-'}</div>
          </div>
        </div>
      </div>

      {/* Selected Item Details */}
      <div className="card">
        <div className="card-header">
          <h2>Item Details (from MRN)</h2>
        </div>
        <div className="detail-grid">
          <div className="detail-item">
            <div className="label">Item No</div>
            <div className="value">{itemDetails.item_no || '-'}</div>
          </div>
          <div className="detail-item">
            <div className="label">Description</div>
            <div className="value">{itemDetails.description || '-'}</div>
          </div>
          <div className="detail-item">
            <div className="label">MRN Qty</div>
            <div className="value">{itemDetails.qty || '-'}</div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {record.notes && (
        <div className="card">
          <div className="card-header">
            <h2>Notes</h2>
          </div>
          <p style={{ whiteSpace: 'pre-wrap' }}>{record.notes}</p>
        </div>
      )}

      {/* Image */}
      {record.image && (
        <div className="card">
          <div className="card-header">
            <h2>Received Item Image</h2>
          </div>
          <div style={{ padding: '12px 0' }}>
            <img
              src={`/uploads/${record.image}`}
              alt="Received Item"
              style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 6, border: '1px solid var(--gray-200)' }}
            />
            <div style={{ marginTop: 8 }}>
              <a
                href={`/uploads/${record.image}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                View Full Image
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReceivedItemDetailPage;
