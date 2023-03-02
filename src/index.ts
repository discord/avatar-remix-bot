import { Router } from 'itty-router';

import { instructPix2PixHandler } from './instructPix2pix';
import { esrganHandler } from './esrgan';
import queueHandler from './queue';

import type { Env } from './types';
import { interactionsHandler, registerCommandsHandler } from './interactions';

const router = Router();

router.get('/', (request, env) => {
  return new Response('greetings');
});

router.post('/register', registerCommandsHandler);
router.post('/', interactionsHandler);
router.post('/replicate/callback/pix2pix', instructPix2PixHandler);
router.post('/replicate/callback/esrgan', esrganHandler);

router.all('*', () => new Response('Not Found.', { status: 404 }));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Dispatch the request to the appropriate route
    return router.handle(request, env, ctx);
  },
  queue: queueHandler,
};
