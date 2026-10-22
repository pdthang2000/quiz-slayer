import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CardLibraryModule } from './card-library/card-library.module';

@Module({
  imports: [CardLibraryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
