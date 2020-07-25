import * as puppeteer from 'puppeteer';
import { LatLng } from './travel-time.service';

export class GoogleMapsCrawler {

  async crawl(origin: LatLng, destination: LatLng): Promise<number[]> {
    // Raspberry Pi
    const browser = await puppeteer.launch({ headless: true, executablePath: '/usr/bin/chromium-browser', args: ['--no-sandbox'] });
    // Windows
    // const browser = await puppeteer.launch({ headless: true });

    const page = await browser.newPage();
    console.log('Go to page ...');
    await page.goto(
      `https://www.google.de/maps/dir/${origin.latitude},${origin.longitude}/${destination.latitude},${destination.longitude}`
    );
    console.log('Wait for selector ...');
    await page.waitFor('.section-directions-trip');
    console.log('Saving screenshot ...');
    await page.screenshot({ path: 'maps.png' });
    console.log('Evaluating page ...');
    const durationsForCar = await page.evaluate(() => {
      const drivePossibilities = document.querySelectorAll('.section-directions-trip-travel-mode-icon');
      console.log(`Found ${drivePossibilities.length} travel-mode-icons`);
      const allDurations = [];
      [].forEach.call(drivePossibilities, el => {
        const durationContainer = el.parentNode.querySelector('.section-directions-trip-duration > span:first-child');
        if (durationContainer) {
          console.log(`Found durationContainer`);
          const duration = durationContainer.textContent;
          allDurations.push(duration);
        } else {
          console.log(`Did NOT found durationContainer!`); 
        }
      });
      console.log(`Found ${allDurations.length} durations`);
      return allDurations;
    });

    console.log('Closing browser ...');
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
