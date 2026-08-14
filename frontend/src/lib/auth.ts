import Cookies from 'js-cookie';

export const getToken = () => Cookies.get('token') || null;
export const setToken = (token: string) => Cookies.set('token', token, { expires: 7 });
export const removeToken = () => Cookies.remove('token');

export const getRefreshToken = () => Cookies.get('refreshToken') || null;
export const setRefreshToken = (token: string) => Cookies.set('refreshToken', token, { expires: 30 });
export const removeRefreshToken = () => Cookies.remove('refreshToken');

export const isAuthenticated = () => !!getToken();

export const getUser = () => {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
  return null;
};
export const setUser = (user: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

export const logout = () => {
  removeToken();
  removeRefreshToken();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
};
