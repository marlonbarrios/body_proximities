# Body Proximities
## Gestural Augmentation of Subjective Intimacy

An interactive art piece that creates visual connections between hands, body, and face, generating ambient sounds based on proximity and movement. Built with p5.js, MediaPipe, and Tone.js.

🎮 [Try the Live App](https://marlonbarrios.github.io/body_proximities/)

<img width="898" alt="Screenshot 2025-03-09 at 1 40 45 PM" src="https://github.com/user-attachments/assets/bda3d171-bca3-4daa-a5a6-bbc6ff09a77d" />

🎥 [Watch the Video](https://youtu.be/1-0gC-jJMHA)

## Overview

This project creates a real-time interactive experience where:
- Hand movements, body pose, and facial features are tracked simultaneously
- Visual connections are drawn between hands and body parts (chest, hips, ankles)
- Visual connections are drawn between hands and face points (eyes, mouth, nose)
- Proximity to body and face generates ambient sounds and music
- Everything responds fluidly to user interaction

## Visual Elements

### Body Pose Tracking
- Tracks key body reference points: chest (midpoint of shoulders), hip center (midpoint of hips), and ankles
- Chest calculated from shoulder landmarks (left: 11, right: 12)
- Hip center calculated from hip landmarks (left: 23, right: 24)
- Ankles tracked individually (left: 27, right: 28)

### Face Tracking
- Tracks facial features including eyes, mouth, nose, and face outline
- Subtle network connections between key facial points
- Delicate animated lines with wave patterns
- Soft particle effects at intersections

### Hand Connections
- Glowing points at finger tips
- Complex wave patterns between finger tips
- Lines become more intense when fingers are closer
- Interweaving paths with animated waves
- Particle effects along the connections

### Hand-to-Body Connections
- Dynamic lines connect body parts (chest, hips, ankles) to hands
- Connection intensity based on proximity
- Complex wave patterns that respond to movement
- Intensity increases as hands approach body parts
- Multiple layers of visual effects based on proximity duration

### Hand-to-Face Connections
- Dynamic lines connect facial points (eyes, mouth, nose, outline) to finger tips and wrists
- Connection intensity based on proximity
- Complex wave patterns that respond to movement
- Subtle particle systems along connections

## Sound Generation

### Drone Synth
- Base drone chord changes based on left hand height
- Creates ambient foundation
- Changes every 4 seconds
- Uses sine waves for smooth texture

### Main Synth (Left Hand)
- Triggered by left hand movement
- Pitch determined by vertical position
- Higher notes when hand is up
- Lower notes when hand is down
- Uses triangle waves for clarity

### Body & Face Proximity Interaction
- Proximity to body parts (chest, hips, ankles) triggers visual and sonic responses
- Proximity to face points (eyes, mouth, nose) opens additional interaction layers
- Combined proximity calculation blends body and face interactions
- Real-time mapping of proximity to sound:
  ```javascript
  // Body proximity to sound mapping
  const bodyProximity = map(minDistanceToBody, 0, maxProximityDist, 1, 0);
  const overallProximity = (bodyProximity + faceProximity) / 2;
  const bassNote = map(proximityDuration, 0.3, 1.0, 36, 48);
  ```
- Intensity levels:
  1. Far from body/face (>400px): Minimal effects
  2. Moderate proximity (200-400px): Subtle connections and sounds
  3. Close proximity (<200px): Maximum visual intensity and deeper bass tones

### Bass Synth (Proximity-Driven)
- Triggered by proximity to body parts (chest, hips, ankles) or face
- Combines both body and face proximity for richer interaction
- Note pitch and intensity increase with proximity duration
- Creates immersive sonic feedback for body awareness

### Hi-hat (Overall Movement)
- Rhythmic element based on hand movement
- Velocity controlled by movement speed
- Uses pink noise for softer texture
- Plays at regular intervals

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
- **PoseLandmarker**: Tracks 33 body landmarks (chest, shoulders, hips, ankles, etc.)
- **FaceLandmarker**: Tracks 468 facial landmarks (eyes, mouth, nose, face outline)
- All landmarkers run simultaneously for multi-modal tracking

### Proximity Calculation
- Calculates minimum distance from hand finger tips to body reference points
- Calculates minimum distance from hands to face points
- Blends body and face proximity for unified interaction
- Smooth interpolation of proximity values over time

## Performance & License

**Body Proximities** extends the original **Instrumental Proximities** concept, expanding interactions to include full body awareness alongside facial gestures.

### MIT License
**Copyright (c) 2024 Marlon Barrios Solano**

Permission is hereby granted, free of charge, to any person obtaining a copy of this software, to use, copy, modify, and distribute the software under the following conditions:

- **Attribution Required**: If used in a performance, installation, or public presentation, credit must be given to **Marlon Barrios Solano** for concept and programming.
- **License Inclusion**: This license must be included in all copies or substantial portions of the software.
- **No Warranty**: The software is provided "as is" without warranty of any kind.
