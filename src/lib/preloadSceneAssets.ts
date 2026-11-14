import {
  GRUN_WALK,
  IMAGE_SIZES,
  KIND_SW_FRAME_FILES,
  SPORE_CLIPS,
  WORM_SW_FRAME_FILES,
  assetUrl,
  grunWalkFrameUrl,
  sporeFrameUrls,
  type SporeAsset,
} from "@/constants/sceneConfig";

const SCENE_IMAGE_URLS = [
  ...Object.values(IMAGE_SIZES).map(({ file }) => assetUrl(file)),
  ...Array.from({ length: GRUN_WALK.frames }, (_, index) => grunWalkFrameUrl(index)),
  ...(Object.keys(SPORE_CLIPS) as SporeAsset[]).flatMap((asset) => sporeFrameUrls(asset)),
  ...WORM_SW_FRAME_FILES.map((file) => assetUrl(file)),
  ...KIND_SW_FRAME_FILES.map((file) => assetUrl(file)),
];

function loadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "sync";

    img.onload = async () => {
      try {
        if (typeof img.decode === "function") {
          await img.decode();
        }
      } catch {
        // Fall back to onload completion.
      }
      resolve();
    };

    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

/** Decode all scene assets before first paint to avoid partial/cut-off frames. */
export function preloadSceneAssets(): Promise<void> {
  return Promise.all(SCENE_IMAGE_URLS.map(loadImage)).then(() => undefined);
}
