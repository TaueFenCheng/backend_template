import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval, Timeout, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(private schedulerRegistry: SchedulerRegistry) {}

  // 每分钟执行
  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'everyMinuteTask',
  })
  handleEveryMinute() {
    this.logger.log('定时任务：每分钟执行一次');
  }

  // 每小时执行
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'everyHourTask',
  })
  handleEveryHour() {
    this.logger.log('定时任务：每小时执行一次');
  }

  // 每天凌晨2点执行
  @Cron('0 0 2 * * *', {
    name: 'dailyCleanupTask',
  })
  handleDailyCleanup() {
    this.logger.log('定时任务：每天凌晨2点执行清理');
  }

  // 固定间隔执行（每30秒）
  @Interval('intervalTask', 30000)
  handleInterval() {
    this.logger.log('间隔任务：每30秒执行');
  }

  // 应用启动后5秒执行一次
  @Timeout('startupTask', 5000)
  handleStartup() {
    this.logger.log('启动任务：应用启动后5秒执行一次');
  }

  // 动态添加定时任务
  addCronJob(name: string, cronExpression: string) {
    const job = new CronJob(cronExpression, () => {
      this.logger.log(`动态任务 ${name} 执行`);
    });

    this.schedulerRegistry.addCronJob(name, job);
    job.start();

    this.logger.log(`动态任务 ${name} 已添加，表达式: ${cronExpression}`);
  }

  // 停止定时任务
  stopCronJob(name: string) {
    const job = this.schedulerRegistry.getCronJob(name);
    job.stop();
    this.logger.log(`任务 ${name} 已停止`);
  }

  // 启动定时任务
  startCronJob(name: string) {
    const job = this.schedulerRegistry.getCronJob(name);
    job.start();
    this.logger.log(`任务 ${name} 已启动`);
  }

  // 删除定时任务
  deleteCronJob(name: string) {
    this.schedulerRegistry.deleteCronJob(name);
    this.logger.log(`任务 ${name} 已删除`);
  }

  // 获取所有定时任务
  getAllCronJobs() {
    const jobs = this.schedulerRegistry.getCronJobs();
    const result: any[] = [];

    jobs.forEach((job, name) => {
      const nextDate = job.nextDate();
      result.push({
        name,
        nextExecution: nextDate ? nextDate.toISO() : null,
      });
    });

    return result;
  }

  // 获取所有间隔任务
  getAllIntervals() {
    const intervals = this.schedulerRegistry.getIntervals();
    return intervals.map((name) => ({ name }));
  }

  // 获取所有超时任务
  getAllTimeouts() {
    const timeouts = this.schedulerRegistry.getTimeouts();
    return timeouts.map((name) => ({ name }));
  }
}