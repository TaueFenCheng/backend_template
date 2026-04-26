// 用户相关事件定义

export const USER_EVENTS = {
  REGISTERED: 'user.registered',
  LOGIN: 'user.login',
  LOGOUT: 'user.logout',
};

export interface UserRegisteredEvent {
  userId: number;
  email: string;
  name: string | null;
  timestamp: Date;
}

export interface UserLoginEvent {
  userId: number;
  email: string;
  ip?: string;
  timestamp: Date;
}

export interface UserLogoutEvent {
  userId: number;
  timestamp: Date;
}