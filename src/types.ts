export interface Job {
  type: string;
  url: string;
  outputUrl?: string;
  prompt: string;
  interactionToken: string;
  targetUserId?: string;
  requesterUserId: string;
  strength?: number;
  seed?: number;
  remixRemix?: boolean;
  negativePrompt?: boolean;
}

export interface Env {
  AVATAR_REMIX_JOBS: Queue<Job>;
  AVATAR_REMIX_FOLLOWUPS: KVNamespace;

  DISCORD_PUBLIC_KEY: string;
  DISCORD_BOT_TOKEN: string;
  DISCORD_APPLICATION_ID: string;

  REPLICATE_API_TOKEN: string;
  REPLICATE_INSTRUCT_PIX2PIX_MODEL_VERSION: string;
  REPLICATE_ESRGAN_MODEL_VERSION: string;

  WORKER_BASE_URL: string;
}
