import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { Banner, Button, Hint, Screen, TextField } from "@/components/ui";
import { conditionActionLabel, conditionPhaseTitle, isConditionPhase } from "@/domain/condition";
import { useFleet } from "@/lib/fleet";
import { colors } from "@/theme";

export function ConditionCaptureScreen({ rentalId, phase }: { rentalId: string; phase: string }) {
  if (!isConditionPhase(phase)) {
    return (
      <Screen>
        <Hint>That condition step is not available.</Hint>
      </Screen>
    );
  }
  return <Capture rentalId={rentalId} phase={phase} />;
}

function Capture({ rentalId, phase }: { rentalId: string; phase: "before_pickup" | "after_return" }) {
  const { fleet, conditionVideos, saveConditionVideo } = useFleet();
  const rental = fleet.rentals.find((item) => item.id === rentalId);
  const car = fleet.cars.find((item) => item.id === rental?.carId);
  const existing = conditionVideos.find((video) => video.rentalId === rentalId && video.phase === phase);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [clipUri, setClipUri] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  useEffect(() => {
    if (existing?.notes && !notes) setNotes(existing.notes);
  }, [existing?.notes, notes]);

  if (!rental || !car) {
    return (
      <Screen>
        <Hint>That rental is not on this phone.</Hint>
      </Screen>
    );
  }

  async function onSave() {
    if (!clipUri && !existing) {
      setError("Record a video or choose one from the gallery.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveConditionVideo({ rentalId, phase, notes, sourceUri: clipUri });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the video.");
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: conditionActionLabel(phase) }} />
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Hint>
        {car.name} · plate {car.licensePlate}. {conditionPhaseTitle(phase)}. Optional notes for damage you already see, or damage you just noticed.
      </Hint>
      <TextField
        label="Damage notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder={phase === "before_pickup" ? "Existing scratch, dent, stain…" : "New scratch, dent, stain…"}
      />
      {cameraOn ? (
        <Recorder
          recording={recording}
          onRecording={setRecording}
          onRecorded={(uri) => {
            setClipUri(uri);
            setCameraOn(false);
            setRecording(false);
          }}
          onClose={() => {
            setCameraOn(false);
            setRecording(false);
          }}
        />
      ) : (
        <>
          <Button label="Record video" onPress={() => setCameraOn(true)} />
          <Button label="Choose from gallery" variant="secondary" onPress={() => void pickGallery(setClipUri, setError)} />
        </>
      )}
      {clipUri ? <Hint>Video ready. It will be copied onto this phone when you save.</Hint> : null}
      <Button
        label={saving ? "Saving on this phone…" : "Save condition video"}
        onPress={() => void onSave()}
        disabled={saving}
      />
    </Screen>
  );
}

async function pickGallery(onUri: (uri: string) => void, onError: (message: string) => void) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted && permission.canAskAgain === false) {
    onError("Allow photo library access to choose a condition video.");
    return;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"],
    videoMaxDuration: 180,
  });
  if (result.canceled || !result.assets[0]) return;
  onUri(result.assets[0].uri);
}

function Recorder({
  recording,
  onRecording,
  onRecorded,
  onClose,
}: {
  recording: boolean;
  onRecording: (value: boolean) => void;
  onRecorded: (uri: string) => void;
  onClose: () => void;
}) {
  if (Platform.OS === "web") {
    return <WebRecorder recording={recording} onRecording={onRecording} onRecorded={onRecorded} onClose={onClose} />;
  }
  return <NativeRecorder recording={recording} onRecording={onRecording} onRecorded={onRecorded} onClose={onClose} />;
}

function NativeRecorder({
  recording,
  onRecording,
  onRecorded,
  onClose,
}: {
  recording: boolean;
  onRecording: (value: boolean) => void;
  onRecorded: (uri: string) => void;
  onClose: () => void;
}) {
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCamera] = useCameraPermissions();
  const [micPermission, requestMic] = useMicrophonePermissions();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void requestCamera();
    void requestMic();
  }, [requestCamera, requestMic]);

  function start() {
    onRecording(true);
    void cameraRef.current
      ?.recordAsync({ maxDuration: 180 })
      .then((result) => {
        onRecording(false);
        if (result?.uri) onRecorded(result.uri);
      })
      .catch(() => onRecording(false));
  }

  if (!cameraPermission?.granted || !micPermission?.granted) {
    return (
      <View style={styles.block}>
        <Hint>Jazzar needs the camera and microphone to record the car.</Hint>
        <Button
          label="Allow camera"
          onPress={() => {
            void requestCamera();
            void requestMic();
          }}
        />
        <Button label="Cancel" variant="secondary" onPress={onClose} />
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <CameraView ref={cameraRef} mode="video" facing="back" style={styles.camera} onCameraReady={() => setReady(true)} />
      <Button
        label={recording ? "Stop recording" : "Start recording"}
        onPress={() => {
          if (!ready) return;
          if (recording) cameraRef.current?.stopRecording();
          else start();
        }}
        disabled={!ready}
      />
      {recording ? null : <Button label="Cancel" variant="secondary" onPress={onClose} />}
    </View>
  );
}

function WebRecorder({
  recording,
  onRecording,
  onRecorded,
  onClose,
}: {
  recording: boolean;
  onRecording: (value: boolean) => void;
  onRecorded: (uri: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    const current = stream;
    return () => {
      current?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  async function start() {
    try {
      const next = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(next);
      const mime = MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "video/mp4";
      const recorder = new MediaRecorder(next, { mimeType: mime });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mime });
        onRecorded(URL.createObjectURL(blob));
        next.getTracks().forEach((track) => track.stop());
      };
      recorderRef.current = recorder;
      recorder.start();
      onRecording(true);
      window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 180_000);
    } catch {
      setMessage("The camera is not available. Choose a video from the gallery instead.");
      onRecording(false);
    }
  }

  return (
    <View style={styles.block}>
      {message ? <Hint>{message}</Hint> : null}
      {Platform.OS === "web"
        ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ width: "100%", height: 240, backgroundColor: "#1C1915", borderRadius: 12 }}
          />
        )
        : null}
      <Button
        label={recording ? "Stop recording" : "Start recording"}
        onPress={() => {
          if (recording) recorderRef.current?.stop();
          else void start();
        }}
      />
      {recording ? null : <Button label="Cancel" variant="secondary" onPress={onClose} />}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 12 },
  camera: { width: "100%", height: 320, borderRadius: 12, overflow: "hidden", backgroundColor: colors.ink },
});
