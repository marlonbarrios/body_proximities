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
    
    // Calculate body reference points
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
    
    // Calculate minimum distance from hands to any body part
    const fingerTips = [4, 8, 12, 16, 20];
    for (let hand of [leftHand, rightHand]) {
      if (!hand) continue;
      for (let tipIndex of fingerTips) {
        if (!hand[tipIndex]) continue;
        let handX = map(hand[tipIndex].x, 1, 0, 0, capture.scaledWidth);
        let handY = map(hand[tipIndex].y, 0, 1, 0, capture.scaledHeight);
        
        // Check distance to chest
        if (chestX !== 0 || chestY !== 0) {
          let chestScreenX = map(chestX, 1, 0, 0, capture.scaledWidth);
          let chestScreenY = map(chestY, 0, 1, 0, capture.scaledHeight);
          let d = dist(handX, handY, chestScreenX, chestScreenY);
          if (d < minDistanceToBody) minDistanceToBody = d;
        }
        
        // Check distance to hips
        if (hipCenterX !== 0 || hipCenterY !== 0) {
          let hipScreenX = map(hipCenterX, 1, 0, 0, capture.scaledWidth);
          let hipScreenY = map(hipCenterY, 0, 1, 0, capture.scaledHeight);
          let d = dist(handX, handY, hipScreenX, hipScreenY);
          if (d < minDistanceToBody) minDistanceToBody = d;
        }
        
        // Check distance to ankles
        if (leftAnkleX !== 0 || leftAnkleY !== 0) {
          let ankleScreenX = map(leftAnkleX, 1, 0, 0, capture.scaledWidth);
          let ankleScreenY = map(leftAnkleY, 0, 1, 0, capture.scaledHeight);
          let d = dist(handX, handY, ankleScreenX, ankleScreenY);
          if (d < minDistanceToBody) minDistanceToBody = d;
        }
        if (rightAnkleX !== 0 || rightAnkleY !== 0) {
          let ankleScreenX = map(rightAnkleX, 1, 0, 0, capture.scaledWidth);
          let ankleScreenY = map(rightAnkleY, 0, 1, 0, capture.scaledHeight);
          let d = dist(handX, handY, ankleScreenX, ankleScreenY);
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

    // Connect hands to body parts with visual effects
    if (proximityDuration > 0.1) {
      // Body reference points for connection
      const bodyPoints = [
        { name: 'chest', x: chestX, y: chestY },
        { name: 'hips', x: hipCenterX, y: hipCenterY },
        { name: 'leftHip', x: leftHipX, y: leftHipY },
        { name: 'rightHip', x: rightHipX, y: rightHipY },
        { name: 'leftAnkle', x: leftAnkleX, y: leftAnkleY },
        { name: 'rightAnkle', x: rightAnkleX, y: rightAnkleY }
      ];
      
      for (let bodyPoint of bodyPoints) {
        if ((bodyPoint.x === 0 && bodyPoint.y === 0) || !bodyPoint.x || !bodyPoint.y) continue;
        
        let bodyX = map(bodyPoint.x, 1, 0, 0, capture.scaledWidth);
        let bodyY = map(bodyPoint.y, 0, 1, 0, capture.scaledHeight);
        
        // Connect to both hands
        for (let hand of [leftHand, rightHand]) {
          if (!hand || !hand[0]) continue;
          
          let handX = map(hand[0].x, 1, 0, 0, capture.scaledWidth);
          let handY = map(hand[0].y, 0, 1, 0, capture.scaledHeight);
          
          let d = dist(bodyX, bodyY, handX, handY);
          let maxDist = 350 + (150 * proximityDuration);
          
          if (d < maxDist) {
            let intensity = map(d, 0, maxDist, 1, 0);
            intensity = pow(intensity * (0.5 + proximityDuration * 0.5), 0.4);
            
            // Number of layers increases with complexity
            let numLayers = floor(map(maxComplexity, 1, 6, 1, 3));
            for (let k = 0; k < numLayers; k++) {
              let alpha = map(k, 0, numLayers, 255 * intensity, 0);
              stroke(255, 255, 255, alpha);
              strokeWeight(0.8 + (0.2 * proximityDuration));
              
              // Wave complexity increases with duration
              let numWaves = floor(map(maxComplexity, 1, 6, 1, 3));
              beginShape();
              noFill();
              for (let t = 0; t <= 1; t += 0.05) {
                let x = lerp(bodyX, handX, t);
                let y = lerp(bodyY, handY, t);
                
                let totalWave = 0;
                for (let w = 1; w <= numWaves; w++) {
                  let time = frameCount * 0.1;
                  totalWave += sin(t * PI * (2 * w) + time) * (2 + w) * intensity;
                }
                
                vertex(x + totalWave, y + totalWave);
              }
              endShape();
            }
            
            // Particles increase with complexity
            let particleChance = map(maxComplexity, 1, 6, 0.02, 0.08);
            if (random() < particleChance * intensity) {
              let t = random();
              let x = lerp(bodyX, handX, t);
              let y = lerp(bodyY, handY, t);
              noStroke();
              fill(255, 255, 255, 150 * intensity);
              let size = random(0.8, 0.8 + proximityDuration);
              circle(x + random(-1, 1), y + random(-1, 1), size);
            }
          }
        }
      }
    }

    // Connect hands to face points
    if (faceLandmarks) {
      // Key face points for connections
      const facePoints = [
        // Eyes
        33, 133, 157, 158, 159, 160, 161, 246,  // Left eye
        362, 263, 386, 387, 388, 389, 390, 466,  // Right eye
        // Mouth
        61, 185, 40, 39, 37, 0, 267, 269, 270, 409,
        // Nose
        4, 6, 19, 20, 94, 125, 141, 235, 236, 3,
        // Face outline
        10, 338, 297, 332, 284, 251, 389,
        152, 148, 176, 149, 150, 136, 172
      ];
      
      // Calculate face proximity
      let minDistanceToFace = Infinity;
      for (let pointIndex of facePoints) {
        if (!faceLandmarks[pointIndex]) continue;
        
        let faceX = map(faceLandmarks[pointIndex].x, 1, 0, 0, capture.scaledWidth);
        let faceY = map(faceLandmarks[pointIndex].y, 0, 1, 0, capture.scaledHeight);
        
        for (let hand of [leftHand, rightHand]) {
          if (!hand || !hand[0]) continue;
          
          let handX = map(hand[0].x, 1, 0, 0, capture.scaledWidth);
          let handY = map(hand[0].y, 0, 1, 0, capture.scaledHeight);
          
          let d = dist(faceX, faceY, handX, handY);
          if (d < minDistanceToFace) {
            minDistanceToFace = d;
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
      
      // Connect face points to hands
      for (let pointIndex of facePoints) {
        if (!faceLandmarks[pointIndex]) continue;
        
        let faceX = map(faceLandmarks[pointIndex].x, 1, 0, 0, capture.scaledWidth);
        let faceY = map(faceLandmarks[pointIndex].y, 0, 1, 0, capture.scaledHeight);
        
        // Connect to both hands
        for (let hand of [leftHand, rightHand]) {
          if (!hand || !hand[0]) continue;
          
          // Connect to wrist and finger tips
          for (let tipIndex of [0, ...fingerTips]) {
            if (!hand[tipIndex]) continue;
            
            let handX = map(hand[tipIndex].x, 1, 0, 0, capture.scaledWidth);
            let handY = map(hand[tipIndex].y, 0, 1, 0, capture.scaledHeight);
            
            let d = dist(faceX, faceY, handX, handY);
            let maxDist = 250;
            
            if (d < maxDist) {
              let intensity = map(d, 0, maxDist, 1, 0);
              intensity = pow(intensity * (0.4 + faceProximity * 0.3), 0.5);
              
              // Draw delicate lines with wave effect
              for (let k = 0; k < 2; k++) {
                let alpha = map(k, 0, 2, 60 * intensity, 0);
                stroke(255, 255, 255, alpha);
                strokeWeight(0.3 + (0.1 * (1-k)));
                
                // Subtle wave pattern
                beginShape();
                noFill();
                for (let t = 0; t <= 1; t += 0.03) {
                  let x = lerp(faceX, handX, t);
                  let y = lerp(faceY, handY, t);
                  
                  let time = frameCount * 0.05;
                  let wave1 = sin(t * PI * 4 + time) * intensity * 1.5;
                  let wave2 = cos(t * PI * 6 + time * 0.7) * intensity;
                  
                  vertex(x + wave1, y + wave2);
                }
                endShape();
              }
              
              // Subtle particles
              if (random() < 0.04 * intensity) {
                let t = random();
                let x = lerp(faceX, handX, t);
                let y = lerp(faceY, handY, t);
                noStroke();
                fill(255, 40 * intensity);
                circle(x + random(-0.5, 0.5), y + random(-0.5, 0.5), 0.5);
              }
            }
          }
        }
      }
      
      // Create subtle network between key facial points
      const networkPoints = [33, 133, 362, 263, 61, 291, 4, 168, 397, 10, 152, 70, 336];
      for (let i = 0; i < networkPoints.length; i++) {
        for (let j = i + 1; j < networkPoints.length; j++) {
          if (!faceLandmarks[networkPoints[i]] || !faceLandmarks[networkPoints[j]]) continue;
          
          let x1 = map(faceLandmarks[networkPoints[i]].x, 1, 0, 0, capture.scaledWidth);
          let y1 = map(faceLandmarks[networkPoints[i]].y, 0, 1, 0, capture.scaledHeight);
          let x2 = map(faceLandmarks[networkPoints[j]].x, 1, 0, 0, capture.scaledWidth);
          let y2 = map(faceLandmarks[networkPoints[j]].y, 0, 1, 0, capture.scaledHeight);
          
          let d = dist(x1, y1, x2, y2);
          let maxDist = 120;
          
          if (d < maxDist) {
            let intensity = map(d, 0, maxDist, 1, 0);
            intensity = pow(intensity, 1.5);
            
            // Draw delicate lines
            for (let k = 0; k < 1; k++) {
              let alpha = map(k, 0, 1, 30 * intensity, 0);
              stroke(255, 255, 255, alpha);
              strokeWeight(0.2);
              
              beginShape();
              noFill();
              for (let t = 0; t <= 1; t += 0.05) {
                let x = lerp(x1, x2, t);
                let y = lerp(y1, y2, t);
                
                let time = frameCount * 0.02;
                let wave = sin(t * PI * 2 + time) * intensity * 0.5;
                
                vertex(x + wave, y + wave);
              }
              endShape();
            }
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

    // Draw finger tip points with glow
    // fingerTips already declared above
    for (let hand of [leftHand, rightHand]) {
      if (!hand) continue;
      
      for (let tipIndex of fingerTips) {
        let tipX = map(hand[tipIndex].x, 1, 0, 0, capture.scaledWidth);
        let tipY = map(hand[tipIndex].y, 0, 1, 0, capture.scaledHeight);
        
        // Bright core
        noStroke();
        fill(255, 255, 255, 200);
        circle(tipX, tipY, 3);
        
        // Glow effect
        for (let size = 15; size > 0; size -= 3) {
          fill(255, 255, 255, map(size, 15, 0, 0, 100));
          circle(tipX, tipY, size);
        }
      }
    }

    // After drawing finger tip points, before resetting blend mode
    
    // Draw lines between finger tips
    strokeWeight(0.5); // Much thinner lines
    
    // Connect finger tips with complex glowing lines
    for (let hand of [leftHand, rightHand]) {
      if (!hand) continue;
      
      for (let i = 0; i < fingerTips.length; i++) {
        for (let j = i + 1; j < fingerTips.length; j++) {
          let x1 = map(hand[fingerTips[i]].x, 1, 0, 0, capture.scaledWidth);
          let y1 = map(hand[fingerTips[i]].y, 0, 1, 0, capture.scaledHeight);
          let x2 = map(hand[fingerTips[j]].x, 1, 0, 0, capture.scaledWidth);
          let y2 = map(hand[fingerTips[j]].y, 0, 1, 0, capture.scaledHeight);
          
          let d = dist(x1, y1, x2, y2);
          let maxDist = 200;
          
          if (d < maxDist) {
            let intensity = map(d, 0, maxDist, 1, 0);
            
            // Create multiple layered complex lines
            for (let k = 0; k < 4; k++) {
              let alpha = map(k, 0, 4, 100 * intensity, 0);
              stroke(255, 255, 255, alpha);
              strokeWeight(0.3 + (0.2 * (3-k)));
              
              // Draw multiple overlapping waves
              for (let offset = -1; offset <= 1; offset += 0.5) {
                beginShape();
                noFill();
                for (let t = 0; t <= 1; t += 0.02) {
                  let x = lerp(x1, x2, t);
                  let y = lerp(y1, y2, t);
                  
                  // Complex wave pattern
                  let wave1 = sin(t * PI * 3 + frameCount * 0.1) * 2 * intensity;
                  let wave2 = cos(t * PI * 5 + frameCount * 0.08) * 1.5 * intensity;
                  let wave3 = sin(t * PI * 7 + frameCount * 0.15) * intensity;
                  
                  vertex(x + wave1 + wave2 + wave3 + offset, 
                        y + wave2 + wave3 + offset);
                }
                endShape();
              }
            }
          }
        }
      }
    }
    
    // Connect corresponding finger tips between hands with complex patterns
    if (leftHand && rightHand) {
      for (let tipIndex of fingerTips) {
        let x1 = map(leftHand[tipIndex].x, 1, 0, 0, capture.scaledWidth);
        let y1 = map(leftHand[tipIndex].y, 0, 1, 0, capture.scaledHeight);
        let x2 = map(rightHand[tipIndex].x, 1, 0, 0, capture.scaledWidth);
        let y2 = map(rightHand[tipIndex].y, 0, 1, 0, capture.scaledHeight);
        
        let d = dist(x1, y1, x2, y2);
        let maxDist = 250;
        
        if (d < maxDist) {
          let intensity = map(d, 0, maxDist, 1, 0);
          
          // Create multiple complex energy lines
          for (let k = 0; k < 5; k++) {
            let alpha = map(k, 0, 5, 150 * intensity, 0);
            stroke(255, 255, 255, alpha);
            strokeWeight(0.4 + (0.15 * (4-k)));
            
            // Multiple interweaving paths
            for (let pathOffset = -2; pathOffset <= 2; pathOffset += 1) {
              beginShape();
              noFill();
              for (let t = 0; t <= 1; t += 0.02) {
                let x = lerp(x1, x2, t);
                let y = lerp(y1, y2, t);
                
                // Complex wave patterns
                let time = frameCount * 0.1;
                let wave1 = sin(t * PI * 4 + time) * 3 * intensity;
                let wave2 = cos(t * PI * 6 + time * 0.7) * 2 * intensity;
                let wave3 = sin(t * PI * 8 + time * 1.2) * intensity;
                let wave4 = cos(t * PI * 3 + time * 0.5) * 4 * intensity;
                
                // Add spiral effect
                let spiral = sin(t * PI * 2) * pathOffset * intensity;
                
                vertex(
                  x + wave1 + wave2 + wave3 + spiral, 
                  y + wave2 + wave3 + wave4 + spiral
                );
              }
              endShape();
            }
          }
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
    
    // Sound generation based on movement
    if (soundInitialized && soundActive) {
      const currentTime = Tone.now();
      
      // Track hand movements
      let leftHandVelocity = 0;
      let rightHandVelocity = 0;
      
      // Calculate left hand movement
      if (leftHand && leftHand[8]) {
        let currentLeft = createVector(
          map(leftHand[8].x, 1, 0, 0, capture.scaledWidth),
          map(leftHand[8].y, 0, 1, 0, capture.scaledHeight)
        );
        
        if (lastHandPositions[0]) {
          leftHandVelocity = currentLeft.dist(lastHandPositions[0]);
        }
        lastHandPositions[0] = currentLeft;
      }
      
      // Calculate right hand movement
      if (rightHand && rightHand[8]) {
        let currentRight = createVector(
          map(rightHand[8].x, 1, 0, 0, capture.scaledWidth),
          map(rightHand[8].y, 0, 1, 0, capture.scaledHeight)
        );
        
        if (lastHandPositions[1]) {
          rightHandVelocity = currentRight.dist(lastHandPositions[1]);
        }
        lastHandPositions[1] = currentRight;
      }
      
      // Update drone every few seconds
      if (currentTime - lastDroneTime >= droneInterval) {
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
          
          // Trigger drone with very low velocity for subtle effect
          droneSynth.triggerAttack(droneChord, currentTime, 0.1);
          lastDroneTime = currentTime;
        } catch (error) {
          console.error("Drone trigger error:", error);
        }
      }
      
      // Modify existing triggers for more ambient quality
      if (leftHandVelocity > 15 && 
          currentTime - lastTriggerTimes.synth >= minTriggerIntervals.synth) {
        try {
          let note = Math.floor(map(leftHand[8].y, 0, 1, 60, 72));
          synth.triggerAttackRelease(Tone.Frequency(note, "midi"), "2n", undefined, 0.3);
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
          // Increased velocity from 0.4 to 0.7 for louder sound
          bassline.triggerAttackRelease(Tone.Frequency(bassNote, "midi"), "1n", undefined, 0.7);
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
          hihat.triggerAttackRelease("16n", undefined, velocity);
          lastTriggerTimes.hihat = currentTime;
        } catch (error) {
          console.error("Hi-hat trigger error:", error);
        }
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
    
    // Create effects with longer decay
    reverb = new Tone.Reverb({
      decay: 4,
      wet: 0.4
    }).toDestination();
    
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
    }
  }
}

