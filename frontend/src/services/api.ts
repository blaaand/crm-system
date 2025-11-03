import axios from 'axios';
import toast from 'react-hot-toast';

// 👇 استخدم المتغير القادم من .env
const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || '';

// تحقق من أن العنوان مضبوط فعلاً
if (!API_BASE_URL) {
  console.warn('⚠️ لم يتم تحديد VITE_API_URL في ملف البيئة (.env)');
}

// 🧩 إنشاء Axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 ثانية - يمنح الخادم وقت كافٍ للرد
});

// 🛡️ إضافة التوكن في كل طلب
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ⚙️ التعامل مع الاستجابات والأخطاء
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // إعادة المحاولة في حال انتهاء صلاحية التوكن
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('🔒 فشل تحديث التوكن، سيتم تسجيل الخروج...');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        const { useAuthStore } = await import('../stores/authStore');
        useAuthStore.getState().clearAuth();
        window.location.reload();
        return Promise.reject(refreshError);
      }
    }

    // 🌐 معالجة أخطاء الاتصال أو الخادم
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ERR_NETWORK' ||
      error.message === 'Network Error' ||
      error.message?.includes('network')
    ) {
      toast.error('🚨 لا يمكن الاتصال بالخادم. تأكد أن الـ Backend يعمل.', { duration: 6000 });
      console.error('❌ Network Error:', {
        code: error.code,
        message: error.message,
        baseURL: API_BASE_URL,
        VITE_API_URL: import.meta.env.VITE_API_URL,
      });
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      toast.error('⏱ انتهت مهلة الاتصال. حاول مرة أخرى.', { duration: 6000 });
    } else if (error.response?.data?.message) {
      toast.error(error.response.data.message);
    } else {
      toast.error('⚠️ حدث خطأ غير متوقع. حاول مرة أخرى لاحقاً.');
    }

    return Promise.reject(error);
  }
);

export default api;
