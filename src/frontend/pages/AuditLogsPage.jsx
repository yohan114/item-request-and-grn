import React, { useState, useEffect } from 'react';
import { auditLogsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [page]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await auditLogsAPI.getAll({ page, limit: 20 });
      const data = res.data.data;
      setLogs(data?.logs || data || []);
      setTotalPages(data?.pagination?.total_pages || 1);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!['Admin', 'Manager'].includes(user?.role)) {
    return (
      <div className="card">
        <div className="empty-state">
          <h3>Access Denied</h3>
          <p>Only administrators and managers can view audit logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Audit Logs</h2>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <h3>No audit logs found</h3>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Entity Type</th>
                    <th>Entity ID</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                      <td>{log.username || log.User?.username || '-'}</td>
                      <td><span className="badge badge-completed">{log.action}</span></td>
                      <td>{log.entity_type}</td>
                      <td>{log.entity_id}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.details ? (typeof log.details === 'string' ? log.details : JSON.stringify(log.details)) : '-'}
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

export default AuditLogsPage;
