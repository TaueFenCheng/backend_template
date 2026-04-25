import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { CreateFormDto } from './dto/create-form.dto';

@ApiTags('nestjs_demo')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get hello message' })
  @ApiResponse({ status: 200, description: 'Returns a hello message' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Post()
  @ApiOperation({ summary: 'Post form data' })
  @ApiResponse({ status: 201, description: 'Form updated successfully' })
  postHello(@Body() createDto: CreateFormDto): string {
    return this.appService.updateoForm(createDto);
  }
}
