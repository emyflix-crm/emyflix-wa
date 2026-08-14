export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  status: string;
  createdAt: string;
}

export interface WhatsAppInstance {
  id: string;
  name: string;
  status: string;
}
