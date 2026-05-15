import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mrnAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function MRNsPage() {
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
      if (search) params.search = search;
      if (status) params.status = status;
      const res = await mrnAPI.getAll(params);
      const data = res.data.data;
      setRecords(Array.isArray(data) ? data : (data?.records || []));
      setTotalPages(res.data.pagination?.total_pages || data?.pagination?.total_pages || 1);
    } catch (err) {
      console.error('Failed to load MRNs:', err);
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
    if (!confirm('Are you sure you want to delete this MRN?')) return;
    try {
      await mrnAPI.delete(id);
      loadRecords();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const getItemsCount = (record) => {
    if (!record.items) return 0;
    if (Array.isArray(record.items)) return record.items.length;
    try {
      const parsed = JSON.parse(record.items);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch (e) {
      return 0;
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Material Request Notes (MRN)</h2>
          {['Admin', 'Manager', 'Store Keeper'].includes(user?.role) && (
            <button className="btn btn-primary" onClick={() => navigate('/mrns/new')}>
              + New MRN
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
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Purchased">Purchased</option>
            <option value="Delivered">Delivered</option>
            <option value="Completed">Completed</option>
          </select>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <h3>No MRN records found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>MRN Number</th>
                    <th>Date</th>
                    <th>Request For</th>
                    <th>Items</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(record => (
                    <tr key={record.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/mrns/${record.id}`)}>
                      <td>{record.mrn_number}</td>
                      <td>{record.created_at ? new Date(record.created_at).toLocaleDateString() : '-'}</td>
                      <td>{record.request_for}</td>
                      <td>{getItemsCount(record)} item(s)</td>
                      <td><span className={`badge badge-${(record.status || 'draft').toLowerCase()}`}>{record.status}</span></td>
                      <td>
                        <div className="btn-group" onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/mrns/${record.id}`)}>View</button>
                          {record.status === 'Draft' && ['Admin', 'Manager', 'Store Keeper'].includes(user?.role) && (
                            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/mrns/${record.id}/edit`)}>Edit</button>
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

export default MRNsPage;
