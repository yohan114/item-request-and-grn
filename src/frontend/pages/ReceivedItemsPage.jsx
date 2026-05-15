import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { receivedItemsAPI, mrnAPI } from '../services/api';
import { parseMrnItems } from '../services/utils';
import { useAuth } from '../context/AuthContext';

function ReceivedItemsPage() {
  const [records, setRecords] = useState([]);
  const [openMrns, setOpenMrns] = useState([]);
  const [closedMrns, setClosedMrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMrns, setLoadingMrns] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState('open');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadRecords();
    loadMrnData();
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

  const loadMrnData = async () => {
    try {
      setLoadingMrns(true);
      const [openRes, closedRes] = await Promise.all([
        mrnAPI.getAll({ status: 'Approved', limit: 100 }).catch(() => ({ data: { data: [] } })),
        mrnAPI.getAll({ status: 'Fully Received', limit: 100 }).catch(() => ({ data: { data: [] } }))
      ]);
      // Also load Partially Received and Received Pending
      const [partialRes, pendingRes, closedStatusRes] = await Promise.all([
        mrnAPI.getAll({ status: 'Partially Received', limit: 100 }).catch(() => ({ data: { data: [] } })),
        mrnAPI.getAll({ status: 'Received Pending', limit: 100 }).catch(() => ({ data: { data: [] } })),
        mrnAPI.getAll({ status: 'Closed', limit: 100 }).catch(() => ({ data: { data: [] } }))
      ]);

      const openData = openRes.data.data;
      const partialData = partialRes.data.data;
      const pendingData = pendingRes.data.data;
      const openList = [
        ...(Array.isArray(openData) ? openData : (openData?.records || [])),
        ...(Array.isArray(partialData) ? partialData : (partialData?.records || [])),
        ...(Array.isArray(pendingData) ? pendingData : (pendingData?.records || []))
      ];
      setOpenMrns(openList);

      const closedData = closedRes.data.data;
      const closedStatusData = closedStatusRes.data.data;
      const closedList = [
        ...(Array.isArray(closedData) ? closedData : (closedData?.records || [])),
        ...(Array.isArray(closedStatusData) ? closedStatusData : (closedStatusData?.records || []))
      ];
      setClosedMrns(closedList);
    } catch (err) {
      console.error('Failed to load MRN data:', err);
    } finally {
      setLoadingMrns(false);
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
        return parsed.description || parsed.item_name || '-';
      } catch (e) {
        return '-';
      }
    }
    return details.description || details.item_name || '-';
  };

  const getGrnStatusBadgeStyle = (grnStatus) => {
    switch (grnStatus) {
      case 'GRN Approved': return { background: '#0d9488', color: '#fff' };
      case 'GRN Created': return { background: '#6366f1', color: '#fff' };
      case 'Pending': return { background: '#f59e0b', color: '#fff' };
      default: return { background: '#94a3b8', color: '#fff' };
    }
  };

  const getMrnItemsSummary = (mrn) => {
    const items = parseMrnItems(mrn.items);
    const total = items.length;
    const received = items.filter(i => i.item_status === 'Fully Received' || i.item_status === 'GRN Completed').length;
    const pending = total - received;
    return { total, received, pending };
  };

  const getItemStatusBadgeStyle = (itemStatus) => {
    switch (itemStatus) {
      case 'Pending Approval': return { background: '#94a3b8', color: '#fff' };
      case 'Approved': return { background: '#16a34a', color: '#fff' };
      case 'Pending Receive': return { background: '#f59e0b', color: '#fff' };
      case 'Partially Received': return { background: '#d97706', color: '#fff' };
      case 'Fully Received': return { background: '#059669', color: '#fff' };
      case 'GRN Pending': return { background: '#6366f1', color: '#fff' };
      case 'GRN Completed': return { background: '#0d9488', color: '#fff' };
      default: return { background: '#94a3b8', color: '#fff' };
    }
  };

  const renderMrnList = (mrnList, emptyMsg) => {
    if (loadingMrns) return <div className="loading">Loading MRNs...</div>;
    if (mrnList.length === 0) {
      return <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>{emptyMsg}</p>;
    }
    return (
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>MRN Number</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Items</th>
              <th>Received</th>
              <th>Pending</th>
            </tr>
          </thead>
          <tbody>
            {mrnList.map(mrn => {
              const summary = getMrnItemsSummary(mrn);
              return (
                <tr key={mrn.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/mrns/${mrn.id}`)}>
                  <td>{mrn.mrn_number}</td>
                  <td>{mrn.supplier_name || '-'}</td>
                  <td>
                    <span className="badge" style={getStatusBadgeStyle(mrn.status)}>{mrn.status}</span>
                  </td>
                  <td>{summary.total} item(s)</td>
                  <td style={{ color: '#16a34a', fontWeight: 600 }}>{summary.received}</td>
                  <td>
                    {summary.pending > 0 ? (
                      <span className="badge" style={{ background: '#f59e0b', color: '#fff' }}>{summary.pending} pending</span>
                    ) : (
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>All done</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Draft': return {};
      case 'Submitted': return { background: '#3b82f6', color: '#fff' };
      case 'Approved': return { background: '#16a34a', color: '#fff' };
      case 'Received Pending': return { background: '#f59e0b', color: '#fff' };
      case 'Partially Received': return { background: '#d97706', color: '#fff' };
      case 'Fully Received': return { background: '#059669', color: '#fff' };
      case 'Closed': return { background: '#6b7280', color: '#fff' };
      default: return {};
    }
  };

  return (
    <div>
      {/* MRN Tabs Section */}
      <div className="card">
        <div className="card-header">
          <h2>MRN Overview</h2>
        </div>
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setActiveTab('open')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === 'open' ? '#3b82f6' : 'transparent',
              color: activeTab === 'open' ? '#fff' : '#64748b',
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0'
            }}
          >
            Open MRNs ({openMrns.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('closed')}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === 'closed' ? '#3b82f6' : 'transparent',
              color: activeTab === 'closed' ? '#fff' : '#64748b',
              fontWeight: 600,
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0'
            }}
          >
            Closed MRNs ({closedMrns.length})
          </button>
        </div>
        {activeTab === 'open' && renderMrnList(openMrns, 'No open MRNs with pending items.')}
        {activeTab === 'closed' && renderMrnList(closedMrns, 'No closed MRNs.')}
      </div>

      {/* Received Items List */}
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
                        <span className="badge" style={getGrnStatusBadgeStyle(record.grn_status)}>
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
