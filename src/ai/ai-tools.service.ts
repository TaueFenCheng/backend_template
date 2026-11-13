import { ForbiddenException, Injectable } from '@nestjs/common';
import { AgentFunction } from '@nestjs/ai';
import * as z from 'zod';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiToolsService {
  constructor(private readonly prisma: PrismaService) {}

  @AgentFunction({
    name: 'search_my_forms',
    description:
      'Search the signed-in user’s own submitted forms by keyword. Use only when the user asks about their submitted forms.',
    inputSchema: z.object({
      query: z.string().min(1).max(100),
    }),
  })
  async searchMyForms(
    { query }: { query: string },
    context: { user?: { id: number } },
  ) {
    const userId = context.user?.id;
    if (!userId) throw new ForbiddenException();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) throw new ForbiddenException();

    const forms = await this.prisma.form.findMany({
      where: {
        email: user.email,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { message: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, message: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    return { forms };
  }
}
