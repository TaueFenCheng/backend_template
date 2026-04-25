import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, Length, IsNotEmpty } from 'class-validator';

export class CreateFormDto {
  @ApiProperty({ example: 'John Doe', description: '用户名称' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  name: string;

  @ApiProperty({ example: 'john@example.com', description: '用户邮箱' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Hello, this is a message.', description: '消息内容' })
  @IsString()
  @IsNotEmpty()
  @Length(10, 500)
  message: string;
}