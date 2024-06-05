import type { Env, Job } from './types';

export async function sendResult(
	replicateId: string,
	imageUrl: string,
	job: Job,
	env: Env,
) {
	// Record followup with output URL, so that it can be remixed.
	await env.AVATAR_REMIX_FOLLOWUPS.put(
		`replicateId:${replicateId}`,
		JSON.stringify(job),
		{
			expirationTtl: 60 * 60 * 24 * 14, // 2 weeks (used for remix remixes)
		},
	);

	const imageResp = await fetch(imageUrl);
	const image = await imageResp.blob();

	// Send the image to discord
	const hasTargetBeenPinged = await env.AVATAR_REMIX_FOLLOWUPS.get(
		`pinged:${job.targetUserId}`,
	);
	const pings = [job.requesterUserId];
	if (job.targetUserId && !hasTargetBeenPinged) {
		pings.push(job.targetUserId);
		await env.AVATAR_REMIX_FOLLOWUPS.put(`pinged:${job.targetUserId}`, '1', {
			expirationTtl: 60 * 60 * 15, // ping once per 15 min
		});
	}

	let content: string;
	if (job.type.startsWith('EDIT')) {
		content = `<@${job.requesterUserId}> edited an image! \n\n> **${job.prompt}** \n\n _(remix strength: ${job.strength}, seed: ${job.seed}, original: <${job.url}>)_`;
	} else if (job.remixRemix) {
		content = `<@${job.requesterUserId}> remixed a remix\n\n> **${job.prompt}** \n\n _(remix strength: ${job.strength}, seed: ${job.seed})_`;
	} else {
		content = `<@${job.requesterUserId}> remixed <@${job.targetUserId}>'s profile picture!\n\n> **${job.prompt}** \n\n _(remix strength: ${job.strength}, seed: ${job.seed})_`;
	}

	const attachments = [
		{
			id: 0,
			description: `Remix: ${job.prompt}`,
			filename: 'remix.png',
		},
	];
	const msgJson = {
		content,
		components: [
			{
				type: 1,
				components: [
					{
						type: 2,
						style: 1,
						label: 'remix the remix',
						emoji: {
							name: '♻️',
						},
						custom_id: `remix:${replicateId}`,
					},
					{
						type: 2,
						style: 1,
						label: 'try it again',
						emoji: {
							name: '🎲',
						},
						custom_id: `retry:${replicateId}`,
					},
					{
						type: 2,
						style: 2,
						label: 'edit instructions',
						emoji: {
							name: '✏️',
						},
						custom_id: `edit:${replicateId}`,
					},
				],
			},
		],
		attachments,
		allowed_mentions: {
			users: pings,
		},
	};

	// https://stackoverflow.com/a/35206069
	const formData = new FormData();
	formData.append('payload_json', JSON.stringify(msgJson));
	formData.append('files[0]', image as Blob, 'remix.png');

	const discordUrl = `https://discord.com/api/v10/webhooks/${env.DISCORD_APPLICATION_ID}/${job.interactionToken}`;
	if (!job.remixRemix) {
		await fetch(`${discordUrl}/messages/@original`, {
			method: 'DELETE',
		});
	}
	const discordResponse = await fetch(discordUrl, {
		method: 'POST',
		body: formData,
	});
	if (!discordResponse.ok) {
		console.error('Failed to send followup to discord', discordResponse.status);
		const json = await discordResponse.json();
		console.error({ response: json, msgJson: JSON.stringify(msgJson) });
	}
}
