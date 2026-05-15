import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsAPI, localPurchasesAPI, mrnAPI, grnAPI } from '../services/api';
import { getMrnItemsCount } from '../services/utils';

function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [recentMRNs, setRecentMRNs] = useState([]);
  const [recentGRNs, setRecentGRNs] = useState([]);
  const [mrnTotal, setMrnTotal] = useState(0);
  const [grnTotal, setGrnTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryRes, recentRes, mrnRes, grnRes] = await Promise.all([
        reportsAPI.getSummary(),
        localPurchasesAPI.getAll({ limit: 5, sort_by: 'created_at', sort_order: 'DESC' }),
        mrnAPI.getAll({ limit: 5 }).catch(() => ({ data: { data: [], pagination: { total: 0 } } })),
        grnAPI.getAll({ limit: 5 }).catch(() => ({ data: { data: [], pagination: { total: 0 } } }))
      ]);
      setSummary(summaryRes.data.data);
      setRecent(recentRes.data.data?.records || recentRes.data.data || []);

      const mrnData = mrnRes.data.data;
      setRecentMRNs(Array.isArray(mrnData) ? mrnData : (mrnData?.records || []));
      setMrnTotal(mrnRes.data.pagination?.total || mrnData?.pagination?.total || 0);

      const grnData = grnRes.data.data;
      setRecentGRNs(Array.isArray(grnData) ? grnData : (grnData?.records || []));
      setGrnTotal(grnRes.data.pagination?.total || grnData?.pagination?.total || 0);
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
          <span className="stat-value">{summary?.by_status?.['MRN Created'] || 0}</span>
          <span className="stat-label">MRN Created</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-value">{summary?.by_status?.['GRN Pending'] || 0}</span>
          <span className="stat-label">GRN Pending</span>
        </div>
        <div className="stat-card approved">
          <span className="stat-value">{summary?.by_status?.['Pending Approval'] || 0}</span>
          <span className="stat-label">Pending Approval</span>
        </div>
        <div className="stat-card completed">
          <span className="stat-value">{summary?.by_status?.Completed || 0}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-card total">
          <span className="stat-value">{mrnTotal}</span>
          <span className="stat-label">Total MRNs</span>
        </div>
        <div className="stat-card total">
          <span className="stat-value">{grnTotal}</span>
          <span className="stat-label">Total GRNs</span>
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
                    <td>{record.purchase_category || record.category}</td>
                    <td>{parseFloat(record.total_amount || record.total_price || 0).toFixed(2)}</td>
                    <td><span className={`badge badge-${(record.status || 'pending').toLowerCase()}`}>{record.status}</span></td>
                    <td>{new Date(record.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent MRNs */}
      <div className="card">
        <div className="card-header">
          <h2>Recent MRNs</h2>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/mrns')}>
            View All
          </button>
        </div>
        {recentMRNs.length === 0 ? (
          <div className="empty-state">
            <h3>No MRNs yet</h3>
            <p>Create your first Material Request Note.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>MRN Number</th>
                  <th>Request For</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentMRNs.map(record => {
                  const itemsCount = getMrnItemsCount(record);
                  return (
                  <tr key={record.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/mrns/${record.id}`)}>
                    <td>{record.mrn_number}</td>
                    <td>{record.request_for}</td>
                    <td>{itemsCount} item(s)</td>
                    <td><span className={`badge badge-${(record.status || 'draft').toLowerCase()}`}>{record.status}</span></td>
                    <td>{record.created_at ? new Date(record.created_at).toLocaleDateString() : '-'}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent GRNs */}
      <div className="card">
        <div className="card-header">
          <h2>Recent GRNs</h2>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/grns')}>
            View All
          </button>
        </div>
        {recentGRNs.length === 0 ? (
          <div className="empty-state">
            <h3>No GRNs yet</h3>
            <p>Create your first Goods Received Note.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>GRN Number</th>
                  <th>Supplier</th>
                  <th>Item</th>
                  <th>Received Qty</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentGRNs.map(record => (
                  <tr key={record.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/grns/${record.id}`)}>
                    <td>{record.grn_number}</td>
                    <td>{record.supplier_name}</td>
                    <td>{record.item_name}</td>
                    <td>{record.received_quantity}</td>
                    <td><span className={`badge badge-${(record.status || 'pending').toLowerCase()}`}>{record.status}</span></td>
                    <td>{record.created_at ? new Date(record.created_at).toLocaleDateString() : '-'}</td>
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
