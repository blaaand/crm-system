import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaService } from './common/prisma/prisma.service';
import { migrateClientFields } from './common/migrate-client-fields';
import * as express from 'express';
import * as cors from 'cors';

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

    // Get Express app instance FIRST
    const expressApp = app.getHttpAdapter().getInstance();
    
    // Enable CORS FIRST - before any other middleware
    const defaultOrigins = [
      'http://localhost:5173',
      'http://localhost:3001',
      'http://127.0.0.1:5173',
      'https://crm-system-gules.vercel.app',
    ];
    
    let allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(o => o)
      : defaultOrigins;
    
    // Always add Vercel origin if not already included
    if (!allowedOrigins.includes('https://crm-system-gules.vercel.app')) {
      allowedOrigins.push('https://crm-system-gules.vercel.app');
    }
    
    // Remove duplicates
    allowedOrigins = [...new Set(allowedOrigins)];
    
    console.log(`🌐 CORS origins: ${allowedOrigins.join(', ')}`);
    console.log(`🌐 CORS_ORIGIN env: ${process.env.CORS_ORIGIN || 'not set'}`);
    
    // Use Express CORS middleware directly - more reliable
    expressApp.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, Postman, or curl requests)
        if (!origin) {
          console.log('✅ CORS: Allowing request with no origin');
          return callback(null, true);
        }
        
        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          console.log(`✅ CORS: Allowing origin: ${origin}`);
          callback(null, true);
        } else {
          console.warn(`⚠️ CORS: Blocked origin: ${origin}`);
          console.warn(`⚠️ CORS: Allowed origins: ${allowedOrigins.join(', ')}`);
          // In production, reject blocked origins
          if (process.env.NODE_ENV === 'production') {
            callback(new Error(`Origin ${origin} is not allowed by CORS`));
          } else {
            // In development, allow all origins for debugging
            console.log(`⚠️ CORS: Allowing blocked origin in development mode`);
            callback(null, true);
          }
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'Origin',
        'X-Requested-With',
      ],
      exposedHeaders: [
        'Content-Type',
        'Authorization',
      ],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    }));
    console.log('✅ Express CORS middleware enabled');

    // Also enable CORS in NestJS for additional safety
    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'Origin',
        'X-Requested-With',
      ],
      exposedHeaders: [
        'Content-Type',
        'Authorization',
      ],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });
    console.log('✅ NestJS CORS also enabled');

    // Increase body size limit for large inventory files (50MB)
    console.log('🔄 Setting up Express middleware...');
    expressApp.use(express.json({ limit: '50mb' }));
    expressApp.use(express.urlencoded({ limit: '50mb', extended: true }));
    console.log('✅ Express middleware configured');

    // Set global prefix
    app.setGlobalPrefix('api');
    console.log('✅ Global prefix set to /api');

    // Health check endpoint - CORS will be handled by middleware
    app.getHttpAdapter().get('/api/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        cors: {
          allowedOrigins: allowedOrigins,
          requestOrigin: req.headers.origin || 'no origin',
        },
      });
    });
    console.log('✅ Health check endpoint configured at /api/health');

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

