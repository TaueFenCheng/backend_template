import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { USER_EVENTS } from '../user.events';
import type { UserRegisteredEvent, UserLoginEvent, UserLogoutEvent } from '../user.events';

@Injectable()
export class UserListener {
  private readonly logger = new Logger(UserListener.name);

  @OnEvent(USER_EVENTS.REGISTERED)
  handleUserRegistered(event: UserRegisteredEvent) {
    this.logger.log(`用户注册成功: ID=${event.userId}, Email=${event.email}`);
  }

  @OnEvent(USER_EVENTS.LOGIN)
  handleUserLogin(event: UserLoginEvent) {
    this.logger.log(`用户登录: ID=${event.userId}, Email=${event.email}, IP=${event.ip || 'unknown'}`);
  }

  @OnEvent(USER_EVENTS.LOGOUT)
  handleUserLogout(event: UserLogoutEvent) {
    this.logger.log(`用户登出: ID=${event.userId}`);
  }
}