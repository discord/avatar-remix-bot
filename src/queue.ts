import UPNG from 'upng-js';

import { interactionFollowup } from './util';
import { startInstructPix2Pix } from './instructPix2pix';
import { startEsrgan } from './esrgan';

import type { Job, Env } from './types';

const MIN_IMAGE_SIZE_PX = 504;

export default async function queue(
  batch: MessageBatch<Job>,
  env: Env,
  context: ExecutionContext,
): Promise<void> {
  await Promise.all(
    batch.messages.map(async (message) => {
      const job = message.body;

      const imageResp = await fetch(job.url);
      const data = await imageResp.blob();
      let image;
      try {
        image = UPNG.decode(await data.arrayBuffer());
      } catch (err) {
        await interactionFollowup(
          'Supports PNG only for now. Please enter a valid PNG file.',
          job.interactionToken,
          env,
        );
        return;
      }

      if (Math.max(image.height, image.width) < MIN_IMAGE_SIZE_PX) {
        // Resize images that are too small
        return startEsrgan(job, env, Math.ceil((MIN_IMAGE_SIZE_PX - 1) / image.width));
      }

      return startInstructPix2Pix(job, env);
    }),
  );
}
