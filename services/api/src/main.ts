import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });
  app.enableCors({
    origin: [`http://localhost:${process.env.FRONTEND_PORT ?? 3001}`],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`medilink-api listening on port ${port}`);
}
bootstrap().catch((err) => {
  console.error('Failed to start medilink-api', err);
  process.exit(1);
});
