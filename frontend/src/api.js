// Thin fetch-based API client for the DiaCare backend.
// All endpoints match backend/app routers exactly (see README for the full list).

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function getToken() {
  return localStorage.getItem('diacare_token')
}

async function request(path, { method = 'GET', body, isForm = false, auth = true } = {}) {
  const headers = {}
  if (!isForm) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  })

  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const data = await res.json()
      detail = data.detail || detail
    } catch (_) {
      /* non-JSON error body */
    }
    throw new Error(detail)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/pdf')) return res.blob()
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Auth
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: payload, auth: false }),
  changePassword: (payload) => request('/auth/change-password', { method: 'POST', body: payload }),

  // Profile
  me: () => request('/users/me'),
  updateMe: (payload) => request('/users/me', { method: 'PATCH', body: payload }),

  // Admin
  listUsers: () => request('/users'),
  createUser: (payload) => request('/users', { method: 'POST', body: payload }),
  deactivateUser: (id) => request(`/users/${id}/deactivate`, { method: 'PATCH' }),
  reactivateUser: (id) => request(`/users/${id}/reactivate`, { method: 'PATCH' }),
  resetUserPassword: (id) => request(`/users/${id}/reset`, { method: 'POST' }),
  adminStats: () => request('/admin/stats'),

  // Prediction
  predict: (payload) => request('/predict', { method: 'POST', body: payload }),
  simulate: (payload) => request('/simulate', { method: 'POST', body: payload }),
  scan: (file) => {
    const form = new FormData()
    form.append('file', file)
    return request('/scan', { method: 'POST', body: form, isForm: true })
  },

  // Patients / Reports
  listPatients: () => request('/patients'),
  createPatient: (payload) => request('/patients', { method: 'POST', body: payload }),
  getPatient: (id) => request(`/patients/${id}`),
  getPatientReports: (id) => request(`/patients/${id}/reports`),
  createReport: (payload) => request('/reports', { method: 'POST', body: payload }),
  getReport: (id) => request(`/reports/${id}`),
  updateReportStatus: (id, status) => request(`/reports/${id}/status`, { method: 'PATCH', body: { status } }),
  updateReportValues: (id, payload) => request(`/reports/${id}`, { method: 'PATCH', body: payload }),
  downloadReportPdf: (id) => request(`/reports/${id}/pdf`),

  // Chat
  chat: (payload) => request('/chat', { method: 'POST', body: payload }),

  health: () => request('/health', { auth: false }),
}

export { getToken, BASE_URL }
