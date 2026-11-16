# Local hand-tracking assets

The WASM files are copied from the pinned `@mediapipe/tasks-vision@0.10.21`
package (Apache-2.0). Source: https://github.com/google-ai-edge/mediapipe
License: https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE

`hand_landmarker.task` is Google's versioned float16 hand-landmarker model:
https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task

`assets.json` records origins, runtime version and SHA-256 hashes. All inference
assets are served from the local app; runtime CDN downloads are not required.
The browser integration test checks that the recognition flow makes no external
network requests. The newer runtime's metrics request was incompatible with the
project's offline requirement, so the runtime is pinned and covered by that test.

After reinstalling dependencies, refresh/verify these assets from the repository root:

```powershell
node scripts/setup-hand-assets.mjs
```

If the task file is absent, `node scripts/setup-hand-assets.mjs --download-model`
downloads the versioned model and verifies its expected hash. This setup step
needs internet; normal app use does not.
