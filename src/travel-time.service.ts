import { Inject } from 'typescript-ioc';
import { GoogleMapsCrawler } from './maps-crawler';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export class TravelTimeService {

  @Inject
  crawler: GoogleMapsCrawler;

  async getDuration(origin: LatLng, destination: LatLng): Promise<void> {
    const result: number[] = await this.crawler.crawl(origin, destination);
    console.log(result);
  }

}
