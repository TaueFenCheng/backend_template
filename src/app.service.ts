import { Injectable } from '@nestjs/common';
import { CreateFormDto } from './dto/create-form.dto';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async createUser(createDto: CreateFormDto) {
    const form = await this.prisma.form.create({
      data: {
        name: createDto.name,
        email: createDto.email,
        message: createDto.message,
      },
    });
    return form;
  }
}
