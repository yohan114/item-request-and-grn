import React, { useState, useEffect } from 'react';
import { usersAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'Viewer'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await usersAPI.getAll();
      setUsers(res.data.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ username: '', email: '', full_name: '', password: '', role: 'Viewer' });
    setEditUser(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (u) => {
    setEditUser(u);
    setForm({
      username: u.username,
      email: u.email || '',
      full_name: u.full_name || '',
      password: '',
      role: u.role
    });
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editUser) {
        const updateData = { role: form.role, full_name: form.full_name, email: form.email };
        await usersAPI.update(editUser.id, updateData);
        setSuccess('User updated successfully');
      } else {
        await authAPI.register(form);
        setSuccess('User created successfully');
      }
      resetForm();
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    try {
      await usersAPI.delete(userId);
      setSuccess('User deactivated');
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="card">
        <div className="empty-state">
          <h3>Access Denied</h3>
          <p>Only administrators can manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <div className="card-header">
          <h2>Users</h2>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            + New User
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.full_name || '-'}</td>
                    <td>{u.email || '-'}</td>
                    <td><span className="badge badge-completed">{u.role}</span></td>
                    <td>
                      <span className={`badge ${u.is_active !== false ? 'badge-approved' : 'badge-rejected'}`}>
                        {u.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group">
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(u)}>Edit</button>
                        {u.id !== user.id && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>Deactivate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editUser ? 'Edit User' : 'Create User'}</h2>
              <button className="modal-close" onClick={resetForm}>&times;</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              {!editUser && (
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.username}
                    onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>
              )}
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.full_name}
                  onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              {!editUser && (
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    value={form.password}
                    onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                    required={!editUser}
                    minLength={6}
                  />
                </div>
              )}
              <div className="form-group">
                <label>Role *</label>
                <select className="form-control" value={form.role} onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Store Keeper">Store Keeper</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              <div className="btn-group mt-2">
                <button type="submit" className="btn btn-primary">
                  {editUser ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersPage;
