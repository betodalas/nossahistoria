import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('couple')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const authService = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  createCouple: (data: { partnerEmail: string; weddingDate?: string; coupleName?: string }) =>
    api.post('/auth/couple', data),
}

// Momentos
export const momentsService = {
  getAll: () => api.get('/moments'),
  create: (data: FormData) => api.post('/moments', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  addPerspective: (momentId: string, text: string) =>
    api.post(`/moments/${momentId}/perspective`, { text }),
  delete: (id: string) => api.delete(`/moments/${id}`),
}

// Perguntas
export const questionsService = {
  getCurrent: () => api.get('/questions/current'),
  answer: (questionId: string, answer: string) =>
    api.post('/questions/answer', { questionId, answer }),
}

// Pagamento
export const paymentService = {
  createOrder: () => api.post('/payment/create-order'),
  capture: (orderId: string) => api.post('/payment/capture', { orderId }),
}

// Unlock dates
export const unlockService = {
  getDates: () => api.get('/unlock-dates'),
}

// Família
export const familyService = {
  share: (email: string) => api.post('/family/share', { email }),
}

export default api

// Armazenamento extra
export const storageService = {
  getInfo: () => api.get('/storage'),
  createOrder: () => api.post('/storage/create-order'),
  capture: (orderId: string) => api.post('/storage/capture', { orderId }),
}
