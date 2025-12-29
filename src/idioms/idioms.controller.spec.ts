import { Test, TestingModule } from '@nestjs/testing';
import { IdiomsController } from './idioms.controller';

describe('IdiomsController', () => {
  let controller: IdiomsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdiomsController],
    }).compile();

    controller = module.get<IdiomsController>(IdiomsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
