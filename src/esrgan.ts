import { interactionFollowup } from './util';
import { startInstructPix2Pix } from './instructPix2Pix';

import type { IRequest } from 'itty-router';
import type { Job, Env } from './types';

export async function startEsrgan(job: Job, env: Env, scaleFactor: number) {
  const replicatePayload = {
    version: env.REPLICATE_ESRGAN_MODEL_VERSION,
    webhook_completed: `${env.WORKER_BASE_URL}/replicate/callback/esrgan`,
    input: {
      image: job.url,
      scale: scaleFactor,
      face_enhance: true,
    },
  };
  console.log({ esrganPayload: replicatePayload });
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${env.REPLICATE_API_TOKEN}`,
    },
    body: JSON.stringify(replicatePayload),
  });

  if (response.ok) {
    const body = (await response.json()) as { id: string };
    await env.AVATAR_REMIX_FOLLOWUPS.put(`replicateId:${body.id}`, JSON.stringify(job), {
      expirationTtl: 60 * 60 * 24 * 14, // 2 weeks (used for remix remixes)
    });
  } else {
    let error = `${response.status} ${response.statusText}`;
    try {
      const errText = await response.text();
      if (errText) {
        error += `: ${errText}`;
      }
    } catch {}
    console.error('Failed to start esrgan job', { ...job, error });

    const discordUrl = `https://discord.com/api/v10/webhooks/${env.DISCORD_APPLICATION_ID}/${job.interactionToken}`;
    await fetch(discordUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: `Failed to remix the avatar (resizing). Please try again later.`,
        flags: 1 << 6, // ephemeral
      }),
    });
  }
}

export async function esrganHandler(request: IRequest, env: Env, context: ExecutionContext) {
  const body = (await request.json()) as { id: string; status: string; output?: string };
  const replicateId = body.id;

  const jobString = await env.AVATAR_REMIX_FOLLOWUPS.get(`replicateId:${replicateId}`);
  if (!jobString) {
    return new Response('No job found', { status: 404 });
  }
  const job = JSON.parse(jobString) as Job;

  console.log('Got replicate esrgan callback', { body, job: jobString });

  if (body.status !== 'succeeded' || !body.output) {
    await interactionFollowup(
      'Failed to remix the avatar (resizing). Please try again later.',
      job.interactionToken,
      env,
    );
    return new Response('FAIL');
  }

  job.url = body.output;
  await startInstructPix2Pix(job, env);
  return new Response('OK');
}
