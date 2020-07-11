import * as puppeteer from 'puppeteer';
import { LatLng } from './travel-time.service';

export class GoogleMapsCrawler {

  async crawl(origin: LatLng, destination: LatLng): Promise<number[]> {
    // Raspberry Pi
    const browser = await puppeteer.launch({ headless: true, executablePath: '/usr/bin/chromium-browser', args: ['--no-sandbox'] });
    // Windows
    // const browser = await puppeteer.launch({ headless: true });

    const page = await browser.newPage();
    await page.goto(
      `https://www.google.de/maps/dir/${origin.latitude},${origin.longitude}/${destination.latitude},${destination.longitude}`
    );
    await page.waitFor('.section-directions-trip');
    await page.screenshot({ path: 'maps.png' });
    const durationsForCar = await page.evaluate(() => {
      const drivePossibilities = document.querySelectorAll('.section-directions-trip-travel-mode-icon.drive');
      const allDurations = [];
      [].forEach.call(drivePossibilities, el => {
        const duration = el.parentNode.querySelector('.section-directions-trip-duration > span:first-child').textContent;
        allDurations.push(duration);
      });
      return allDurations;
    });

    await browser.close();

    return durationsForCar.map(time => this.parseDuration(time));
  }

  private parseDuration(rawDuration: string): number {
    const hours = rawDuration.match(/\d+(?= (Std.|h))/g);
    const mins = rawDuration.match(/\d+(?= (Min.|min))/g);

    let duration = 0;
    if (hours) {
      duration += +hours[0] * 60;
    }
    if (mins) {
      duration += +mins[0];
    }
    return duration;
  }

}
