import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable default body parser to set custom limit
  });

  // Increase body size limit for large inventory files (50MB)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(express.json({ limit: '50mb' }));
  expressApp.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Set global prefix
  app.setGlobalPrefix('api');
  
  // Health check endpoint
  app.getHttpAdapter().get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
  });
  
  // Enable CORS
  const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3001', 'http://127.0.0.1:5173'];
  
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('CRM System API')
    .setDescription('نظام إدارة العملاء والطلبات مع لوحة Kanban')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'CRM API Documentation',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
