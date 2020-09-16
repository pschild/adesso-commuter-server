import * as puppeteer from 'puppeteer';
import { LatLng } from './travel-time.service';
import * as path from 'path';
import * as isPi from 'detect-rpi';

export class GoogleMapsCrawler {

  async crawl(origin: LatLng, destination: LatLng): Promise<number[]> {
    let launchOptions: any = {
      headless: true,
      defaultViewport: { width: 1024, height: 768 }
    };

    if (isPi()) {
      launchOptions = {
        ...launchOptions,
        executablePath: '/usr/bin/chromium-browser',
        args: ['--no-sandbox']
      };
    }

    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // pass logs within headless browser to main console
    page.on('console', consoleObj => {
      if (consoleObj.type() === 'log') {
        console.log(consoleObj.text());
      }
    });

    console.log('Go to page ...');
    // Example: https://www.google.de/maps/dir/51.5045685,6.9971393/51.668189,6.148282
    await page.goto(
      `https://www.google.de/maps/dir/${origin.latitude},${origin.longitude}/${destination.latitude},${destination.longitude}`
    );
    console.log('Wait for travel modes visible ...');
    await page.waitFor('.directions-travel-mode-selector');
    console.log('Click icon for choosing "drive" as travel mode ...');
    await page.click('.travel-mode:nth-child(2) button');
    console.log('Wait 2s ...');
    await page.waitFor(2000);
    console.log('Wait for trips visible ...');
    await page.waitFor('.section-directions-trip');
    console.log('Saving screenshot ...');
    await page.screenshot({
      path: path.join('screenshots', `maps-${new Date().toISOString().replace(/[:\.]/g, '-')}.png`),
      // clip: { x: 435, y: 50, width: 1024 - 435, height: 768 - 50 * 2 }
      // clip: { x: 435, y: 0, width: 1024 - 435, height: 768 }
    });
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
