import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private auth: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret') || 'default-secret',
    });
  }

  async validate(payload: { sub: number; email: string; role: string }) {
    const user = await this.auth.validateUser(payload.sub);
    if (!user) {
      return null;
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
