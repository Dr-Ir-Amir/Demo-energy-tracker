import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post('/api/auth/refresh/', { refresh });
          localStorage.setItem('access_token', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return API(original);
        } catch {
          localStorage.clear();
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(err);
  }
);

export const auth = {
  login: (username, password) => API.post('/auth/login/', { username, password }),
  register: (username, email, password) => API.post('/auth/register/', { username, email, password }),
  me: () => API.get('/auth/me/'),
};

export const data = {
  upload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return API.post('/data/upload/', fd);
  },
  records: (params) => API.get('/data/records/', { params }),
  uploads: () => API.get('/data/uploads/'),
};

export const analytics = {
  summary: (params) => API.get('/analytics/summary/', { params }),
  trends: (params) => API.get('/analytics/trends/', { params }),
  anomalies: () => API.get('/analytics/anomalies/'),
  exportCSV: (params) => API.get('/analytics/export/csv/', { params, responseType: 'blob' }),
  exportPDF: () => API.get('/analytics/export/pdf/', { responseType: 'blob' }),
};

export default API;
