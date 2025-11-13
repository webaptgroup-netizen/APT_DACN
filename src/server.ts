import app from './app';
import { env } from './config/env';

const port = Number(env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`APT-CONNECT API listening on port ${port}`);
});
