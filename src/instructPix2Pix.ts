import {
	NEGATIVE_PROMPT,
	USE_NEGATIVE_PROMPT,
	getImageGuidanceFromPromptGuidance,
	getValidStrengthValue,
} from './instructPix2PixHelpers';
import { sendResult } from './result';
import { interactionFollowup } from './util';

import type { IRequest } from 'itty-router';
import type { Env, Job } from './types';

export async function instructPix2PixHandler(request: IRequest, env: Env) {
	const body = (await request.json()) as {
		id: string;
		status: string;
		output?: string[];
	};
	const replicateId = body.id;

	const jobString = await env.AVATAR_REMIX_FOLLOWUPS.get(
		`replicateId:${replicateId}`,
	);
	if (!jobString) {
		console.error(
			`Received instructpix2pix callback for unknown replicateId ${replicateId}`,
		);
		return new Response('No job found', { status: 404 });
	}
	const job = JSON.parse(jobString) as Job;

	const { groupId } = request.query;
	console.log(`Got pix2pix callback with groupId ${groupId}`);
	if (!groupId) {
		await interactionFollowup(
			'Could not get group ID, please try again.',
			job.interactionToken,
			env,
		);
		return new Response('FAIL');
	}
	console.log('Got replicate pix2pix callback', { body, job: jobString });

	if (body.status !== 'succeeded' || !body.output || body.output.length < 1) {
		await interactionFollowup(
			'Failed to remix the avatar. Please try again later.',
			job.interactionToken,
			env,
		);
		return new Response('FAIL');
	}

	const imageUrls = body.output;
	job.outputUrl = imageUrls[0];
	await sendResult(body.id, job.outputUrl, job, env);

	return new Response('OK');
}

export async function startInstructPix2Pix(job: Job, env: Env) {
	const promptGuidance = getValidStrengthValue(job.strength);
	const replicatePayload = {
		version: env.REPLICATE_INSTRUCT_PIX2PIX_MODEL_VERSION,
		webhook_completed: `${env.WORKER_BASE_URL}/replicate/callback/pix2pix?groupId=test`,
		input: {
			image: job.url,
			prompt: job.prompt,
			negative_prompt: USE_NEGATIVE_PROMPT
				? job.negativePrompt || NEGATIVE_PROMPT
				: undefined,
			num_inference_steps: 50,
			guidance_scale: promptGuidance,
			image_guidance_scale: getImageGuidanceFromPromptGuidance(promptGuidance),
			schedule: 'K_EULER_ANCESTRAL',
			seed: job.seed,
			num_outputs: 1,
		},
	};

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
		console.log(`Saving replicateId ${body.id}`);
		await env.AVATAR_REMIX_FOLLOWUPS.put(
			`replicateId:${body.id}`,
			JSON.stringify(job),
			{
				expirationTtl: 60 * 60 * 24 * 14, // 2 weeks (used for remix remixes)
			},
		);
	} else {
		let error = `${response.status} ${response.statusText}`;
		try {
			const errText = await response.text();
			if (errText) {
				error += `: ${errText}`;
			}
		} catch {}
		console.error('Failed to start job', { ...job, error });

		await interactionFollowup(
			'Failed to remix the avatar. Please try again later.',
			job.interactionToken,
			env,
		);
	}
}
