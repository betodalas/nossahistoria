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
  deleteAccount: () => api.delete('/auth/account'),
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  googleLogin: (data: { credential: string }) =>
    api.post('/auth/google', data),
  me: () =>
    api.get('/auth/me'),
  createCouple: (data: { partnerEmail: string; weddingDate?: string; coupleName?: string }) =>
    api.post('/auth/couple', data),
  updateCouple: (data: { weddingDate?: string; coupleName?: string; partnerName?: string }) =>
    api.put('/auth/couple', data),
  updateBirthday: (birthDate: string) =>
    api.put('/auth/birthday', { birthDate }),
  sendInvite: (partnerEmail: string) =>
    api.post('/auth/invite', { partnerEmail }, { timeout: 30000 }),
  acceptInvite: (token: string) =>
    api.post('/auth/invite/accept', { token }),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
}

// Momentos
export const momentsService = {
  getAll: () => api.get('/moments'),
  create: (data: FormData, onUploadProgress?: (e: any) => void) =>
    api.post('/moments', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  addPerspective: (momentId: string, text: string) =>
    api.post(`/moments/${momentId}/perspective`, { text }),
  delete: (id: string) => api.delete(`/moments/${id}`),
  update: (id: string, data: FormData, onUploadProgress?: (e: any) => void) =>
    api.put(`/moments/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
}

// Perguntas
export const questionsService = {
  getCurrent: () => api.get('/questions/current'),
  answer: (questionId: string, answer: string) =>
    api.post('/questions/answer', { questionId, answer }),
  getAnswerCount: () => api.get('/questions/answer-count'),
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

// Armazenamento extra
export const storageService = {
  getInfo: () => api.get('/storage'),
  createOrder: () => api.post('/storage/create-order'),
  capture: (orderId: string) => api.post('/storage/capture', { orderId }),
}

// Cartas das cápsulas
export const lettersService = {
  getAll: () => api.get('/letters'),
  save: (capsule_key: string, text: string) => api.post('/letters', { capsule_key, text }),
}

// Álbum de convidados
export const guestService = {
  getAll: () => api.get('/guest-posts'),
  create: (data: { name: string; message: string; photo?: string | null; media_type?: string }) => api.post('/guest-posts', data),
  getAlbumToken: () => api.get('/album-token'),
  getPublicPosts: (token: string) => api.get(`/guest-posts/public/${token}`),
  createPublicPost: (token: string, data: { name: string; message: string; photo?: string | null; media_type?: string }) =>
    api.post(`/guest-posts/public/${token}`, data),
}

export const albumService = {
  createOrder: () => api.post('/album/create-order'),
  capture: (orderId: string) => api.post('/album/capture', { orderId }),
}

export default api
