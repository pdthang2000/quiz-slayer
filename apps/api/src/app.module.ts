import { Module } from '@nestjs/common';
import { CardLibraryModule } from './card-library/card-library.module';
import { HealthController } from './health.controller';

@Module({
  imports: [CardLibraryModule],
  controllers: [HealthController],
})
export class AppModule {}
