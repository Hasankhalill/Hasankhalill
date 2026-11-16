import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

import { Button, Card, Hint } from "@/components/ui";
import {
  backupStatusLabel,
  conditionActionLabel,
  conditionPhaseTitle,
  type ConditionPhase,
  type ConditionVideo,
} from "@/domain/condition";
import { formatDateTime } from "@/domain/format";
import { useFleet } from "@/lib/fleet";
import { colors, space } from "@/theme";

function ClipPlayer({ uri, label }: { uri: string; label: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });
  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      accessibilityLabel={label}
      style={styles.video}
    />
  );
}

function ConditionCard({
  rentalId,
  phase,
  video,
}: {
  rentalId: string;
  phase: ConditionPhase;
  video: ConditionVideo | null;
}) {
  const { paths, readOnly, retryConditionUpload, playbackUri } = useFleet();
  const [uri, setUri] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let active = true;
    if (!video) {
      setUri(null);
      return;
    }
    void playbackUri(video.id).then((next) => {
      if (active) setUri(next);
    });
    return () => {
      active = false;
    };
  }, [playbackUri, video]);

  return (
    <Card>
      <Text style={styles.title}>{conditionPhaseTitle(phase)}</Text>
      {video ? (
        <>
          {uri ? (
            <ClipPlayer uri={uri} label={`${conditionPhaseTitle(phase)} video, plate ${video.licensePlate}`} />
          ) : (
            <Hint>Opening the saved video…</Hint>
          )}
          <Hint>Plate {video.licensePlate}</Hint>
          <Hint>Added {formatDateTime(video.recordedAt)}</Hint>
          <Hint>{video.notes ? `Damage notes: ${video.notes}` : "No damage notes."}</Hint>
          <Text
            style={[
              styles.status,
              video.backupStatus === "upload_failed" && styles.failed,
              video.backupStatus === "backed_up" && styles.good,
            ]}
          >
            {backupStatusLabel(video.backupStatus)}
          </Text>
          {video.lastError ? <Hint>{video.lastError}</Hint> : null}
          {!readOnly && video.backupStatus === "upload_failed" ? (
            <Button
              label={retrying ? "Retrying…" : "Retry upload"}
              variant="secondary"
              disabled={retrying}
              onPress={() => {
                setRetrying(true);
                void retryConditionUpload(video.id).finally(() => setRetrying(false));
              }}
            />
          ) : null}
        </>
      ) : (
        <Hint>No {conditionPhaseTitle(phase).toLowerCase()} video yet.</Hint>
      )}
      {readOnly ? null : (
        <Button
          label={conditionActionLabel(phase)}
          variant={video ? "secondary" : "primary"}
          onPress={() => router.push(paths.recordCondition(rentalId, phase))}
        />
      )}
    </Card>
  );
}

export function ConditionSection({ rentalId }: { rentalId: string }) {
  const { conditionVideos } = useFleet();
  const before = conditionVideos.find((video) => video.rentalId === rentalId && video.phase === "before_pickup") ?? null;
  const after = conditionVideos.find((video) => video.rentalId === rentalId && video.phase === "after_return") ?? null;

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Vehicle condition</Text>
      <Hint>Record the car before pickup and after return. Both clips stay on this phone and play with no internet.</Hint>
      <ConditionCard rentalId={rentalId} phase="before_pickup" video={before} />
      <ConditionCard rentalId={rentalId} phase="after_return" video={after} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md },
  heading: { color: colors.ink, fontSize: 18, fontWeight: "800", marginTop: space.sm },
  title: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  status: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  failed: { color: colors.danger },
  good: { color: colors.brand },
  video: { width: "100%", height: 220, borderRadius: 12, backgroundColor: "#1C1915" },
});
