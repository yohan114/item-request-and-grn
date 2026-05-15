import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data)
};

// Local Purchases API
export const localPurchasesAPI = {
  getAll: (params) => api.get('/local-purchases', { params }),
  getById: (id) => api.get(`/local-purchases/${id}`),
  create: (data) => api.post('/local-purchases', data),
  update: (id, data) => api.put(`/local-purchases/${id}`, data),
  delete: (id) => api.delete(`/local-purchases/${id}`)
};

// Attachments API
export const attachmentsAPI = {
  getByPurchase: (id) => api.get(`/local-purchases/${id}/attachments`),
  upload: (id, formData, onProgress) => api.post(`/local-purchases/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
  }),
  download: (id) => api.get(`/attachments/${id}/download`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/attachments/${id}`)
};

// Approvals API
export const approvalsAPI = {
  approve: (id, data) => api.post(`/local-purchases/${id}/approve`, data),
  reject: (id, data) => api.post(`/local-purchases/${id}/reject`, data),
  complete: (id, data) => api.post(`/local-purchases/${id}/complete`, data),
  advanceStatus: (id, data) => api.post(`/local-purchases/${id}/advance-status`, data),
  getHistory: (id) => api.get(`/local-purchases/${id}/approval-history`)
};

// PDF API
export const pdfAPI = {
  getMRN: (id) => api.get(`/local-purchases/${id}/mrn-sheet`, { responseType: 'blob' }),
  getGRN: (id) => api.get(`/local-purchases/${id}/grn-sheet`, { responseType: 'blob' })
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
};

// Reports API
export const reportsAPI = {
  getSummary: (params) => api.get('/reports/summary', { params }),
  exportCSV: (params) => api.get('/reports/local-purchases', { params: { ...params, format: 'csv' }, responseType: 'blob' }),
  exportPDF: (params) => api.get('/reports/local-purchases', { params: { ...params, format: 'pdf' }, responseType: 'blob' })
};

// Audit Logs API
export const auditLogsAPI = {
  getAll: (params) => api.get('/audit-logs', { params }),
  getByEntity: (entityType, entityId) => api.get(`/audit-logs/${entityType}/${entityId}`)
};

// MRN API
export const mrnAPI = {
  getAll: (params) => api.get('/mrns', { params }),
  getById: (id) => api.get(`/mrns/${id}`),
  create: (data) => api.post('/mrns', data),
  update: (id, data) => api.put(`/mrns/${id}`, data),
  delete: (id) => api.delete(`/mrns/${id}`),
  approve: (id, data) => api.post(`/mrns/${id}/approve`, data),
  reject: (id, data) => api.post(`/mrns/${id}/reject`, data)
};

// GRN API
export const grnAPI = {
  getAll: (params) => api.get('/grns', { params }),
  getById: (id) => api.get(`/grns/${id}`),
  create: (data) => {
    if (data instanceof FormData) {
      return api.post('/grns', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.post('/grns', data);
  },
  update: (id, data) => {
    if (data instanceof FormData) {
      return api.put(`/grns/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.put(`/grns/${id}`, data);
  },
  delete: (id) => api.delete(`/grns/${id}`)
};

// MRN Attachments API
export const mrnAttachmentsAPI = {
  getByMRN: (id) => api.get(`/mrns/${id}/attachments`),
  upload: (id, formData, onProgress) => api.post(`/mrns/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
  })
};

// GRN Attachments API
export const grnAttachmentsAPI = {
  getByGRN: (id) => api.get(`/grns/${id}/attachments`),
  upload: (id, formData, onProgress) => api.post(`/grns/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
  })
};

// MRN PDF API
export const mrnPdfAPI = {
  getMRN: (id) => api.get(`/mrns/${id}/mrn-sheet`, { responseType: 'blob' })
};

// GRN PDF API
export const grnPdfAPI = {
  getGRN: (id) => api.get(`/grns/${id}/grn-sheet`, { responseType: 'blob' })
};

// Received Items API
export const receivedItemsAPI = {
  getAll: (params) => api.get('/received-items', { params }),
  getById: (id) => api.get(`/received-items/${id}`),
  create: (data) => {
    if (data instanceof FormData) {
      return api.post('/received-items', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.post('/received-items', data);
  },
  update: (id, data) => {
    if (data instanceof FormData) {
      return api.put(`/received-items/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.put(`/received-items/${id}`, data);
  },
  delete: (id) => api.delete(`/received-items/${id}`)
};

export default api;
