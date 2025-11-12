import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaService } from './common/prisma/prisma.service';
import { migrateClientFields } from './common/migrate-client-fields';
import * as express from 'express';

async function bootstrap() {
  console.log('🚀 Starting CRM Backend Server...');
  console.log(`📦 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 PORT: ${process.env.PORT || 8080}`);
  console.log(`🔗 DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
  
  try {
    const app = await NestFactory.create(AppModule, {
      bodyParser: false, // Disable default body parser to set custom limit
    });
    console.log('✅ App module created successfully');

    // Apply database migrations for new fields
    try {
      console.log('🔄 Applying client fields migration...');
      const prisma = app.get(PrismaService);
      await migrateClientFields(prisma);
      console.log('✅ Client fields migration completed');
    } catch (error) {
      console.error('⚠️ Error applying migrations:', error);
      // Continue anyway - fields might already exist
    }

    // Increase body size limit for large inventory files (50MB)
    console.log('🔄 Setting up Express middleware...');
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use(express.json({ limit: '50mb' }));
    expressApp.use(express.urlencoded({ limit: '50mb', extended: true }));
    console.log('✅ Express middleware configured');

    // Set global prefix
    app.setGlobalPrefix('api');
    console.log('✅ Global prefix set to /api');

    // Health check endpoint
    app.getHttpAdapter().get('/api/health', (req, res) => {
      res.status(200).json({ status: 'OK', message: 'Server is running' });
    });
    console.log('✅ Health check endpoint configured at /api/health');

    // Enable CORS
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['http://localhost:5173', 'http://localhost:3001', 'http://127.0.0.1:5173'];
    
    console.log(`🌐 CORS origins: ${allowedOrigins.join(', ')}`);
    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
    });
    console.log('✅ CORS enabled');

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    console.log('✅ Validation pipe configured');

    // Swagger documentation
    console.log('🔄 Setting up Swagger documentation...');
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
    console.log('✅ Swagger documentation configured at /api/docs');

    // Use consistent port
    const port = process.env.PORT || 8080;
    console.log(`🔌 Starting server on port ${port}...`);
    
    try {
      await app.listen(port, '0.0.0.0');
      console.log(`🚀 Application is running on: http://0.0.0.0:${port}`);
      console.log(`📚 API Documentation: http://0.0.0.0:${port}/api/docs`);
      console.log(`✅ Server started successfully on port ${port}`);
      console.log(`🔗 Health check: http://0.0.0.0:${port}/api/health`);
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Failed to create app:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Failed to bootstrap application:', error);
  process.exit(1);
});

