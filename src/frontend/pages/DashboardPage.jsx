import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsAPI, localPurchasesAPI } from '../services/api';

function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryRes, recentRes] = await Promise.all([
        reportsAPI.getSummary(),
        localPurchasesAPI.getAll({ limit: 5, sort_by: 'created_at', sort_order: 'DESC' })
      ]);
      setSummary(summaryRes.data.data);
      setRecent(recentRes.data.data?.records || recentRes.data.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card total">
          <span className="stat-value">{summary?.total || 0}</span>
          <span className="stat-label">Total Records</span>
        </div>
        <div className="stat-card pending">
          <span className="stat-value">{summary?.by_status?.Pending || 0}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-card approved">
          <span className="stat-value">{summary?.by_status?.Approved || 0}</span>
          <span className="stat-label">Approved</span>
        </div>
        <div className="stat-card completed">
          <span className="stat-value">{summary?.by_status?.Completed || 0}</span>
          <span className="stat-label">Completed</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Recent Records</h2>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/local-purchases/new')}>
            + New Purchase
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state">
            <h3>No records yet</h3>
            <p>Create your first local purchase record.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(record => (
                  <tr key={record.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/local-purchases/${record.id}`)}>
                    <td>{record.supplier_name}</td>
                    <td>{record.item_name}</td>
                    <td>{record.category}</td>
                    <td>{parseFloat(record.total_price || 0).toFixed(2)}</td>
                    <td><span className={`badge badge-${(record.status || 'pending').toLowerCase()}`}>{record.status}</span></td>
                    <td>{new Date(record.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
