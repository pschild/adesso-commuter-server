import * as express from 'express';
import { Application, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { TravelTimeService } from './travel-time.service';

const app: Application = express();
const port = 9062;

app.use(express.static(path.join(__dirname)));

const ADESSO_ESSEN = [51.4557381, 7.0101814];
const UNI_ESSEN = [51.4649085, 7.0014287];
const AUFFAHRT_A42 = [51.5045685, 6.9971393];
const AUFFAHRT_A40 = [51.4471093, 7.0011169];
const KA_LI = [51.4914203, 6.5759749];
const GOCH = [51.668189, 6.148282];

// Example: https://www.google.de/maps/dir/51.5045685,6.9971393/51.668189,6.148282

app.get('/', (req, res) => {
  const content = fs.readFileSync('history.log');
  res.status(200).send(content);
});

app.get('/screenshot', (req, res) => {
  res.status(200).sendFile('maps.png', { root: __dirname + '/..' });
});

app.post('/enter/:name', async (req: Request, res: Response) => {
  const travelTimeService = new TravelTimeService();
  const durations = await travelTimeService.getDurations(
    { latitude: ADESSO_ESSEN[0], longitude: ADESSO_ESSEN[1] },
    { latitude: GOCH[0], longitude: GOCH[1] }
  );

  try {
    writeLog(`ENTER ${req.params.name}, durations=${durations.join(',')}`);
  } catch (err) {
    return res.status(500).send(err);
  }
  
  if (!durations || !durations.length) {
      res.status(200).json({ message: 'No durations could be found.' });
  }
  
  res.status(200).json({
    durations,
    average: durations.reduce((prev, curr) => prev + curr) / durations.length,
    min: Math.min(...durations),
    max: Math.max(...durations)
  });
});

app.post('/exit/:name', (req: Request, res: Response) => {
  try {
    writeLog(`EXIT ${req.params.name}`);
  } catch (err) {
    return res.status(500).send(err);
  }
  res.status(200).end();
});

app.post('/logfromandroid/:lat/:lng', (req: Request, res: Response) => {
  try {
    writeLog(`ANDROID [${req.params.lat}, ${req.params.lng}]`);
  } catch (err) {
    return res.status(500).send(err);
  }
  res.status(200).json({ success: true });
});

app.listen(port, () => {
  console.log(`running at http://localhost:${port}`);
});

const writeLog = (msg: string) => {
  fs.appendFile('history.log', `${new Date()} ${msg}\n`, (err) => {
    if (err) {
      throw err;
    }
  });
};
