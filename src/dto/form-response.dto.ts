import { ApiProperty } from '@nestjs/swagger';

export class FormResponseDto {
  @ApiProperty({ example: 1, description: '表单 ID' })
  id: number;

  @ApiProperty({ example: 'John Doe', description: '用户名称' })
  name: string;

  @ApiProperty({ example: 'john@example.com', description: '用户邮箱' })
  email: string;

  @ApiProperty({ example: 'Hello, this is a message.', description: '消息内容' })
  message: string;

  @ApiProperty({ example: '2026-04-25T12:00:00.000Z', description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ example: '2026-04-25T12:00:00.000Z', description: '更新时间' })
  updatedAt: Date;
}