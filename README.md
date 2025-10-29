# Instrumental Proximities
## Gestural Augmentation of Subjective Intimacy

An interactive art piece that creates visual connections between hands and face, generating ambient sounds based on movement. Built with p5.js, MediaPipe, and Tone.js.

🎮 [Try the Live App](https://marlonbarrios.github.io/instrumentalproximities/)

<img width="898" alt="Screenshot 2025-03-09 at 1 40 45 PM" src="https://github.com/user-attachments/assets/bda3d171-bca3-4daa-a5a6-bbc6ff09a77d" />

🎥 [Watch the Video](https://youtu.be/1-0gC-jJMHA)

## Overview

This project creates a real-time interactive experience where:
- Facial features and hand movements are tracked
- Visual connections are drawn between different points
- Movement generates ambient sounds and music
- Everything responds fluidly to user interaction

## Visual Elements



### Face Network
- Subtle connections between key facial points
- Points include: eyes, mouth corners, nose, cheeks, and forehead
- Delicate animated lines with wave patterns
- Intensity changes based on distance between points
- Soft particle effects at intersections

### Hand Connections
- Glowing points at finger tips
- Complex wave patterns between finger tips
- Lines become more intense when fingers are closer
- Interweaving paths with animated waves
- Particle effects along the connections

### Hand-to-Face Connections
- Dynamic lines connect facial points to finger tips
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

### Mouth Interaction (Enhanced)
- Opening triggers bright glowing points around mouth contour
- Wider opening creates expanding ripple effects
- Mouth corners emit particle streams when open
- Intensity of glow directly maps to sound volume
- Creates visual feedback for vocal cavity size

### Bass Synth (Mouth-Driven)
- Dramatic visual and sonic response to mouth opening
- Real-time mapping of mouth shape to sound:
  ```javascript
  // Mouth shape to sound mapping
  const mouthOpenness = lowerLipY - upperLipY;
  const bassNote = map(mouthOpenness, 0.05, 0.2, 36, 48);
  const intensity = map(mouthOpenness, 0.05, 0.2, 0.2, 1.0);
  ```
- Three levels of interaction:
  1. Slight opening (0.05): Subtle bass tones, gentle glow
  2. Medium opening (0.1): Stronger resonance, pulsing light
  3. Wide opening (0.2): Deep bass, maximum visual intensity

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

3. **Bass Synth (Mouth Control)**
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

## Performance & License

**Instrumental Proximities** is used in the lecture performance **Duets in Latent Space**.

### MIT License
**Copyright (c) 2024 Marlon Barrios Solano**

Permission is hereby granted, free of charge, to any person obtaining a copy of this software, to use, copy, modify, and distribute the software under the following conditions:

- **Attribution Required**: If used in a performance, installation, or public presentation, credit must be given to **Marlon Barrios Solano** for concept and programming.
- **License Inclusion**: This license must be included in all copies or substantial portions of the software.
- **No Warranty**: The software is provided "as is" without warranty of any kind.
