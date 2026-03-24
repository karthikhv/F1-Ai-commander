# Render Recipe (Production)

## 1) Base Settings
- Aspect ratio: 16:9
- Final target: 7680x4320 (8K)
- Steps: 35 to 60
- Guidance scale (CFG): 6.5 to 8.5
- Sampler: DPM++ 2M Karras or equivalent high-fidelity sampler
- Camera framing: wide hero shot, slight low angle, 35mm lens look
- Finishing: subtle filmic contrast, restrained bloom, high clarity

## 2) Suggested Two-Pass Workflow
1. Generate at medium resolution (for composition search):
   - 1344x768, 1536x864, or engine-native near-16:9 size
   - 8 to 16 candidates
2. Keep the best 1 to 3 candidates and run high-res pass:
   - Upscale to 4K first, then to 8K
   - Keep denoise low to preserve structure (0.2 to 0.35 equivalent)

## 3) Prompt Weighting Strategy
- Keep scene structure in the first sentence.
- Keep telemetry and predictive outputs in the middle.
- Keep materials, lighting, and quality descriptors at the end.
- If UI text becomes messy, reduce text-heavy terms and keep labels conceptual.

## 4) Practical Tuning
- If image is too stylized: lower CFG slightly and add photoreal, physically based, realistic reflections.
- If image is too flat: increase steps and emphasize volumetric key/rim lighting.
- If scene is cluttered: remove extra UI nouns and keep 3 to 5 key dashboard elements.
- If car geometry drifts: increase references to modern Formula 1 proportions and carbon-fiber detail.

## 5) Deliverable Standard
A final frame is accepted when:
- Car geometry is realistic and complete
- Neural architecture is visibly layered and interconnected
- Telemetry inputs are present and logically flowing
- Predictive outputs are clearly represented
- Lighting/reflections look physically plausible
- Presentation quality is clean and portfolio-ready
