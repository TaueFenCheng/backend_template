import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiModule as NestAiModule } from '@nestjs/ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { PrismaModule } from '../prisma/prisma.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiToolsService } from './ai-tools.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    NestAiModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider = createOpenAICompatible({
          name: 'configured-ai-provider',
          apiKey: config.get<string>('ai.apiKey') || 'not-configured',
          baseURL: config.get<string>('ai.baseUrl')!,
        });

        return {
          models: {
            default: {
              model: provider(config.get<string>('ai.model')!),
              maxOutputTokens: 1200,
              timeout: '30s',
              retry: { attempts: 2 },
            },
          },
          defaults: { maxSteps: 3 },
        };
      },
    }),
  ],
  controllers: [AiController],
  providers: [AiService, AiToolsService],
})
export class AiModule {}
