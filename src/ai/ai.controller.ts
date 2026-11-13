import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { GenerateDto } from './dto/generate.dto';

type AuthenticatedRequest = Request & {
  user: { id: number; email: string; name?: string };
};

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'List current user AI conversations' })
  listConversations(@Req() request: AuthenticatedRequest) {
    return this.aiService.listConversations(request.user.id);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a conversation and its messages' })
  @ApiParam({ name: 'id', type: Number })
  getConversation(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.aiService.getConversation(request.user.id, Number(id));
  }

  @Post('chat')
  @ApiOperation({ summary: 'Create or continue a streaming AI conversation' })
  async chat(
    @Body() dto: ChatDto,
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
  ) {
    const stream = await this.aiService.chat(dto, request.user, request);
    await stream.pipeUIMessageStreamToResponse(response, {
      keepAlive: '15s',
      errorText: () => 'AI response failed',
    });
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate text with an AI model' })
  generate(
    @Body() dto: GenerateDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.aiService.generate(dto, request.user, request);
  }
}
