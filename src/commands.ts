// Slash command definition
import {InteractionContextType, ApplicationIntegrationType, ApplicationCommandOptionType} from 'discord-api-types/v10';

export const REMIX_COMMAND = {
	name: 'remix',
	description: "Remix someone's profile picture",
	integration_types: [
		ApplicationIntegrationType.GuildInstall,
		ApplicationIntegrationType.UserInstall,
	],
	contexts: [
		InteractionContextType.Guild, 
		InteractionContextType.BotDM, 
		InteractionContextType.PrivateChannel
	],
	options: [
		{
			name: 'user',
			description: 'The user whose profile picture you want to remix',
			type: ApplicationCommandOptionType.User,
			required: true,
		},
		{
			name: 'instruction',
			description: 'What change do you want to make to the profile picture?',
			type: ApplicationCommandOptionType.String,
			required: true,
		},
		{
			name: 'strength',
			description: 'The strength of the prompt. Defaults to 7',
			type: ApplicationCommandOptionType.Number,
			required: false,
			min_value: 1.0,
			max_value: 20.0,
		},
		{
			name: 'seed',
			description: 'Defaults to a random number',
			type: ApplicationCommandOptionType.Integer,
			required: false,
			min_value: 0,
			max_value: 1e9,
		},
		{
			name: 'debug-url',
			description: 'Debug tool. Not for you!',
			type: ApplicationCommandOptionType.String,
			required: false,
		},
	],
};
