import { Injectable } from '@nestjs/common';
import { CreateFormDto } from './dto/create-form.dto';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
  updateoForm(createDto: CreateFormDto): string {
    return `Form updated! Name: ${createDto.name}, Email: ${createDto.email}`;
  }
}
