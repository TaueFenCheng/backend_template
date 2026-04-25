import { Injectable } from '@nestjs/common';
import { CreateFormDto } from './dto/create-form.dto';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  updateoForm(createDto: CreateFormDto) {
    return {
      name: createDto.name,
      email: createDto.email,
      message: createDto.message,
      submittedAt: new Date().toISOString(),
    };
  }
}
