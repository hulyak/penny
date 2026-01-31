import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const ELEVEN_LABS_API_KEY = process.env.EXPO_PUBLIC_ELEVEN_LABS_API_KEY;
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel - Calm, American, Female

export async function playTextToSpeech(text: string): Promise<void> {
  if (!ELEVEN_LABS_API_KEY) {
    console.warn('[ElevenLabs] API Key is missing');
    return;
  }

  try {
    console.log('[ElevenLabs] Requesting speech...');
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVEN_LABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
    }

    const blob = await response.blob();

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
          const base64Data = (reader.result as string).split(',')[1];
          const uri = FileSystem.cacheDirectory + `speech-${Date.now()}.mp3`;
          
          await FileSystem.writeAsStringAsync(uri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });

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
          
          sound.setOnPlaybackStatusUpdate(async (status) => {
            if (status.isLoaded && status.didJustFinish) {
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

  } catch (error) {
    console.error('[ElevenLabs] TTS Error:', error);
    throw error;
  }
}
