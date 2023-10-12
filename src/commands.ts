// Slash command definition

export const REMIX_COMMAND = {
  name: 'remix',
  description: "Remix someone's profile picture",
  options: [
    {
      name: 'user',
      description: 'The user whose profile picture you want to remix',
      type: 6, // USER
      required: true,
    },
    {
      name: 'instruction',
      description: 'What change do you want to make to the profile picture?',
      type: 3, // STRING
      required: true,
    },
    {
      name: 'strength',
      description: 'The strength of the prompt. Defaults to 7',
      type: 10, // NUMBER
      required: false,
      min_value: 1.0,
      max_value: 20.0,
    },
    {
      name: 'seed',
      description: 'Defaults to a random number',
      type: 4, // INTEGER
      required: false,
      min_value: 0,
      max_value: 1e9,
    },
    {
      name: 'debug-url',
      description: 'Debug tool. Not for you!',
      type: 3, // STRING
      required: false,
    },
  ],
};
