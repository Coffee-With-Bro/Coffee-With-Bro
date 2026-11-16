import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from "@mediapipe/tasks-vision";

export async function createHandTracker() {
  const files = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
  return HandLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: "/mediapipe/hand_landmarker.task", delegate: "CPU" },
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });
}

// Fixed left/right slots: presence + 21 wrist-relative xyz points + screen wrist xy.
// Keeping the wrist trajectory allows DTW to distinguish dynamic symbols.
export function landmarkFeatures(result: HandLandmarkerResult): number[] | null {
  if (!result.landmarks.length) return null;
  const features = Array<number>(132).fill(0);
  result.landmarks.forEach((points, index) => {
    const offset = result.handedness[index]?.[0]?.categoryName === "Left" ? 0 : 66;
    const wrist = points[0];
    const scale = Math.max(0.025, Math.hypot(points[9].x - wrist.x, points[9].y - wrist.y));
    features[offset] = 1;
    points.forEach((p, i) => {
      features[offset + 1 + i * 3] = Math.max(-6, Math.min(6, (p.x - wrist.x) / scale));
      features[offset + 2 + i * 3] = Math.max(-6, Math.min(6, (p.y - wrist.y) / scale));
      features[offset + 3 + i * 3] = Math.max(-6, Math.min(6, (p.z - wrist.z) / scale));
    });
    features[offset + 64] = wrist.x;
    features[offset + 65] = wrist.y;
  });
  return features;
}

export interface LandmarkSample { timestamp: number; features: number[] | null }
