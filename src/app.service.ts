import { Injectable } from '@nestjs/common';
import { CreateFormDto } from './dto/create-form.dto';
import { FormResponseDto } from './dto/form-response.dto';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async createUser(createDto: CreateFormDto): Promise<FormResponseDto> {
    const form = await this.prisma.form.create({
      data: {
        name: createDto.name,
        email: createDto.email,
        message: createDto.message,
      },
    });
    return form;
  }

  async getAllForms(): Promise<FormResponseDto[]> {
    const forms = await this.prisma.form.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return forms;
  }
}
