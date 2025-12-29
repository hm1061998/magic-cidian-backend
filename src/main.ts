import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Cấu hình CORS mở rộng để tránh lỗi chặn truy cập từ Frontend
  app.enableCors({
    origin: true, // Cho phép tất cả các nguồn (hoặc điền ['http://localhost:5173'] nếu muốn cụ thể)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
