// Start run tracking use case
import { IGPSService } from '@/domain/repositories';
import { GPSError } from '@/domain/types';
import { Result } from '@/shared/types';

export class StartRunTrackingUseCase {
  constructor(private gpsService: IGPSService) {}

  async execute(): Promise<Result<void, GPSError>> {
    return await this.gpsService.startTracking();
  }
}