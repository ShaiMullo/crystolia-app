import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { OrdersModule } from './orders/orders.module';
import { InvoicesModule } from './invoices/invoices.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        let uri = configService.get<string>('MONGO_URI');

        // Fallback to in-memory DB only if explicitly requested or URI is missing
        if (!uri) {
          const { startMemoryDb } = await import('./utils/memory-db.js');
          uri = await startMemoryDb();
        }

        return { uri };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    CustomersModule,
    OrdersModule,
    InvoicesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
// Trigger rebuild
