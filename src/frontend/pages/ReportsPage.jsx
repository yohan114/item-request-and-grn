import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../services/api';

function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    status: '',
    category: ''
  });
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      const res = await reportsAPI.getSummary(params);
      setSummary(res.data.data);
    } catch (err) {
      console.error('Failed to load summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const params = {};
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;

      const res = format === 'csv'
        ? await reportsAPI.exportCSV(params)
        : await reportsAPI.exportPDF(params);

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setExporting('');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Report Filters</h2>
          <div className="btn-group">
            <button className="btn btn-primary btn-sm" onClick={() => handleExport('csv')} disabled={!!exporting}>
              {exporting === 'csv' ? 'Exporting...' : 'Export CSV'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => handleExport('pdf')} disabled={!!exporting}>
              {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </div>

        <div className="filters-bar">
          <input
            type="date"
            className="form-control"
            value={filters.start_date}
            onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
            placeholder="Start Date"
          />
          <input
            type="date"
            className="form-control"
            value={filters.end_date}
            onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
            placeholder="End Date"
          />
          <select className="form-control" value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Completed">Completed</option>
          </select>
          <select className="form-control" value={filters.category} onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}>
            <option value="">All Categories</option>
            <option value="Office Supplies">Office Supplies</option>
            <option value="IT Equipment">IT Equipment</option>
            <option value="Furniture">Furniture</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Raw Materials">Raw Materials</option>
            <option value="Other">Other</option>
          </select>
          <button className="btn btn-primary" onClick={loadSummary}>Apply</button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading summary...</div>
      ) : summary ? (
        <>
          <div className="stats-grid">
            <div className="stat-card total">
              <span className="stat-value">{summary.total || 0}</span>
              <span className="stat-label">Total Records</span>
            </div>
            <div className="stat-card pending">
              <span className="stat-value">{summary.by_status?.Pending || 0}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-card approved">
              <span className="stat-value">{summary.by_status?.Approved || 0}</span>
              <span className="stat-label">Approved</span>
            </div>
            <div className="stat-card rejected">
              <span className="stat-value">{summary.by_status?.Rejected || 0}</span>
              <span className="stat-label">Rejected</span>
            </div>
            <div className="stat-card completed">
              <span className="stat-value">{summary.by_status?.Completed || 0}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>

          {summary.by_category && Object.keys(summary.by_category).length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2>By Category</h2>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Count</th>
                      <th>Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.by_category).map(([cat, data]) => (
                      <tr key={cat}>
                        <td>{cat}</td>
                        <td>{typeof data === 'object' ? data.count : data}</td>
                        <td>{typeof data === 'object' && data.total_value ? parseFloat(data.total_value).toFixed(2) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

export default ReportsPage;
