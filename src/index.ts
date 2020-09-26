import * as express from 'express';
import { Application, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { TravelTimeService } from './travel-time.service';
import * as serveIndex from 'serve-index';
import * as mqtt from 'async-mqtt';
import { format, add } from 'date-fns';

const app: Application = express();
const port = 9062;

const mqttClient = mqtt.connect('http://192.168.178.28:1883');

const screenshotsFolderPath = path.join(__dirname, '..', 'screenshots');
app.use('/screenshots', express.static(screenshotsFolderPath), serveIndex(screenshotsFolderPath));

app.get('/history', (req, res) => {
  const content = fs.readFileSync('history.log');
  res.status(200).send(content);
});

app.get('/screenshot', (req, res) => {
  const sortedScreenshots = fs.readdirSync(path.join(__dirname, '..', 'screenshots'))
    .map(file => ({ file, stats: fs.lstatSync(path.join(__dirname, '..', 'screenshots', file)) }))
    .filter(fileWithStats => fileWithStats.stats.isFile() && fileWithStats.file.match(/^maps-/) !== null)
    .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

  if (!sortedScreenshots || !sortedScreenshots.length) {
    return res.status(500).send('Could not find screenshot...');
  }
  res.status(200).sendFile(sortedScreenshots[0].file, { root: __dirname + '/../screenshots' });
});

app.get('/from/:latLngFrom/to/:latLngTo', async (req: Request, res: Response) => {
  const travelTimeService = new TravelTimeService();
  const fromParts = req.params.latLngFrom.split(',');
  const toParts = req.params.latLngTo.split(',');
  const durations = await travelTimeService.getDurations(
    { latitude: +fromParts[0], longitude: +fromParts[1] },
    { latitude: +toParts[0], longitude: +toParts[1] }
  );

  try {
    writeLog(`from ${req.params.latLngFrom} to ${req.params.latLngTo}, durations=${durations.join(',')}`);
  } catch (err) {
    return res.status(500).send(err);
  }

  if (!durations || !durations.length) {
    return res.status(200).json({ message: 'No durations could be found.' });
  }

  const minutesLeft = Math.min(...durations);
  await mqttClient.publish('adesso-commuter-server/commuting/duration/minutes-left', minutesLeft.toString());
  await mqttClient.publish('adesso-commuter-server/commuting/duration/eta', format(add(new Date(), { minutes: minutesLeft }), 'HH:mm'));
  res.status(200).json({
    durations,
    average: durations.reduce((prev, curr) => prev + curr) / durations.length,
    min: Math.min(...durations),
    max: Math.max(...durations)
  });
});

app.get('/commuting-state/:state', async (req: Request, res: Response) => {
  const newState = req.params.state;
  await mqttClient.publish('adesso-commuter-server/commuting/status', newState);

  if (newState === 'START') {
    await mqttClient.publish('adesso-commuter-server/commuting/status/start', format(new Date(), 'HH:mm'));
  } else if (newState === 'END') {
    await mqttClient.publish('adesso-commuter-server/commuting/status/end', format(new Date(), 'HH:mm'));
  }
  res.status(200).json({ newState });
});

app.post('/logfromandroid/:lat/:lng', (req: Request, res: Response) => {
  try {
    writeLog(`ANDROID [${req.params.lat}, ${req.params.lng}]`);
  } catch (err) {
    return res.status(500).send(err);
  }
  res.status(200).json({ success: true });
});

mqttClient.on('connect', () => {
  console.log(`connected with MQTT broker`);
  app.listen(port, () => {
    console.log(`running at http://localhost:${port}`);
  });
});

const writeLog = (msg: string) => {
  fs.appendFile('history.log', `${new Date()} ${msg}\n`, (err) => {
    if (err) {
      throw err;
    }
  });
};
