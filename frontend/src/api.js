// Thin fetch-based API client for the DiaCare backend.
// All endpoints match backend/app routers exactly (see README for the full list).

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api' : 'https://diacare-backend-nukb.onrender.com')).replace(/\/+$/, '')


function getToken() {
  return localStorage.getItem('diacare_token')
}

function getDoctorToken() {
  return localStorage.getItem('diacare_doctor_token')
}

async function request(path, { method = 'GET', body, isForm = false, auth = true, doctorAuth = false } = {}) {
  const headers = {}
  if (!isForm) headers['Content-Type'] = 'application/json'
  if (doctorAuth) {
    const dToken = getDoctorToken()
    if (dToken) headers['Authorization'] = `Bearer ${dToken}`
  } else if (auth) {
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
  verifyOtp: (payload) => request('/auth/verify-otp', { method: 'POST', body: payload, auth: false }),
  resendOtp: (payload) => request('/auth/resend-otp', { method: 'POST', body: payload, auth: false }),
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
  approveUser: (id) => request(`/users/${id}/approve`, { method: 'POST' }),
  rejectUser: (id) => request(`/users/${id}/reject`, { method: 'POST' }),
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

  // Lab Reports (Phase 1, Phase 2, & Phase 3)
  getLabReference: () => request('/v1/lab-tests/reference'),
  createLabReport: (payload) => request('/v1/reports/manual', { method: 'POST', body: payload }),
  uploadLabReport: (file, labName = 'Diagnostic Laboratory') => {
    const form = new FormData()
    form.append('file', file)
    if (labName) form.append('lab_name', labName)
    return request('/v1/reports/upload', { method: 'POST', body: form, isForm: true })
  },
  confirmLabReport: (id, payload) => request(`/v1/reports/${id}/confirm`, { method: 'POST', body: payload }),
  getLabReport: (id) => request(`/v1/reports/${id}`),

  // Phase 3 Trends & History
  getPatientLabSummary: (patientId) => request(`/v1/patients/${patientId}/lab-summary`),
  getTestTrend: (patientId, testName) => request(`/v1/patients/${patientId}/lab-trend/${encodeURIComponent(testName)}`),
  getRiskFlagHistory: (patientId) => request(`/v1/patients/${patientId}/risk-flag-history`),
  getPatientLabReports: (patientId, skip = 0, limit = 20) => request(`/v1/patients/${patientId}/reports?skip=${skip}&limit=${limit}`),

  // Phase 4 PDF Export & Doctor Share
  downloadSingleReportPdf: async (reportId) => {
    const token = getToken()
    const res = await fetch(`${BASE_URL}/v1/reports/${reportId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to download report PDF')
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diacare_lab_report_${reportId.slice(0, 8)}.pdf`
    a.click()
    window.URL.revokeObjectURL(url)
  },
  downloadSummaryPdf: async (patientId) => {
    const token = getToken()
    const res = await fetch(`${BASE_URL}/v1/patients/${patientId}/summary-pdf`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Failed to download summary PDF')
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diacare_patient_summary_${patientId.slice(0, 8)}.pdf`
    a.click()
    window.URL.revokeObjectURL(url)
  },
  shareReport: (reportId) => request(`/v1/reports/${reportId}/share`, { method: 'POST' }),
  shareSummary: (patientId) => request(`/v1/patients/${patientId}/share-summary`, { method: 'POST' }),
  revokeShare: (token) => request(`/v1/shares/${token}/revoke`, { method: 'POST' }),
  // Phase 5 Demographic Profile
  getPatientLabProfile: (patientId) => request(`/v1/patients/${patientId}/profile`),
  updatePatientLabProfile: (patientId, payload) => request(`/v1/patients/${patientId}/profile`, { method: 'POST', body: payload }),

  // Phase 6 Doctor Portal & Account Linking
  doctorRegister: (payload) => request('/v1/doctors/register', { method: 'POST', body: payload, auth: false }),
  doctorLogin: (payload) => request('/v1/doctors/login', { method: 'POST', body: payload, auth: false }),
  doctorMe: () => request('/v1/doctors/me', { doctorAuth: true }),
  inviteDoctor: (patientId, doctorEmail) => request(`/v1/patients/${patientId}/invite-doctor`, { method: 'POST', body: { doctor_email: doctorEmail } }),
  getPatientDoctorLinks: (patientId) => request(`/v1/patients/${patientId}/doctor-links`),
  revokeDoctorLink: (patientId, linkId) => request(`/v1/patients/${patientId}/doctor-links/${linkId}/revoke`, { method: 'POST' }),
  getDoctorLinks: () => request('/v1/doctors/me/links', { doctorAuth: true }),
  respondDoctorLink: (linkId, accept) => request(`/v1/doctors/links/${linkId}/respond`, { method: 'POST', body: { accept }, doctorAuth: true }),
  getDoctorPatients: () => request('/v1/doctors/me/patients', { doctorAuth: true }),
  getDoctorPatientSummary: (patientId) => request(`/v1/doctors/patients/${patientId}/summary`, { doctorAuth: true }),
  addDoctorNote: (patientId, noteText, reportId = null) => request(`/v1/doctors/patients/${patientId}/notes`, { method: 'POST', body: { note_text: noteText, report_id: reportId }, doctorAuth: true }),
  // Phase 7 Critical Alerts & Notifications
  getPatientNotifications: () => request('/v1/notifications'),
  getDoctorNotifications: () => request('/v1/doctors/me/notifications', { doctorAuth: true }),
  markNotificationRead: (id) => request(`/v1/notifications/${id}/read`, { method: 'POST' }),
  markAllPatientNotificationsRead: () => request('/v1/notifications/read-all', { method: 'POST' }),
  // Phase 8 Analytics Dashboard
  // Phase 8 Analytics Dashboard
  getPatientDashboard: (patientId) => request(`/v1/patients/${patientId}/dashboard`),
  getDoctorPatientDashboard: (patientId) => request(`/v1/doctors/patients/${patientId}/dashboard`, { doctorAuth: true }),
  // Phase 9 Audit Logging
  getPatientAuditLogs: (patientId) => request(`/v1/patients/${patientId}/audit-log`),










  // Chat
  chat: (payload) => request('/chat', { method: 'POST', body: payload }),

  health: () => request('/health', { auth: false }),
}


export { getToken, BASE_URL }
