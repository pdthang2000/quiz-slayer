import { Module } from '@nestjs/common';
import { CardLibraryModule } from './card-library/card-library.module';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, CardLibraryModule],
  controllers: [HealthController],
})
export class AppModule {}
