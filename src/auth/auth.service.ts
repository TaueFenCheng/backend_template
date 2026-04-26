import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { USER_EVENTS, UserRegisteredEvent, UserLoginEvent } from '../events/user.events';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
      },
    });

    // 发送用户注册事件
    const event: UserRegisteredEvent = {
      userId: user.id,
      email: user.email,
      name: user.name,
      timestamp: new Date(),
    };
    this.eventEmitter.emit(USER_EVENTS.REGISTERED, event);

    return this.generateToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 发送用户登录事件
    const event: UserLoginEvent = {
      userId: user.id,
      email: user.email,
      timestamp: new Date(),
    };
    this.eventEmitter.emit(USER_EVENTS.LOGIN, event);

    return this.generateToken(user);
  }

  private generateToken(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const secret = this.config.get<string>('jwt.secret') || 'default-secret';
    const token = this.jwt.sign(payload, {
      secret,
      expiresIn: 86400, // 1 day in seconds
    });
    return { accessToken: token, user: { id: user.id, email: user.email, name: user.name } };
  }

  async validateUser(userId: number) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }
}