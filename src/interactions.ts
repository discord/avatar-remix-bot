import { InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';
import { getValidStrengthValue } from './instructPix2PixHelpers';
import { interactionStatus, JsonResponse } from './util';
import { REMIX_COMMAND } from './commands';

import type { IRequest } from 'itty-router';
import type { Env, Job } from './types';

function getOptionValue(options: { name: string }[], name: string) {
  const option = options.find((o) => o.name === name);
  return option?.value;
}

export async function registerCommandsHandler(request: IRequest, env: Env) {
  const token = env.DISCORD_BOT_TOKEN;
  const applicationId = env.DISCORD_APPLICATION_ID;

  const url = `https://discord.com/api/v10/applications/${applicationId}/commands`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${token}`,
    },
    body: JSON.stringify([REMIX_COMMAND]),
  });

  if (!response.ok) {
    return new Response('Failed to register commands\n', {
      status: 500,
    });
  }
  return new Response('Registered commands\n');
}

export async function interactionsHandler(request: IRequest, env: Env, context: ExecutionContext) {
  // Using the incoming headers, verify this request actually came from discord.
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  if (!signature || !timestamp) {
    return new Response('Bad request signature.', { status: 401 });
  }

  const body = await request.clone().arrayBuffer();
  const isValidRequest = verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
  if (!isValidRequest) {
    console.error('Invalid Request');
    return new Response('Bad request signature.', { status: 401 });
  }

  const message = await request.json();
  if (message.type === InteractionType.PING) {
    // The `PING` message is used during the initial webhook handshake, and is
    // required to configure the webhook in the developer portal.
    return new JsonResponse({
      type: InteractionResponseType.PONG,
    });
  }

  if (message.type === InteractionType.MESSAGE_COMPONENT) {
    const customId = message.data.custom_id;
    const splits = customId.split(':');
    const command = splits[0];
    const payload = splits[1];

    const jobString = await env.AVATAR_REMIX_FOLLOWUPS.get(`replicateId:${payload}`);
    if (!jobString) {
      return interactionStatus(
        "It's been a while so I deleted the info I had on this job. Please generate a new image.",
      );
    }
    const job = JSON.parse(jobString) as Job;

    if (command === 'retry') {
      await env.AVATAR_REMIX_JOBS.send({
        type: job.type,
        url: job.url,
        prompt: job.prompt,
        targetUserId: job.targetUserId,
        remixRemix: job.remixRemix,
        strength: job.strength,

        requesterUserId: message.member?.user?.id || message.user?.id,
        seed: Math.floor(Math.random() * 1e9),
        interactionToken: message.token,
      });
      return interactionStatus('one moment please...');
    }

    const isRemix = command === 'remix';

    const components = [
      {
        type: 1,
        components: [
          {
            type: 4,
            style: 1,
            custom_id: 'instructions',
            label: 'Instructions',
            placeholder: 'make it spooky',
            value: isRemix ? undefined : job.prompt,
            min_length: 1,
            max_length: 500,
            required: true,
          },
        ],
      },
    ];
    if (!isRemix) {
      // Add strength
      components.push({
        type: 1,
        components: [
          {
            type: 4,
            style: 1,
            custom_id: 'strength',
            label: 'Strength (1-20)',
            placeholder: '7',
            value: String(getValidStrengthValue(job.strength)),
            min_length: 1,
            max_length: 2,
            required: false,
          },
        ],
      });
    }

    // Show a modal
    return new JsonResponse({
      type: InteractionResponseType.APPLICATION_MODAL,
      data: {
        title: isRemix ? 'Remix your remix' : 'Remix',
        content: 'Tell me what you want to do.',
        custom_id: customId,
        components,
      },
    });
  }

  if (message.type === InteractionType.APPLICATION_MODAL_SUBMIT) {
    const splits = message.data.custom_id.split(':');
    const command = splits[0];
    const payload = decodeURIComponent(splits[1]);
    if (!command || !payload) {
      return interactionStatus('Invalid command');
    }

    const jobString = await env.AVATAR_REMIX_FOLLOWUPS.get(`replicateId:${payload}`);
    if (!jobString) {
      return interactionStatus(
        "It's been a while so I deleted the info I had on this job. Please generate a new image.",
      );
    }
    const previousJob = JSON.parse(jobString) as Job;
    if (!previousJob.outputUrl) {
      return interactionStatus('Could not find job output. Try again in a moment...');
    }

    switch (command) {
      case 'remix':
        await env.AVATAR_REMIX_JOBS.send({
          type: 'REMIX_REMIX',
          url: previousJob.outputUrl,
          prompt: message.data.components[0].components[0].value,
          requesterUserId: message.member?.user?.id || message.user?.id,
          remixRemix: true,

          interactionToken: message.token,

          seed: Math.floor(Math.random() * 1e9),
          strength: previousJob.strength || 7,
        });
        return interactionStatus('one moment please...');
      case 'edit':
        await env.AVATAR_REMIX_JOBS.send({
          type: 'REMIX_EDIT',
          url: previousJob.url,
          prompt: message.data.components[0].components[0].value,
          requesterUserId: message.member?.user?.id || message.user?.id,
          targetUserId: previousJob.targetUserId,
          remixRemix: previousJob.remixRemix,

          interactionToken: message.token,

          strength: getValidStrengthValue(message.data.components[1].components[0].value),
          seed: Math.floor(Math.random() * 1e9),
        });
        return interactionStatus('one moment please...');
      default:
        return interactionStatus('Unknown command');
    }
  }

  if (message.type === InteractionType.APPLICATION_COMMAND) {
    let requesterUserId, prompt;
    switch (message.data.name.toLowerCase()) {
      case REMIX_COMMAND.name:
        const userId = getOptionValue(message.data.options, 'user');
        const resolvedMemberAvatar = message.data.resolved.members?.[userId]?.avatar;
        const resolvedUserAvatar = message.data.resolved.users?.[userId]?.avatar;
        if (!resolvedUserAvatar) {
          return interactionStatus(`I couldn't find a user with the ID \`${userId}\``);
        }

        const avatarUrl = resolvedMemberAvatar
          ? `https://cdn.discordapp.com/guilds/${message.guild_id}/users/${userId}/avatars/${resolvedMemberAvatar}.png?size=512`
          : `https://cdn.discordapp.com/avatars/${userId}/${resolvedUserAvatar}.png?size=512`;

        console.log({ avatarUrl });

        requesterUserId = message.member?.user?.id || message.user?.id;
        const debugUrl = getOptionValue(message.data.options, 'debug-url');

        // Enqueue job to process the avatar remix.
        prompt = getOptionValue(message.data.options, 'instruction').trim().slice(0, 500);
        await env.AVATAR_REMIX_JOBS.send({
          type: 'REMIX',
          url: debugUrl || avatarUrl,
          prompt,
          strength: getOptionValue(message.data.options, 'strength') || 7,
          seed: getOptionValue(message.data.options, 'seed') ?? Math.floor(Math.random() * 1e9),
          interactionToken: message.token,
          targetUserId: userId,
          requesterUserId,
        });
        return new JsonResponse({
          type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
        });
      default:
        console.error(`Unknown command ${message.data.name}`);
        return interactionStatus('Unknown command');
    }
  }

  console.error('Unknown message type', message.type);
  return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
}
