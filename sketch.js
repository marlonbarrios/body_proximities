/* - - MediaPipe Face, Pose and hands tracking - - */

/*

Hand points (handLandmarks):
https://developers.google.com/static/mediapipe/images/solutions/hand-landmarks.png

We have a total of 21 points per hand:
0 = wrist
4 = thumb tip
8 = index finger tip
20 = pinky tip


Pose points (poseLandmarks):
https://developers.google.com/static/mediapipe/images/solutions/pose_landmarks.png

Key body points:
11 = left shoulder
12 = right shoulder
23 = left hip
24 = right hip
27 = left ankle
28 = right ankle

Chest is calculated as midpoint between shoulders (11 and 12)
Hip center is calculated as midpoint between hips (23 and 24)


What we do in this example:
- get finger tips from both hands
- get body reference points (chest, hips, ankles)
- get face reference points (eyes, mouth, nose, outline)
- calculate distances between hands and body/face points
- create visual connections and sound based on proximity to both body and face

*/


/* - - Variables - - */

// webcam variables
let capture; // our webcam
let captureEvent; // callback when webcam is ready

// styling
let ellipseSize = 20; // size of the ellipses
let letterSize = 20; // size of the letter

// Add at the start of your file, after the existing variables
let synth, bassline, hihat, reverb;
let lastHandPositions = [];
let soundInitialized = false;
let bpm = 120;
let lastTriggerTimes = {
    synth: 0,
    bass: 0,
    hihat: 0
};
const minTriggerIntervals = {
    synth: 0.1,
    bass: 0.2,
    hihat: 0.05
};

// Add these variables at the start with other sound variables
let droneSynth, droneChord;
let lastDroneTime = 0;
const droneInterval = 4; // seconds between drone changes

// Add at the start with other variables
let soundActive = false;
let proximityDuration = 0; // Track how long hands are near body parts
let maxComplexity = 0;
let lastDistances = {
  chest: { left: 0, right: 0 },
  hips: { left: 0, right: 0 },
  ankles: { left: 0, right: 0 }
};

// Sound volume control based on interaction
let lastInteractionTime = 0;
let soundVolume = 1.0; // Start at full volume
const NO_INTERACTION_TIMEOUT = 5000; // 5 seconds in milliseconds
let lastProximityValue = 0; // Track proximity changes


/* - - Setup - - */
function setup() {
  createCanvas(windowWidth, windowHeight);
  captureWebcam(); // launch webcam

  // Remove click handler since we're using spacebar now
  
  // styling
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(20);
  fill('white');
}


/* - - Draw - - */
function draw() {
  // Clear with solid black background
  background(0);

  /* WEBCAM */
  push();
  centerOurStuff();
  
  // Draw webcam with reduced opacity
  tint(255, 80); // Make webcam more transparent
  scale(-1, 1);
  image(capture, -capture.scaledWidth, 0, capture.scaledWidth, capture.scaledHeight);
  scale(-1, 1);
  noTint();

    // Check if landmarks are available
    if (
      mediaPipe.handLandmarks[0] &&
      mediaPipe.handLandmarks[1] &&
      mediaPipe.poseLandmarks &&
      mediaPipe.poseLandmarks[0]
    ) {
      // Set blend mode for additive light effects
      blendMode(ADD);
      
      const poseLandmarks = mediaPipe.poseLandmarks[0];
      const leftHand = mediaPipe.handLandmarks[0];
      const rightHand = mediaPipe.handLandmarks[1];
      const faceLandmarks = mediaPipe.faceLandmarks && mediaPipe.faceLandmarks[0] ? mediaPipe.faceLandmarks[0] : null;
      
      // Define ALL pose landmarks (33 points total)
      // MediaPipe Pose landmarks: 0-32
      const allPoseIndices = [];
      for (let i = 0; i < 33; i++) {
        if (poseLandmarks[i]) {
          allPoseIndices.push(i);
        }
      }
      
      // Define pose skeletal connections (body-to-body relationships)
      const poseConnections = [
        // Face/head connections
        [0, 1], [0, 2], [0, 5], [2, 5],
        // Upper body - shoulders to elbows to wrists
        [11, 13], [13, 15], [12, 14], [14, 16],
        // Shoulders to hips
        [11, 23], [12, 24],
        // Hips to knees to ankles
        [23, 25], [25, 27], [24, 26], [26, 28],
        // Ankles to heels to feet
        [27, 29], [28, 30], [27, 31], [28, 32],
        // Cross connections
        [11, 12], [23, 24], // Shoulders and hips
        [15, 19], [15, 21], [16, 20], [16, 22], // Wrists to hand landmarks
        // Additional skeletal connections
        [0, 11], [0, 12], // Head to shoulders
        [11, 23], [12, 24], // Shoulders to hips
        [25, 27], [26, 28], // Knees to ankles
      ];
      
      // Calculate body reference points (including all 33 landmarks)
      let chestX = 0, chestY = 0;
      let hipCenterX = 0, hipCenterY = 0;
      let leftAnkleX = 0, leftAnkleY = 0;
      let rightAnkleX = 0, rightAnkleY = 0;
      let leftHipX = 0, leftHipY = 0;
      let rightHipX = 0, rightHipY = 0;
      
      // Chest: midpoint between shoulders (11 and 12)
      if (poseLandmarks[11] && poseLandmarks[12]) {
        chestX = (poseLandmarks[11].x + poseLandmarks[12].x) / 2;
        chestY = (poseLandmarks[11].y + poseLandmarks[12].y) / 2;
      }
      
      // Hip center: midpoint between hips (23 and 24)
      if (poseLandmarks[23] && poseLandmarks[24]) {
        hipCenterX = (poseLandmarks[23].x + poseLandmarks[24].x) / 2;
        hipCenterY = (poseLandmarks[23].y + poseLandmarks[24].y) / 2;
        leftHipX = poseLandmarks[23].x;
        leftHipY = poseLandmarks[23].y;
        rightHipX = poseLandmarks[24].x;
        rightHipY = poseLandmarks[24].y;
      }
      
      // Calculate body center - average of key body points
      let bodyCenterX = 0, bodyCenterY = 0;
      let bodyCenterCount = 0;
      const bodyCenterPoints = [11, 12, 23, 24, 0]; // Shoulders, hips, nose
      for (let idx of bodyCenterPoints) {
        if (poseLandmarks[idx]) {
          bodyCenterX += poseLandmarks[idx].x;
          bodyCenterY += poseLandmarks[idx].y;
          bodyCenterCount++;
        }
      }
      if (bodyCenterCount > 0) {
        bodyCenterX /= bodyCenterCount;
        bodyCenterY /= bodyCenterCount;
      }
      
      // Ankles (27 and 28)
      if (poseLandmarks[27]) {
        leftAnkleX = poseLandmarks[27].x;
        leftAnkleY = poseLandmarks[27].y;
      }
      if (poseLandmarks[28]) {
        rightAnkleX = poseLandmarks[28].x;
        rightAnkleY = poseLandmarks[28].y;
      }
    
    // Calculate distances from hands to body parts and create visual effects
    let minDistanceToBody = Infinity;
    let bodyProximity = 0;
    
    // Use ALL hand points (0-20, not just fingertips)
    const allHandIndices = [];
    for (let i = 0; i < 21; i++) {
      allHandIndices.push(i);
    }
    
    // Also keep finger tips for special connections
    const fingerTips = [4, 8, 12, 16, 20];
    
    // Calculate minimum distance from fingertips to body center (less complex)
    if (bodyCenterCount > 0) {
      let bodyCenterScreenX = map(bodyCenterX, 1, 0, 0, capture.scaledWidth);
      let bodyCenterScreenY = map(bodyCenterY, 0, 1, 0, capture.scaledHeight);
      
      for (let hand of [leftHand, rightHand]) {
        if (!hand) continue;
        for (let tipIndex of fingerTips) {
          if (!hand[tipIndex]) continue;
          let handX = map(hand[tipIndex].x, 1, 0, 0, capture.scaledWidth);
          let handY = map(hand[tipIndex].y, 0, 1, 0, capture.scaledHeight);
          
          let d = dist(handX, handY, bodyCenterScreenX, bodyCenterScreenY);
          if (d < minDistanceToBody) minDistanceToBody = d;
        }
      }
    }
    
    // Update proximity based on how close hands are to body
    const maxProximityDist = 400;
    bodyProximity = map(minDistanceToBody, 0, maxProximityDist, 1, 0);
    bodyProximity = constrain(bodyProximity, 0, 1);
    
    proximityDuration = lerp(proximityDuration, bodyProximity, 0.1);
    maxComplexity = map(proximityDuration, 0, 1, 1, 6);

    // Connect to body center - geometric radial connections (ALWAYS VISIBLE)
    if (bodyCenterCount > 0) {
      let bodyCenterScreenX = map(bodyCenterX, 1, 0, 0, capture.scaledWidth);
      let bodyCenterScreenY = map(bodyCenterY, 0, 1, 0, capture.scaledHeight);
      
      // Connect only fingertips to body center (less complex)
      for (let hand of [leftHand, rightHand]) {
        if (!hand) continue;
        
        // Only use fingertips for simplicity
        for (let tipIndex of fingerTips) {
          if (!hand[tipIndex]) continue;
          
          let handX = map(hand[tipIndex].x, 1, 0, 0, capture.scaledWidth);
          let handY = map(hand[tipIndex].y, 0, 1, 0, capture.scaledHeight);
          
          let d = dist(bodyCenterScreenX, bodyCenterScreenY, handX, handY);
          let maxDist = 600; // Increased max distance to always show
          
          // Always draw lines, but vary thickness based on distance and proximity
          let distanceFactor = map(d, 0, maxDist, 1, 0);
          distanceFactor = constrain(distanceFactor, 0, 1);
          
          // Different thickness for different fingertips
          let baseThickness = 0;
          if (tipIndex === 4) baseThickness = 2.5; // Thumb - thickest
          else if (tipIndex === 8) baseThickness = 2.0; // Index - medium-thick
          else if (tipIndex === 20) baseThickness = 1.5; // Pinky - medium
          else baseThickness = 1.8; // Other fingertips - medium-thin
          
          // Vary thickness based on distance and proximity
          let lineThickness = baseThickness * (0.5 + distanceFactor * 0.5);
          if (proximityDuration > 0.1) {
            lineThickness *= (1 + proximityDuration * 0.5); // Thicker when close
          }
          
          // Always visible but with varying opacity
          let opacity = map(d, 0, maxDist, 200, 50); // Fade with distance
          opacity = constrain(opacity, 50, 200); // Always visible, minimum 50
          
          // Geometric: Straight line to body center (always visible)
          stroke(255, 255, 255, opacity);
          strokeWeight(lineThickness);
          line(bodyCenterScreenX, bodyCenterScreenY, handX, handY);
          
          // Geometric: Circle at body center (only when close)
          if (proximityDuration > 0.1) {
            noFill();
            stroke(255, 255, 255, 100 * proximityDuration);
            strokeWeight(2);
            circle(bodyCenterScreenX, bodyCenterScreenY, d * 0.3);
          }
        }
      }
    }
    
    // Connect hand points to body parts with geometric lines - very limited
    if (proximityDuration > 0.08) { // Changed threshold from 0.05 to 0.08
      // Only connect to key body points to avoid freezing
      const keyBodyPoints = [0, 11, 12, 23, 24]; // Nose, shoulders, hips only
      
      for (let poseIndex of keyBodyPoints) {
        if (!poseLandmarks[poseIndex]) continue;
        
        let poseX = map(poseLandmarks[poseIndex].x, 1, 0, 0, capture.scaledWidth);
        let poseY = map(poseLandmarks[poseIndex].y, 0, 1, 0, capture.scaledHeight);
        
        // Connect only fingertips to body (less complex)
        for (let hand of [leftHand, rightHand]) {
          if (!hand) continue;
          
          // Only use fingertips for simplicity
          for (let tipIndex of fingerTips) {
            if (!hand[tipIndex]) continue;
            
            let handX = map(hand[tipIndex].x, 1, 0, 0, capture.scaledWidth);
            let handY = map(hand[tipIndex].y, 0, 1, 0, capture.scaledHeight);
            
            let d = dist(poseX, poseY, handX, handY);
            // Vary max distance based on hand point type - reduced to 50%
            // Different distances for different body parts
            let bodyPartDistance = 0;
            if ([0, 1, 2, 5].includes(poseIndex)) bodyPartDistance = 180; // Head/face
            else if ([11, 12, 13, 14, 15, 16].includes(poseIndex)) bodyPartDistance = 250; // Shoulders/arms
            else if ([23, 24].includes(poseIndex)) bodyPartDistance = 280; // Hips
            else bodyPartDistance = 220; // Other body parts
            
            let maxDist = bodyPartDistance * 0.6 + (50 * proximityDuration);
            
            if (d < maxDist) {
              let intensity = map(d, 0, maxDist, 1, 0);
              intensity = pow(intensity * (0.4 + proximityDuration * 0.4), 0.5);
              
              // Geometric: Simple straight line
              stroke(255, 255, 255, 150 * intensity);
              strokeWeight(1.5 * intensity);
              line(poseX, poseY, handX, handY);
              
              // Geometric: Add small circle at connection point
              if (intensity > 0.3) {
                noStroke();
                fill(255, 255, 255, 100 * intensity);
                circle(handX, handY, 3 * intensity);
              }
            }
          }
        }
      }
    }
    
    // Draw body-to-body connections (skeletal structure) - limited key connections only
    if (proximityDuration > 0.15) {
      // Only draw essential skeletal connections to avoid freezing
      const essentialConnections = [
        [11, 12], // Shoulders
        [23, 24], // Hips
        [11, 23], [12, 24], // Shoulder to hip
        [0, 11], [0, 12] // Head to shoulders
      ];
      
      for (let connection of essentialConnections) {
        let [i, j] = connection;
        if (!poseLandmarks[i] || !poseLandmarks[j]) continue;
        
        let x1 = map(poseLandmarks[i].x, 1, 0, 0, capture.scaledWidth);
        let y1 = map(poseLandmarks[i].y, 0, 1, 0, capture.scaledHeight);
        let x2 = map(poseLandmarks[j].x, 1, 0, 0, capture.scaledWidth);
        let y2 = map(poseLandmarks[j].y, 0, 1, 0, capture.scaledHeight);
        
        let d = dist(x1, y1, x2, y2);
        let maxDist = 500; // Allow longer connections for essential skeleton
        
        if (d < maxDist) {
          let intensity = map(d, 0, maxDist, 0.8, 0.1);
          intensity *= proximityDuration;
          
          // Geometric: Simple straight line for skeleton
          stroke(255, 255, 255, 100 * intensity);
          strokeWeight(1.2 * intensity);
          line(x1, y1, x2, y2);
        }
      }
    }

    // Connect hands to face points with MANY more face landmarks
    if (faceLandmarks) {
      // Expanded face points - using many more landmarks for complex networks
      const facePoints = [
        // Left eye - complete eye region
        33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
        // Right eye - complete eye region
        362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398,
        // Mouth - complete mouth region
        61, 146, 91, 181, 84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318, 13,
        78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
        // Nose - complete nose region
        4, 6, 19, 20, 51, 48, 115, 131, 134, 102, 49, 220, 305, 290, 305, 4, 168, 8, 9, 10,
        94, 125, 141, 235, 236, 3, 195, 197, 5, 51, 48, 220,
        // Face outline - more complete outline
        10, 151, 9, 337, 299, 333, 298, 301, 368, 264, 447, 366, 401, 435, 410, 454,
        356, 389, 251, 284, 332, 297, 338, 10, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234,
        127, 162, 21, 54, 103, 67, 109, 10,
        // Cheeks and jawline
        116, 117, 118, 119, 120, 121, 126, 142, 36, 205, 206, 207, 213, 192, 147, 187,
        207, 216, 212, 202, 214, 192, 213, 147, 187, 116,
        // Eyebrows
        70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 336, 296, 334, 293, 300, 276,
        // Forehead
        10, 151, 337, 299, 333, 298, 301, 9,
        // Additional facial features
        94, 2, 164, 393, 267, 269, 270, 321, 308, 375, 321, 308, 324, 318
      ];
      
      // Remove duplicates and ensure valid indices
      // Reduce to 50% by sampling every other point
      const uniqueFacePoints = [...new Set(facePoints)]
        .filter(idx => idx < faceLandmarks.length)
        .filter((_, idx) => idx % 2 === 0); // Only keep every other face point
      
      // Calculate face proximity using fingertips only (less complex)
      let minDistanceToFace = Infinity;
      for (let pointIndex of uniqueFacePoints) {
        if (!faceLandmarks[pointIndex]) continue;
        
        let faceX = map(faceLandmarks[pointIndex].x, 1, 0, 0, capture.scaledWidth);
        let faceY = map(faceLandmarks[pointIndex].y, 0, 1, 0, capture.scaledHeight);
        
        for (let hand of [leftHand, rightHand]) {
          if (!hand) continue;
          
          // Check distance to fingertips only (less complex)
          for (let handIndex of fingerTips) {
            if (!hand[handIndex]) continue;
            
            let handX = map(hand[handIndex].x, 1, 0, 0, capture.scaledWidth);
            let handY = map(hand[handIndex].y, 0, 1, 0, capture.scaledHeight);
            
            let d = dist(faceX, faceY, handX, handY);
            if (d < minDistanceToFace) {
              minDistanceToFace = d;
            }
          }
        }
      }
      
      // Combine body and face proximity for overall effect
      let faceProximity = 0;
      if (minDistanceToFace < Infinity) {
        const maxFaceDist = 300;
        faceProximity = map(minDistanceToFace, 0, maxFaceDist, 1, 0);
        faceProximity = constrain(faceProximity, 0, 1);
        
        // Update overall proximity to include face
        let overallProximity = (bodyProximity + faceProximity) / 2;
        proximityDuration = lerp(proximityDuration, overallProximity, 0.1);
      }
      
      // Connect face points to hand points - very limited to avoid freezing
      // Only sample a few key face points
      const sampledFacePointsForHands = uniqueFacePoints.filter((_, idx) => idx % 5 === 0 || idx < 10);
      
      for (let pointIndex of sampledFacePointsForHands) {
        if (!faceLandmarks[pointIndex]) continue;
        
        let faceX = map(faceLandmarks[pointIndex].x, 1, 0, 0, capture.scaledWidth);
        let faceY = map(faceLandmarks[pointIndex].y, 0, 1, 0, capture.scaledHeight);
        
        // Connect to sampled hand points
        for (let hand of [leftHand, rightHand]) {
          if (!hand) continue;
          
          // Only use fingertips (less complex)
          for (let handIndex of fingerTips) {
            if (!hand[handIndex]) continue;
            
            let handX = map(hand[handIndex].x, 1, 0, 0, capture.scaledWidth);
            let handY = map(hand[handIndex].y, 0, 1, 0, capture.scaledHeight);
            
            let d = dist(faceX, faceY, handX, handY);
            // Different distances for different face regions and hand points
            // Eyes/mouth closer, outline farther
            let faceRegionDist = 0;
            if (pointIndex >= 33 && pointIndex <= 466) { // Eye region
              faceRegionDist = 200;
            } else if ((pointIndex >= 61 && pointIndex <= 291) || (pointIndex >= 13 && pointIndex <= 17)) { // Mouth region
              faceRegionDist = 220;
            } else if (pointIndex >= 4 && pointIndex <= 195) { // Nose region
              faceRegionDist = 240;
            } else { // Other face regions
              faceRegionDist = 260;
            }
            
            let maxDist = fingerTips.includes(handIndex) ? 
              faceRegionDist * 0.7 : 
              faceRegionDist * 0.9;
            
            if (d < maxDist) {
              let intensity = map(d, 0, maxDist, 1, 0);
              intensity = pow(intensity * (0.35 + faceProximity * 0.35), 0.55);
              
              // Geometric: Simple straight line
              stroke(255, 255, 255, 120 * intensity);
              strokeWeight(1.2 * intensity);
              line(faceX, faceY, handX, handY);
            }
          }
        }
      }
      
      // Connect face points to body points (face-to-body network) - very limited
      if (proximityDuration > 0.2) { // Increased threshold to reduce calculations
        // Only a few key face points
        const sampledFacePointsForBody = uniqueFacePoints.filter((_, idx) => idx % 10 === 0 || idx < 5);
        for (let facePointIndex of sampledFacePointsForBody) {
          if (!faceLandmarks[facePointIndex]) continue;
          
          let faceX = map(faceLandmarks[facePointIndex].x, 1, 0, 0, capture.scaledWidth);
          let faceY = map(faceLandmarks[facePointIndex].y, 0, 1, 0, capture.scaledHeight);
          
          // Connect to key body points (head, shoulders, chest)
          const keyBodyPoints = [0, 11, 12]; // Nose, left shoulder, right shoulder
          for (let bodyIndex of keyBodyPoints) {
            if (!poseLandmarks[bodyIndex]) continue;
            
            let bodyX = map(poseLandmarks[bodyIndex].x, 1, 0, 0, capture.scaledWidth);
            let bodyY = map(poseLandmarks[bodyIndex].y, 0, 1, 0, capture.scaledHeight);
            
            let d = dist(faceX, faceY, bodyX, bodyY);
            // Different distances for face-to-body connections
            let maxDist = 0;
            if (bodyIndex === 0) maxDist = 180; // Face to nose (closer)
            else if ([11, 12].includes(bodyIndex)) maxDist = 250; // Face to shoulders
            else maxDist = 220;
            
            if (d < maxDist) {
              let intensity = map(d, 0, maxDist, 0.6, 0.1);
              intensity *= (faceProximity + proximityDuration) * 0.5;
              
              // Geometric: Simple straight line
              stroke(255, 255, 255, 80 * intensity);
              strokeWeight(1.0 * intensity);
              line(faceX, faceY, bodyX, bodyY);
            }
          }
        }
      }
      
      // Create simple network between facial points (face-to-face network) - very limited
      // Only sample a few key points to avoid freezing
      const faceNetworkPoints = uniqueFacePoints.filter((_, idx) => idx % 10 === 0 || idx < 5); // Very reduced sampling
      
      for (let i = 0; i < faceNetworkPoints.length; i++) {
        for (let j = i + 1; j < faceNetworkPoints.length; j++) {
          let pointI = faceNetworkPoints[i];
          let pointJ = faceNetworkPoints[j];
          if (!faceLandmarks[pointI] || !faceLandmarks[pointJ]) continue;
          
          let x1 = map(faceLandmarks[pointI].x, 1, 0, 0, capture.scaledWidth);
          let y1 = map(faceLandmarks[pointI].y, 0, 1, 0, capture.scaledHeight);
          let x2 = map(faceLandmarks[pointJ].x, 1, 0, 0, capture.scaledWidth);
          let y2 = map(faceLandmarks[pointJ].y, 0, 1, 0, capture.scaledHeight);
          
          let d = dist(x1, y1, x2, y2);
          // Different distances for face-to-face network - reduced to 50%
          // Vary based on face region proximity
          let maxDist = 60 + (faceProximity * 30); // Reduced from 100+50
          
          if (d < maxDist) {
            let intensity = map(d, 0, maxDist, 0.8, 0.1);
            intensity = pow(intensity, 1.3);
            intensity *= (0.3 + faceProximity * 0.4);
            
            // Geometric: Simple straight line
            stroke(255, 255, 255, 60 * intensity);
            strokeWeight(0.8 * intensity);
            line(x1, y1, x2, y2);
          }
        }
      }
    }

    // Old face network code - now replaced with active face connections above
    /*
    const networkPoints = [
      // Key facial points for minimal network
      33, 133,  // Eyes corners
      362, 263,
      61, 291,  // Mouth corners
      4,        // Nose tip
      168, 397, // Cheeks
      10, 152,  // Forehead
      70, 336   // Eyebrows
    ];

    // Draw network connections with subtle effects
    for (let i = 0; i < networkPoints.length; i++) {
      for (let j = i + 1; j < networkPoints.length; j++) {
        let x1 = map(faceLandmarks[networkPoints[i]].x, 1, 0, 0, capture.scaledWidth);
        let y1 = map(faceLandmarks[networkPoints[i]].y, 0, 1, 0, capture.scaledHeight);
        let x2 = map(faceLandmarks[networkPoints[j]].x, 1, 0, 0, capture.scaledWidth);
        let y2 = map(faceLandmarks[networkPoints[j]].y, 0, 1, 0, capture.scaledHeight);
        
        let d = dist(x1, y1, x2, y2);
        let maxDist = 120;
        
        if (d < maxDist) {
          let intensity = map(d, 0, maxDist, 1, 0);
          intensity = pow(intensity, 1.5); // Softer falloff
          
          // Draw delicate lines
          for (let k = 0; k < 2; k++) {
            let alpha = map(k, 0, 2, 40 * intensity, 0);
            stroke(255, 255, 255, alpha);
            strokeWeight(0.2 + (0.1 * (1-k)));
            
            // Single subtle wave
            beginShape();
            noFill();
            for (let t = 0; t <= 1; t += 0.05) {
              let x = lerp(x1, x2, t);
              let y = lerp(y1, y2, t);
              
              // Gentle wave pattern
              let time = frameCount * 0.02;
              let wave = sin(t * PI * 2 + time) * intensity;
              
              vertex(x + wave, y + wave);
            }
            endShape();
          }
          
          // Occasional subtle particles
          if (random() < 0.03 * intensity) {
            let t = random();
            let x = lerp(x1, x2, t);
            let y = lerp(y1, y2, t);
            noStroke();
            fill(255, 20 * intensity);
            circle(x + random(-0.2, 0.2), y + random(-0.2, 0.2), 0.3);
          }
        }
      }
    }
    */

    // Draw ALL hand points with glow (fingertips brighter, other points dimmer)
    for (let hand of [leftHand, rightHand]) {
      if (!hand) continue;
      
      for (let handIndex of allHandIndices) {
        if (!hand[handIndex]) continue;
        
        let pointX = map(hand[handIndex].x, 1, 0, 0, capture.scaledWidth);
        let pointY = map(hand[handIndex].y, 0, 1, 0, capture.scaledHeight);
        
        // Fingertips get brighter treatment
        let isFingerTip = fingerTips.includes(handIndex);
        let pointSize = isFingerTip ? 3 : 1.5;
        let glowSize = isFingerTip ? 15 : 8;
        let coreAlpha = isFingerTip ? 200 : 120;
        let glowAlpha = isFingerTip ? 100 : 50;
        
        // Bright core
        noStroke();
        fill(255, 255, 255, coreAlpha);
        circle(pointX, pointY, pointSize);
        
        // Glow effect
        for (let size = glowSize; size > 0; size -= 2) {
          fill(255, 255, 255, map(size, glowSize, 0, 0, glowAlpha));
          circle(pointX, pointY, size);
        }
      }
    }

    // After drawing finger tip points, before resetting blend mode
    
    // Draw lines between hand points within each hand
    strokeWeight(0.5); // Much thinner lines
    
    // Skip within-hand connections to avoid freezing - too many calculations
    
    // Connect hand points between hands - only fingertips
    if (leftHand && rightHand && proximityDuration > 0.1) { // Added threshold
      // Connect only fingertips between hands
      for (let tipIndex of fingerTips) {
        if (!leftHand[tipIndex] || !rightHand[tipIndex]) continue;
        
        let x1 = map(leftHand[tipIndex].x, 1, 0, 0, capture.scaledWidth);
        let y1 = map(leftHand[tipIndex].y, 0, 1, 0, capture.scaledHeight);
        let x2 = map(rightHand[tipIndex].x, 1, 0, 0, capture.scaledWidth);
        let y2 = map(rightHand[tipIndex].y, 0, 1, 0, capture.scaledHeight);
        
        let d = dist(x1, y1, x2, y2);
        // Different distances for different fingertips
        let maxDist = 0;
        if (tipIndex === 4) maxDist = 200; // Thumbs
        else if (tipIndex === 8) maxDist = 220; // Index fingers
        else if (tipIndex === 20) maxDist = 210; // Pinkies
        else maxDist = 215; // Other fingertips
        
        if (d < maxDist) {
          let intensity = map(d, 0, maxDist, 1, 0);
          let handPointWeight = 1.5;
          
          // Geometric: Simple straight line (hands less complex)
          stroke(255, 255, 255, 120 * intensity * handPointWeight);
          strokeWeight(1.5 * intensity * handPointWeight);
          line(x1, y1, x2, y2);
        }
      }
    }

    // After the existing finger connections code, before sound generation
    
    // Face-to-hand connections removed - replaced with body-to-hand connections above
    /*
    const facePoints = [
      // Eyes
      33, 133, 157, 158, 159, 160, 161, 246,  // Left eye
      362, 263, 386, 387, 388, 389, 390, 466,  // Right eye
      // Mouth
      61, 185, 40, 39, 37, 0, 267, 269, 270, 409,
      // Nose
      168, 193, 245, 122, 196, 3, 51, 45, 275,
      // Face outline
      10, 338, 297, 332, 284, 251, 389, 
      152, 148, 176, 149, 150, 136, 172
    ];
    
    // Connect face points to finger tips
    if (leftHand || rightHand) {
      for (let pointIndex of facePoints) {
        let faceX = map(faceLandmarks[pointIndex].x, 1, 0, 0, capture.scaledWidth);
        let faceY = map(faceLandmarks[pointIndex].y, 0, 1, 0, capture.scaledHeight);
        
        // Connect to both hands
        for (let hand of [leftHand, rightHand]) {
          if (!hand) continue;
          
          for (let fingerTip of fingerTips) {
            let handX = map(hand[fingerTip].x, 1, 0, 0, capture.scaledWidth);
            let handY = map(hand[fingerTip].y, 0, 1, 0, capture.scaledHeight);
            
            let d = dist(faceX, faceY, handX, handY);
            let maxDist = 150;
            
            if (d < maxDist) {
              let intensity = map(d, 0, maxDist, 1, 0);
              intensity = pow(intensity, 0.8);
              
              // Draw multiple thin lines with wave effect
              for (let k = 0; k < 3; k++) {
                let alpha = map(k, 0, 3, 50 * intensity, 0);
                stroke(255, 255, 255, alpha);
                strokeWeight(0.2 + (0.1 * (2-k)));
                
                // Create multiple delicate paths
                for (let offset = -0.5; offset <= 0.5; offset += 0.5) {
                  beginShape();
                  noFill();
                  for (let t = 0; t <= 1; t += 0.02) {
                    let x = lerp(faceX, handX, t);
                    let y = lerp(faceY, handY, t);
                    
                    // Complex wave patterns
                    let time = frameCount * 0.05;
                    let wave1 = sin(t * PI * 6 + time) * intensity;
                    let wave2 = cos(t * PI * 8 + time * 0.7) * 0.8 * intensity;
                    let wave3 = sin(t * PI * 4 + time * 1.2) * 0.5 * intensity;
                    
                    // Add subtle spiral effect
                    let spiral = sin(t * PI * 2) * offset * intensity;
                    
                    vertex(
                      x + (wave1 + wave2 + spiral) * 0.8, 
                      y + (wave2 + wave3 + spiral) * 0.8
                    );
                  }
                  endShape();
                }
              }
              
              // Add tiny particles along connection
              if (random() < 0.05 * intensity) {
                let t = random();
                let x = lerp(faceX, handX, t);
                let y = lerp(faceY, handY, t);
                noStroke();
                fill(255, 30 * intensity);
                circle(x + random(-0.3, 0.3), y + random(-0.3, 0.3), 0.3);
              }
            }
          }
        }
      }
    }
    */

    // Reset blend mode
    blendMode(BLEND);
  }
  
  // Sound generation based on movement - ALWAYS run, even if no models detected
  if (soundInitialized && soundActive) {
    const currentTime = Tone.now();
    const currentTimeMs = millis(); // Get time in milliseconds for interaction tracking
    
    // Get landmarks (may be null if not detected) - check outside the visual block
    const poseLandmarks = mediaPipe.poseLandmarks && mediaPipe.poseLandmarks[0] ? mediaPipe.poseLandmarks[0] : null;
    const leftHand = mediaPipe.handLandmarks && mediaPipe.handLandmarks[0] ? mediaPipe.handLandmarks[0] : null;
    const rightHand = mediaPipe.handLandmarks && mediaPipe.handLandmarks[1] ? mediaPipe.handLandmarks[1] : null;
    const faceLandmarks = mediaPipe.faceLandmarks && mediaPipe.faceLandmarks[0] ? mediaPipe.faceLandmarks[0] : null;
    
    // Track hand movements
    let leftHandVelocity = 0;
    let rightHandVelocity = 0;
    
    // Check if any models are detected at all
    let handsDetected = (leftHand && leftHand[8]) || (rightHand && rightHand[8]);
    let bodyDetected = poseLandmarks && poseLandmarks.length > 0;
    let faceDetected = faceLandmarks && faceLandmarks.length > 0;
    let anyModelDetected = handsDetected || bodyDetected || faceDetected;
    
    // Check for any interaction (movement or proximity)
    // Only count significant, intentional movement - not micro-movements
    let hasInteraction = false;
    
    // If no models detected at all, immediately start fade (no interaction)
    if (!anyModelDetected) {
      hasInteraction = false;
      proximityDuration = 0; // Reset proximity when nothing detected
      // Don't update lastInteractionTime if models just disappeared
      // This allows the existing timer to continue
    } else if (!handsDetected) {
      // If hands not detected but other models are, still no interaction
      hasInteraction = false;
    } else {
      // Calculate left hand movement
      if (leftHand && leftHand[8]) {
        let currentLeft = createVector(
          map(leftHand[8].x, 1, 0, 0, capture.scaledWidth),
          map(leftHand[8].y, 0, 1, 0, capture.scaledHeight)
        );
        
        if (lastHandPositions[0]) {
          leftHandVelocity = currentLeft.dist(lastHandPositions[0]);
          // Only count significant, intentional movement (higher threshold)
          if (leftHandVelocity > 20) {
            hasInteraction = true;
          }
        }
        lastHandPositions[0] = currentLeft;
      } else {
        // Left hand disappeared - reset its position
        lastHandPositions[0] = null;
      }
      
      // Calculate right hand movement
      if (rightHand && rightHand[8]) {
        let currentRight = createVector(
          map(rightHand[8].x, 1, 0, 0, capture.scaledWidth),
          map(rightHand[8].y, 0, 1, 0, capture.scaledHeight)
        );
        
        if (lastHandPositions[1]) {
          rightHandVelocity = currentRight.dist(lastHandPositions[1]);
          // Only count significant, intentional movement (higher threshold)
          if (rightHandVelocity > 20) {
            hasInteraction = true;
          }
        }
        lastHandPositions[1] = currentRight;
      } else {
        // Right hand disappeared - reset its position
        lastHandPositions[1] = null;
      }
    }
    
    // Calculate proximity change BEFORE checking for interaction
    // If no models detected, set proximity to 0
    if (!anyModelDetected) {
      proximityDuration = 0;
    }
    
    let proximityChange = 0;
    if (lastProximityValue !== undefined) {
      proximityChange = abs(proximityDuration - lastProximityValue);
    }
    lastProximityValue = proximityDuration;
    
    // Only count proximity as interaction if it's rapidly changing (active movement)
    // Threshold increased to avoid tiny fluctuations
    if (proximityChange > 0.15) { // Only significant rapid changes count
      hasInteraction = true;
    }
    
    // Initialize lastInteractionTime if it's 0 (first time)
    if (lastInteractionTime === 0) {
      lastInteractionTime = currentTimeMs;
    }
    
    // Update last interaction time and volume
    if (hasInteraction) {
      lastInteractionTime = currentTimeMs;
      // Gradually increase volume when interaction detected
      soundVolume = lerp(soundVolume, 1.0, 0.2);
    } else {
      // Always check time since last interaction
      let timeSinceLastInteraction = currentTimeMs - lastInteractionTime;
      
      // Check if 5 seconds have passed without interaction
      if (timeSinceLastInteraction > NO_INTERACTION_TIMEOUT) {
        // Fade volume to 0 - use gradual fade rate for smooth transition
        soundVolume = lerp(soundVolume, 0.0, 0.05);
        // Clamp volume to 0
        if (soundVolume < 0.01) {
          soundVolume = 0;
        }
      }
    }
    
    // Constrain volume between 0 and 1
    soundVolume = constrain(soundVolume, 0, 1);
    
    // Apply volume to master gain node - use direct value assignment for better control
    if (window.masterVolumeNode) {
      window.masterVolumeNode.gain.value = soundVolume;
    }
    
    // Debug: log volume every 30 frames (about twice per second)
    if (frameCount % 30 === 0) {
      let timeSince = Math.round((currentTimeMs - lastInteractionTime) / 1000);
      let modelsStatus = anyModelDetected ? "YES" : "NO (nothing detected)";
      let handsStatus = handsDetected ? "YES" : "NO";
      console.log("Volume:", soundVolume.toFixed(2), 
                 "| Models detected:", modelsStatus,
                 "| Hands:", handsStatus,
                 "| Interaction:", hasInteraction, 
                 "| L_vel:", leftHandVelocity.toFixed(0),
                 "| R_vel:", rightHandVelocity.toFixed(0),
                 "| ProxΔ:", proximityChange.toFixed(3),
                 "| Time since interaction:", timeSince + "s",
                 "| Will fade:", (timeSince >= 5 ? "YES (fading now)" : "NO (wait " + (5 - timeSince) + "s more)"));
    }
    
    // Update drone every few seconds - but only if volume is above 0
    if (soundVolume > 0.01 && currentTime - lastDroneTime >= droneInterval) {
      try {
        // Release previous drone
        droneSynth.releaseAll();
        
        // Generate new drone based on hand positions
        let rootNote = 48; // C2
        if (leftHand && leftHand[8]) {
          rootNote = Math.floor(map(leftHand[8].y, 0, 1, 48, 60));
        }
        
        // Create drone chord
        droneChord = [
          Tone.Frequency(rootNote, "midi").toNote(),
          Tone.Frequency(rootNote + 7, "midi").toNote(),
          Tone.Frequency(rootNote + 12, "midi").toNote(),
          Tone.Frequency(rootNote + 16, "midi").toNote()
        ];
        
        // Trigger drone with very low velocity for subtle effect, multiplied by volume
        droneSynth.triggerAttack(droneChord, currentTime, 0.1 * soundVolume);
        lastDroneTime = currentTime;
      } catch (error) {
        console.error("Drone trigger error:", error);
      }
    }
    
    // Stop drone if volume is 0
    if (soundVolume <= 0.01) {
      try {
        droneSynth.releaseAll();
      } catch (error) {
        // Ignore errors
      }
    }
    
    // Modify existing triggers for more ambient quality
    if (leftHand && leftHand[8] && leftHandVelocity > 15 && 
        currentTime - lastTriggerTimes.synth >= minTriggerIntervals.synth) {
      try {
        let note = Math.floor(map(leftHand[8].y, 0, 1, 60, 72));
        synth.triggerAttackRelease(Tone.Frequency(note, "midi"), "2n", undefined, 0.3 * soundVolume);
        lastTriggerTimes.synth = currentTime;
      } catch (error) {
        console.error("Synth trigger error:", error);
      }
    }
    
    // Bass notes triggered by proximity to body (chest/hips)
    if (proximityDuration > 0.3 && 
        currentTime - lastTriggerTimes.bass >= minTriggerIntervals.bass) {
      try {
        let bassNote = Math.floor(map(proximityDuration, 0.3, 1.0, 36, 48));
        // Increased velocity from 0.4 to 0.7 for louder sound, multiplied by volume
        bassline.triggerAttackRelease(Tone.Frequency(bassNote, "midi"), "1n", undefined, 0.7 * soundVolume);
        lastTriggerTimes.bass = currentTime;
      } catch (error) {
        console.error("Bass trigger error:", error);
      }
    }
    
    // Make hi-hat softer and less frequent
    if (frameCount % 16 === 0 && 
        currentTime - lastTriggerTimes.hihat >= minTriggerIntervals.hihat) {
      try {
        let velocity = map(leftHandVelocity + rightHandVelocity, 0, 30, 0.05, 0.2);
        hihat.triggerAttackRelease("16n", undefined, velocity * soundVolume);
        lastTriggerTimes.hihat = currentTime;
      } catch (error) {
        console.error("Hi-hat trigger error:", error);
      }
    }
  }
  
  pop();
}


/* - - Helper functions - - */

// function: launch webcam
function captureWebcam() {
  capture = createCapture(
    {
      audio: false,
      video: {
        facingMode: "user",
      },
    },
    function (e) {
      captureEvent = e;
      console.log(captureEvent.getTracks()[0].getSettings());
      // do things when video ready
      // until then, the video element will have no dimensions, or default 640x480
      capture.srcObject = e;

      setCameraDimensions(capture);
      mediaPipe.predictWebcam(capture);
      //mediaPipe.predictWebcam(parentDiv);
    }
  );
  capture.elt.setAttribute("playsinline", "");
  capture.hide();
}

// function: resize webcam depending on orientation
function setCameraDimensions(video) {

  const vidAspectRatio = video.width / video.height; // aspect ratio of the video
  const canvasAspectRatio = width / height; // aspect ratio of the canvas

  if (vidAspectRatio > canvasAspectRatio) {
    // Image is wider than canvas aspect ratio
    video.scaledHeight = height;
    video.scaledWidth = video.scaledHeight * vidAspectRatio;
  } else {
    // Image is taller than canvas aspect ratio
    video.scaledWidth = width;
    video.scaledHeight = video.scaledWidth / vidAspectRatio;
  }
}


// function: center our stuff
function centerOurStuff() {
  translate(width / 2 - capture.scaledWidth / 2, height / 2 - capture.scaledHeight / 2); // center the webcam
}

// function: window resize
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  setCameraDimensions(capture);
}

// Add this function after setup()
function initSound() {
  if (soundInitialized) return;
  
  try {
    Tone.start();
    
    // Create master volume gain node for global volume control
    const masterVolume = new Tone.Gain(1.0).toDestination();
    
    // Create effects with longer decay
    reverb = new Tone.Reverb({
      decay: 4,
      wet: 0.4
    }).connect(masterVolume);
    
    // Add delay effect
    const delay = new Tone.FeedbackDelay({
      delayTime: "8n",
      feedback: 0.3,
      wet: 0.2
    }).connect(reverb);
    
    // Drone synth
    droneSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "sine4"
      },
      envelope: {
        attack: 2,
        decay: 1,
        sustain: 1,
        release: 4
      }
    }).connect(delay);
    
    // Main synth with longer release
    synth = new Tone.Synth({
      oscillator: {
        type: "triangle4"
      },
      envelope: {
        attack: 0.1,
        decay: 0.3,
        sustain: 0.4,
        release: 1
      }
    }).connect(delay);
    
    // Bass synth with more resonance
    bassline = new Tone.MonoSynth({
      oscillator: {
        type: "triangle"
      },
      envelope: {
        attack: 0.1,
        decay: 0.3,
        sustain: 0.6,
        release: 0.8
      },
      filterEnvelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.4,
        release: 0.8,
        baseFrequency: 100,
        octaves: 3
      }
    }).connect(reverb);
    
    // Softer hi-hat
    hihat = new Tone.NoiseSynth({
      noise: {
        type: "pink"
      },
      envelope: {
        attack: 0.02,
        decay: 0.2,
        sustain: 0,
        release: 0.2
      }
    }).connect(reverb);
    
    // Store master volume for control
    window.masterVolumeNode = masterVolume;
    
    // Initialize drone chord
    droneChord = ['C2', 'G2', 'C3', 'E3'];
    
    Tone.Transport.bpm.value = bpm;
    
    soundInitialized = true;
    console.log("Sound initialized!");
  } catch (error) {
    console.error("Error initializing sound:", error);
  }
}

// Add this function to handle keyboard input
function keyPressed() {
  if (key === ' ') {  // Space bar
    if (!soundInitialized) {
      initSound();
    }
    soundActive = !soundActive;  // Toggle sound state
    
    if (!soundActive) {
      // Stop all sounds when toggling off
      try {
        if (droneSynth) droneSynth.releaseAll();
        if (synth) synth.releaseAll();
        if (bassline) bassline.releaseAll();
        if (hihat) hihat.releaseAll();
      } catch (error) {
        console.error("Error stopping sounds:", error);
      }
      soundVolume = 1.0; // Reset volume when toggling off
      lastInteractionTime = millis(); // Reset interaction time
    } else {
      // Reset interaction time when sound is activated
      lastInteractionTime = millis();
      soundVolume = 1.0;
    }
  }
}

