import { Controller, Get, Post, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';

@ApiTags('schedule')
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('cron-jobs')
  @ApiOperation({ summary: '获取所有定时任务' })
  @ApiResponse({ status: 200, description: '返回所有定时任务列表' })
  getAllCronJobs() {
    return this.scheduleService.getAllCronJobs();
  }

  @Get('intervals')
  @ApiOperation({ summary: '获取所有间隔任务' })
  @ApiResponse({ status: 200, description: '返回所有间隔任务列表' })
  getAllIntervals() {
    return this.scheduleService.getAllIntervals();
  }

  @Get('timeouts')
  @ApiOperation({ summary: '获取所有超时任务' })
  @ApiResponse({ status: 200, description: '返回所有超时任务列表' })
  getAllTimeouts() {
    return this.scheduleService.getAllTimeouts();
  }

  @Post('cron/:name')
  @ApiOperation({ summary: '动态添加定时任务' })
  @ApiQuery({ name: 'expression', description: 'Cron表达式', example: '0 * * * * *' })
  @ApiResponse({ status: 201, description: '任务添加成功' })
  addCronJob(@Param('name') name: string, @Query('expression') expression: string) {
    this.scheduleService.addCronJob(name, expression);
    return { message: `任务 ${name} 已添加` };
  }

  @Post('cron/:name/start')
  @ApiOperation({ summary: '启动定时任务' })
  @ApiResponse({ status: 200, description: '任务已启动' })
  startCronJob(@Param('name') name: string) {
    this.scheduleService.startCronJob(name);
    return { message: `任务 ${name} 已启动` };
  }

  @Post('cron/:name/stop')
  @ApiOperation({ summary: '停止定时任务' })
  @ApiResponse({ status: 200, description: '任务已停止' })
  stopCronJob(@Param('name') name: string) {
    this.scheduleService.stopCronJob(name);
    return { message: `任务 ${name} 已停止` };
  }

  @Delete('cron/:name')
  @ApiOperation({ summary: '删除定时任务' })
  @ApiResponse({ status: 200, description: '任务已删除' })
  deleteCronJob(@Param('name') name: string) {
    this.scheduleService.deleteCronJob(name);
    return { message: `任务 ${name} 已删除` };
  }
}