import { AutoRouter } from 'itty-router';

import { esrganHandler } from './esrgan';
import { instructPix2PixHandler } from './instructPix2Pix';
import queueHandler from './queue';

import { interactionsHandler, registerCommandsHandler } from './interactions';

const router = AutoRouter();

router.get('/', (request, env) => {
	return new Response('greetings');
});

router.post('/register', registerCommandsHandler);
router.post('/', interactionsHandler);
router.post('/replicate/callback/pix2pix', instructPix2PixHandler);
router.post('/replicate/callback/esrgan', esrganHandler);

router.all('*', () => new Response('Not Found.', { status: 404 }));

export default {
	fetch: router.fetch,
	queue: queueHandler,
};
