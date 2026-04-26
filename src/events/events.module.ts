import { Module } from '@nestjs/common';
import { UserListener } from './listeners/user.listener';

@Module({
  providers: [UserListener],
  exports: [UserListener],
})
export class EventsModule {}