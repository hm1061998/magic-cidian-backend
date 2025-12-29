import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdiomsController } from './idioms.controller';
import { IdiomsService } from './idioms.service';
import {
  IdiomEntity,
  CharacterAnalysisEntity,
  ExampleSentenceEntity,
} from './entities/idiom.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IdiomEntity,
      CharacterAnalysisEntity,
      ExampleSentenceEntity,
    ]),
  ],
  controllers: [IdiomsController],
  providers: [IdiomsService],
})
export class IdiomsModule {}
