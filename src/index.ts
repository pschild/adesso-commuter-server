import * as express from 'express';
import { Application, Request, Response } from 'express';
import * as fs from 'fs';

const app: Application = express();
const port = 9046;

app.get('/', (req, res) => {
  const content = fs.readFileSync('history.log');
  res.status(200).send(content);
});

app.post('/enter/:name', (req: Request, res: Response) => {
  try {
    writeLog(`ENTER ${req.params.name}`);
  } catch (err) {
    return res.status(500).send(err);
  }
  res.status(200).end();
});

app.post('/exit/:name', (req: Request, res: Response) => {
  try {
    writeLog(`EXIT ${req.params.name}`);
  } catch (err) {
    return res.status(500).send(err);
  }
  res.status(200).end();
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
