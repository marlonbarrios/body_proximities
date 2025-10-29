import {
  HandLandmarker,
  PoseLandmarker,
  FaceLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

// Make an object to export
const mediaPipe = {
  handednesses: [],
  handLandmarks: [],
  poseLandmarks: [],
  faceLandmarks: [],
  worldLandmarks: [],
};

let handLandmarker;
let poseLandmarker;
let faceLandmarker;
let runningMode = "VIDEO";
let lastVideoTime = -1;

// Initialize FilesetResolver for Hand, Pose, and Face Landmarkers
const createFilesetResolver = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );
  return vision;
};

const createHandLandmarker = async (vision) => {
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU",
    },
    runningMode: runningMode,
    numHands: 2, // Change number of hands here
  });
};

const createPoseLandmarker = async (vision) => {
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task`,
      delegate: "GPU",
    },
    runningMode,
    numPoses: 1,
  });
};

const createFaceLandmarker = async (vision) => {
  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
      delegate: "GPU",
    },
    outputFaceBlendshapes: true,
    runningMode,
    numFaces: 1,
  });
};

// Initialize FilesetResolver and Landmarkers
(async () => {
  try {
    const vision = await createFilesetResolver();
    await createHandLandmarker(vision);
    await createPoseLandmarker(vision);
    await createFaceLandmarker(vision);
    console.log("Landmarkers initialized successfully.");
  } catch (error) {
    console.error("Error initializing Landmarkers:", error);
  }
})();

const predictWebcam = async (video) => {
  // Now let's start detecting the stream.
  let startTimeMs = performance.now();

  if (handLandmarker && poseLandmarker && faceLandmarker) {
    if (lastVideoTime !== video.elt.currentTime) {
      lastVideoTime = video.elt.currentTime;

      // Detect hand landmarks
      const handResults = handLandmarker.detectForVideo(video.elt, startTimeMs);
      mediaPipe.handednesses = handResults.handednesses;
      mediaPipe.handLandmarks = handResults.landmarks;
      mediaPipe.worldLandmarks = handResults.worldLandmarks;

      // Detect pose landmarks
      const poseResults = poseLandmarker.detectForVideo(video.elt, startTimeMs);
      mediaPipe.poseLandmarks = poseResults.landmarks;

      // Detect face landmarks
      const faceResults = faceLandmarker.detectForVideo(video.elt, startTimeMs);
      mediaPipe.faceLandmarks = faceResults.landmarks;
    }
  } else {
    console.warn("Landmarkers not initialized yet.");
  }

  // Call this function again to keep predicting when the browser is ready.
  window.requestAnimationFrame(() => {
    predictWebcam(video);
  });
};

// Add the predictWebcam function to the mediaPipe object
mediaPipe.predictWebcam = predictWebcam;

// Export our object so we can use it globally
export { mediaPipe };
