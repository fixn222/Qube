import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('returns the API health status and timestamp', () => {
      const health = appController.health();
      expect(health.status).toBe('ok');
      expect(Number.isNaN(Date.parse(health.timeStamp))).toBe(false);
    });
  });
});
