import { ApiProperty } from '@nestjs/swagger';

export class CreateFormDto {
  @ApiProperty({ example: 'John Doe', description: '用户名称' })
  name: string;

  @ApiProperty({ example: 'john@example.com', description: '用户邮箱' })
  email: string;

  @ApiProperty({ example: 'Hello, this is a message.', description: '消息内容' })
  message: string;
}