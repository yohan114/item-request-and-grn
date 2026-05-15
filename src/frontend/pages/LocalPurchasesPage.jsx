import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { localPurchasesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function LocalPurchasesPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadRecords();
  }, [page, status, category]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (status) params.status = status;
      if (category) params.category = category;
      const res = await localPurchasesAPI.getAll(params);
      const data = res.data.data;
      setRecords(data?.records || data || []);
      setTotalPages(data?.pagination?.total_pages || 1);
    } catch (err) {
      console.error('Failed to load records:', err);
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
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      await localPurchasesAPI.delete(id);
      loadRecords();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Local Purchases</h2>
          {['Admin', 'Manager', 'Store Keeper'].includes(user?.role) && (
            <button className="btn btn-primary" onClick={() => navigate('/local-purchases/new')}>
              + New Purchase
            </button>
          )}
        </div>

        <form className="filters-bar" onSubmit={handleSearch}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by supplier, item, invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="form-control" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Completed">Completed</option>
          </select>
          <select className="form-control" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            <option value="Office Supplies">Office Supplies</option>
            <option value="IT Equipment">IT Equipment</option>
            <option value="Furniture">Furniture</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Raw Materials">Raw Materials</option>
            <option value="Other">Other</option>
          </select>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <h3>No records found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Invoice Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(record => (
                    <tr key={record.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/local-purchases/${record.id}`)}>
                      <td>{record.supplier_name}</td>
                      <td>{record.item_name}</td>
                      <td>{record.category}</td>
                      <td>{record.quantity}</td>
                      <td>{parseFloat(record.total_price || 0).toFixed(2)}</td>
                      <td><span className={`badge badge-${(record.status || 'pending').toLowerCase()}`}>{record.status}</span></td>
                      <td>{record.invoice_date ? new Date(record.invoice_date).toLocaleDateString() : '-'}</td>
                      <td>
                        <div className="btn-group" onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/local-purchases/${record.id}`)}>View</button>
                          {record.status === 'Pending' && ['Admin', 'Manager', 'Store Keeper'].includes(user?.role) && (
                            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/local-purchases/${record.id}/edit`)}>Edit</button>
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

export default LocalPurchasesPage;
