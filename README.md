# Body Proximities
## Gestural Augmentation of Subjective Intimacy

An interactive art piece that creates visual connections between hands, body, and face, generating ambient sounds based on proximity and movement. Built with p5.js, MediaPipe, and Tone.js.

🎮 [Try the Live App](https://marlonbarrios.github.io/body_proximities/)

<img width="898" alt="Screenshot 2025-03-09 at 1 40 45 PM" src="https://github.com/user-attachments/assets/bda3d171-bca3-4daa-a5a6-bbc6ff09a77d" />

🎥 [Watch the Video](https://youtu.be/1-0gC-jJMHA)

## Overview

This project creates a real-time interactive experience where:
- Hand movements, body pose, and facial features are tracked simultaneously
- **Geometric visual connections** (straight lines) are drawn from the **body center** to fingertips
- Visual connections are drawn between hands and body parts, and hands to face points
- Proximity to body and face generates ambient sounds and music
- **Automatic volume fade** to silence after 5 seconds of no interaction
- Everything responds fluidly to user interaction

## Visual Elements

### Geometric Design
- **Clean geometric lines** - All connections use straight lines instead of waves
- **Body center as focal point** - Radial lines always extend from the body center
- **Simplified hand tracking** - Only fingertips (5 points per hand) for cleaner visualization
- **Varying line thickness** - Different thicknesses for different fingertips (thumb thickest, pinky thinnest)
- **Always visible center lines** - Lines from body center to fingertips are always visible with varying opacity

### Body Pose Tracking
- **Body center calculation** - Average of key body points (shoulders, hips, nose)
- Tracks all 33 pose landmarks (head, shoulders, elbows, wrists, hips, knees, ankles, feet)
- **Skeletal connections** - Geometric lines connect related body parts
- Key body points: shoulders (11, 12), hips (23, 24), ankles (27, 28)

### Face Tracking
- Tracks 100+ facial landmarks (eyes, mouth, nose, cheeks, jawline, eyebrows)
- **Geometric network** - Straight line connections between facial points
- Connections vary by face region (eyes, mouth, nose have different connection distances)

### Hand Connections
- **Fingertips only** - Simplified to 5 points per hand (thumb, index, middle, ring, pinky)
- **Geometric lines** between fingertips within each hand
- **Geometric lines** between corresponding fingertips across hands
- Lines use different thicknesses based on finger type

### Body Center to Hands
- **Always visible radial lines** from body center to all fingertips
- **Variable thickness**:
  - Thumb: 2.5 (thickest)
  - Index finger: 2.0
  - Pinky: 1.5
  - Other fingers: 1.8
- Thickness varies based on distance and proximity
- Opacity fades with distance but always visible (minimum 50)

### Hand-to-Body Connections
- Geometric straight lines connect fingertips to key body points (nose, shoulders, hips)
- Connection intensity based on proximity
- Different maximum distances for different body parts:
  - Head/face: 180px
  - Shoulders/arms: 250px
  - Hips: 280px

### Hand-to-Face Connections
- Geometric straight lines connect fingertips to facial points
- Different distances for different face regions:
  - Eye region: 200px
  - Mouth region: 220px
  - Nose region: 240px
  - Other regions: 260px

### Face-to-Body Connections
- Geometric lines connecting facial points to body points (head, shoulders)
- Creates unified network between face and body

## Sound Generation

### Automatic Volume Control
- **5-Second Fade Out**: Sound automatically fades to silence after 5 seconds of no interaction
- **No Interaction Detection**: Fades when:
  - No hand movement (velocity < 20 pixels)
  - No rapid proximity changes
  - No models detected (hands, body, or face outside frame)
- **Gradual Fade**: Smooth, progressive volume reduction (0.05 lerp rate)
- **Auto Resume**: Volume gradually returns when interaction is detected

### Drone Synth
- Base drone chord changes based on left hand height
- Creates ambient foundation
- Changes every 4 seconds
- Uses sine waves for smooth texture
- **Stops automatically** when volume fades to 0

### Main Synth (Left Hand)
- Triggered by left hand movement (velocity > 15)
- Pitch determined by vertical position
- Higher notes when hand is up (60-72 MIDI range)
- Lower notes when hand is down
- Uses triangle waves for clarity

### Body & Face Proximity Interaction
- Proximity to body center triggers visual and sonic responses
- Proximity to face points opens additional interaction layers
- Combined proximity calculation blends body and face interactions
- Real-time mapping of proximity to sound based on distance to body center
- Intensity levels based on proximity duration

### Bass Synth (Proximity-Driven)
- Triggered by proximity to body center (proximity > 0.3)
- Note pitch and intensity increase with proximity duration
- MIDI range: 36-48 (low bass notes)
- Creates immersive sonic feedback for body awareness

### Hi-hat (Overall Movement)
- Rhythmic element based on hand movement velocity
- Velocity controlled by movement speed
- Uses pink noise for softer texture
- Plays every 16 frames
- Only triggers if there's significant movement (> 5 pixels)

## Sound Generation Technical Details

### Audio Engine Architecture

#### Synthesis Chain
1. **Main Signal Path**
   - Synths → Delay → Reverb → Output
   - Individual volume control per synth
   - Parallel processing for multiple voices

2. **Effects Configuration**
   ```javascript
   reverb = new Tone.Reverb({
     decay: 4,
     wet: 0.4
   })
   
   delay = new Tone.FeedbackDelay({
     delayTime: "8n",
     feedback: 0.3,
     wet: 0.2
   })
   ```

### Synthesizer Specifications

1. **Drone Synth (Background Texture)**
   ```javascript
   droneSynth = new Tone.PolySynth(Tone.Synth, {
     oscillator: {
       type: "sine4"  // 4 detuned sine waves
     },
     envelope: {
       attack: 2,     // Slow fade in
       decay: 1,
       sustain: 1,    // Hold at full volume
       release: 4     // Long release tail
     }
   })
   ```
   - Uses 4-voice polyphony for chord generation
   - Chord structure: root, perfect 5th, octave, major 3rd
   - Updates every 4 seconds based on hand position

2. **Main Synth (Hand Movement)**
   ```javascript
   synth = new Tone.Synth({
     oscillator: {
       type: "triangle4"  // 4 detuned triangle waves
     },
     envelope: {
       attack: 0.1,
       decay: 0.3,
       sustain: 0.4,
       release: 1
     }
   })
   ```
   - Triggered by velocity threshold (>15)
   - Note duration: "2n" (half note)
   - Velocity scaling: 0.3 maximum

3. **Bass Synth (Proximity Control)**
   ```javascript
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
       baseFrequency: 100,
       octaves: 3,
       attack: 0.1,
       decay: 0.2,
       sustain: 0.4,
       release: 0.8
     }
   })
   ```
   - Monophonic for clean bass lines
   - Filter envelope for dynamic timbre
   - Note duration: "1n" (whole note)

## Technical Implementation

### MediaPipe Integration
- **HandLandmarker**: Tracks 21 points per hand (2 hands)
  - **Simplified usage**: Only fingertips (5 points) used for connections
- **PoseLandmarker**: Tracks all 33 body landmarks
  - **Body center**: Calculated from shoulders, hips, and nose
  - **Skeletal connections**: Geometric lines between related body parts
- **FaceLandmarker**: Tracks 468 facial landmarks
  - **Sampled usage**: 100+ key facial points for performance
- All landmarkers run simultaneously for multi-modal tracking

### Proximity Calculation
- **Body center based**: Calculates minimum distance from fingertips to body center
- Calculates minimum distance from fingertips to face points
- **Reduced complexity**: 50% fewer connections for better performance
- **Different distance thresholds**: Varies by connection type (hand-to-body, hand-to-face, etc.)
- Smooth interpolation of proximity values over time
- **Interaction detection**: Only counts significant movement (>20 pixels) or rapid proximity changes

### Performance Optimizations
- **Reduced line count**: 50% fewer connections (sampled points)
- **Simplified hand tracking**: Only fingertips, not all 21 points
- **Limited face network**: Strategic sampling of facial points
- **Key body points only**: Only connects to essential body landmarks
- **Geometric rendering**: Straight lines instead of complex wave calculations

## Controls

- **Spacebar**: Toggle sound on/off
- **Automatic**: Sound fades to silence after 5 seconds of no interaction
- **Automatic**: Sound fades when no models are detected

## Performance & License

**Body Proximities** extends the original **Instrumental Proximities** concept, expanding interactions to include full body awareness alongside facial gestures.

### MIT License
**Copyright (c) 2024 Marlon Barrios Solano**

Permission is hereby granted, free of charge, to any person obtaining a copy of this software, to use, copy, modify, and distribute the software under the following conditions:

- **Attribution Required**: If used in a performance, installation, or public presentation, credit must be given to **Marlon Barrios Solano** for concept and programming.
- **License Inclusion**: This license must be included in all copies or substantial portions of the software.
- **No Warranty**: The software is provided "as is" without warranty of any kind.
