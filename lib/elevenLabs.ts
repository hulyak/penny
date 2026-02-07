import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const ELEVEN_LABS_API_KEY = process.env.EXPO_PUBLIC_ELEVEN_LABS_API_KEY;
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel - Calm, American, Female

// Track current sound and fetch for stop functionality
let currentSound: Audio.Sound | null = null;
let currentAbortController: AbortController | null = null;

export async function stopTextToSpeech(): Promise<void> {
  // Abort any in-progress fetch
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }

  if (currentSound) {
    const sound = currentSound;
    currentSound = null;
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
    } catch (e) {
      // Force unload even if stop fails
      try {
        await sound.unloadAsync();
      } catch (_) {}
      console.warn('[ElevenLabs] Error stopping audio:', e);
    }
  }
}

export async function playTextToSpeech(text: string): Promise<void> {
  if (!ELEVEN_LABS_API_KEY) {
    console.warn('[ElevenLabs] API Key is missing');
    throw new Error('ElevenLabs API key not configured');
  }

  // Stop any existing playback first
  await stopTextToSpeech();

  const abortController = new AbortController();
  currentAbortController = abortController;

  try {
    console.log('[ElevenLabs] Requesting speech...');
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?optimize_streaming_latency=3`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVEN_LABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
    }

    // Check if aborted during fetch
    if (abortController.signal.aborted) return;

    const blob = await response.blob();

    if (abortController.signal.aborted) return;

    if (Platform.OS === 'web') {
      const audio = new window.Audio(URL.createObjectURL(blob));
      return new Promise((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = (e) => reject(e);
        audio.play().catch(reject);
      });
    }

    // Native implementation
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          if (abortController.signal.aborted) {
            resolve();
            return;
          }

          const base64Data = (reader.result as string).split(',')[1];
          const uri = FileSystem.cacheDirectory + `speech-${Date.now()}.mp3`;

          await FileSystem.writeAsStringAsync(uri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });

          if (abortController.signal.aborted) {
            await FileSystem.deleteAsync(uri, { idempotent: true });
            resolve();
            return;
          }

          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });

          const { sound } = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: true }
          );

          // Track for stop functionality
          currentSound = sound;

          sound.setOnPlaybackStatusUpdate(async (status) => {
            if (status.isLoaded && status.didJustFinish) {
              currentSound = null;
              await sound.unloadAsync();
              await FileSystem.deleteAsync(uri, { idempotent: true });
            }
          });

          resolve();
        } catch (e) {
          console.error('[ElevenLabs] Error preparing audio:', e);
          reject(e);
        }
      };

      reader.onerror = (e) => {
        console.error('[ElevenLabs] FileReader error:', e);
        reject(e);
      };

      reader.readAsDataURL(blob);
    });

  } catch (error: any) {
    if (error?.name === 'AbortError') {
      console.log('[ElevenLabs] Speech request cancelled');
      return;
    }
    console.error('[ElevenLabs] TTS Error:', error);
    throw error;
  } finally {
    if (currentAbortController === abortController) {
      currentAbortController = null;
    }
  }
}
