import { InteractionResponseType } from 'discord-interactions';
import type { Env } from './types';

export class JsonResponse extends Response {
	constructor(body: unknown, init?: ResponseInit) {
		const jsonBody = JSON.stringify(body);
		const newInit = init || {
			headers: {
				'content-type': 'application/json;charset=UTF-8',
			},
		};
		super(jsonBody, newInit);
	}
}

export async function interactionFollowup(
	message: string,
	interactionToken: string,
	env: Env,
) {
	const discordUrl = `https://discord.com/api/v10/webhooks/${env.DISCORD_APPLICATION_ID}/${interactionToken}`;
	const response = await fetch(discordUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			content: message,
			flags: 1 << 6, // ephemeral
		}),
	});
	if (!response.ok) {
		throwFetchError(response as unknown as Response);
	}
}

export function interactionStatus(message: string) {
	return new JsonResponse({
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: {
			content: message,
			flags: 1 << 6, // ephemeral
		},
	});
}

export async function throwFetchError(response: Response) {
	let errorText = `Error fetching ${response.url}: ${response.status} ${response.statusText}`;
	try {
		const error = await response.text();
		if (error) {
			errorText = `${errorText} \n\n ${error}`;
		}
	} catch {}

	throw new FetchError(errorText, response);
}

export class FetchError extends Error {
	constructor(
		message: string,
		public response: Response,
	) {
		super(message);
	}
}
