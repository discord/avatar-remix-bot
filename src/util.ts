import { InteractionResponseType } from 'discord-interactions';

import type { Env } from './types';

export class JsonResponse extends Response {
  constructor(body: any, init?: ResponseInit) {
    const jsonBody = JSON.stringify(body);
    init = init || {
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    };
    super(jsonBody, init);
  }
}

export async function interactionFollowup(message: string, interactionToken: string, env: Env) {
  const discordUrl = `https://discord.com/api/v10/webhooks/${env.DISCORD_APPLICATION_ID}/${interactionToken}`;
  await fetch(discordUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: message,
      flags: 1 << 6, // ephemeral
    }),
  });
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
