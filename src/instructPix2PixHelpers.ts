export const NEGATIVE_PROMPT =
  'duplication, duplicates, mutilation, deformed, mutilated, mutation, twisted body, disfigured, bad anatomy, out of frame, extra fingers, mutated hands, poorly drawn hands, extra limbs, malformed limbs, missing arms, extra arms, missing legs, extra legs, mutated hands, extra hands, fused fingers, missing fingers, extra fingers, rolling eyes, crossed eyes, weird eyes, smudged face, blurred face, poorly drawn face, mutation, mutilation, cloned face, grainy, blurred, blurry, writing, calligraphy, signature, text, watermark, bad art';

export const USE_NEGATIVE_PROMPT = true;

const MAX_EDIT_GUIDANCE_STRENGTH = 20;

const MAX_IMAGE_STRENGTH = 2;

export function getValidStrengthValue(val: string | number | null | undefined): number {
  if (!val) {
    return 7;
  }

  let num = val;
  if (typeof val !== 'number') {
    num = parseInt(val, 10);
  }
  if (isNaN(num as number)) {
    return 7;
  }
  return Math.max(1, Math.min(20, num as number));
}

export function getImageGuidanceFromPromptGuidance(promptGuidance: number): number {
  const imageGuidance = Math.max(
    ((MAX_EDIT_GUIDANCE_STRENGTH - promptGuidance) / MAX_EDIT_GUIDANCE_STRENGTH) *
      MAX_IMAGE_STRENGTH,
    1,
  );
  return imageGuidance;
}
