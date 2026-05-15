import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { receivedItemsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function ReceivedItemsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadRecords();
  }, [page, status]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (search) params.mrn_number = search;
      if (status) params.status = status;
      const res = await receivedItemsAPI.getAll(params);
      const data = res.data.data;
      setRecords(Array.isArray(data) ? data : []);
      setTotalPages(res.data.pagination?.total_pages || 1);
    } catch (err) {
      console.error('Failed to load received items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadRecords();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this received item?')) return;
    try {
      await receivedItemsAPI.delete(id);
      loadRecords();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const getItemDescription = (record) => {
    const details = record.item_details;
    if (!details) return '-';
    if (typeof details === 'string') {
      try {
        const parsed = JSON.parse(details);
        return parsed.description || '-';
      } catch (e) {
        return '-';
      }
    }
    return details.description || '-';
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Received Items</h2>
          {['Admin', 'Manager', 'Store Keeper'].includes(user?.role) && (
            <button className="btn btn-primary" onClick={() => navigate('/received-items/new')}>
              + New Received Item
            </button>
          )}
        </div>

        <form className="filters-bar" onSubmit={handleSearch}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by MRN number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="form-control" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Verified">Verified</option>
            <option value="Rejected">Rejected</option>
          </select>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <h3>No received item records found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>RI Number</th>
                    <th>MRN Number</th>
                    <th>Item Description</th>
                    <th>Received Qty</th>
                    <th>Status</th>
                    <th>GRN Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(record => (
                    <tr key={record.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/received-items/${record.id}`)}>
                      <td>{record.ri_number}</td>
                      <td>{record.mrn_number || '-'}</td>
                      <td>{getItemDescription(record)}</td>
                      <td>{record.received_qty}</td>
                      <td><span className={`badge badge-${(record.status || 'pending').toLowerCase()}`}>{record.status}</span></td>
                      <td>
                        <span className={`badge badge-${record.grn_status === 'GRN Approved' ? 'approved' : record.grn_status === 'GRN Created' ? 'inspection' : 'pending'}`}>
                          {record.grn_status || 'Pending'}
                        </span>
                      </td>
                      <td>{record.created_at ? new Date(record.created_at || record.createdAt).toLocaleDateString() : '-'}</td>
                      <td>
                        <div className="btn-group" onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/received-items/${record.id}`)}>View</button>
                          {record.status === 'Pending' && ['Admin', 'Manager', 'Store Keeper'].includes(user?.role) && (
                            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/received-items/${record.id}/edit`)}>Edit</button>
                          )}
                          {['Admin'].includes(user?.role) && (
                            <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(record.id, e)}>Del</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span className="page-info">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ReceivedItemsPage;
