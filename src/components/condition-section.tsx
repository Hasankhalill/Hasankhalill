import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

import { Button, Card, Hint } from "@/components/ui";
import { type BackupStatus, type ConditionPhase, type ConditionVideo } from "@/domain/condition";
import { formatDateTime } from "@/domain/format";
import type { CopyKey } from "@/i18n/copy";
import { useFleet } from "@/lib/fleet";
import { useLocale } from "@/lib/locale";
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
  const { t } = useLocale();
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
      <Text style={styles.title}>{t(phaseKey(phase))}</Text>
      {video ? (
        <>
          {uri ? (
            <ClipPlayer uri={uri} label={`${t(phaseKey(phase))} ${video.licensePlate}`} />
          ) : (
            <Hint>{t("openingVideo")}</Hint>
          )}
          <Hint>{t("plate")} {video.licensePlate}</Hint>
          <Hint>{t("added")} {formatDateTime(video.recordedAt)}</Hint>
          <Hint>{video.notes ? `${t("damageNotes")}: ${video.notes}` : t("noDamageNotes")}</Hint>
          <Text
            style={[
              styles.status,
              video.backupStatus === "upload_failed" && styles.failed,
              video.backupStatus === "backed_up" && styles.good,
            ]}
          >
            {t(statusKey(video.backupStatus))}
          </Text>
          {video.lastError ? <Hint>{video.lastError}</Hint> : null}
          {!readOnly && video.backupStatus === "upload_failed" ? (
            <Button
              label={retrying ? t("retrying") : t("retryUpload")}
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
        <Hint>{t("noVideoYet")}</Hint>
      )}
      {readOnly ? null : (
        <Button
          label={phase === "before_pickup" ? t("recordBefore") : t("recordAfter")}
          variant={video ? "secondary" : "primary"}
          onPress={() => router.push(paths.recordCondition(rentalId, phase))}
        />
      )}
    </Card>
  );
}

export function ConditionSection({ rentalId }: { rentalId: string }) {
  const { t } = useLocale();
  const { conditionVideos } = useFleet();
  const before = conditionVideos.find((video) => video.rentalId === rentalId && video.phase === "before_pickup") ?? null;
  const after = conditionVideos.find((video) => video.rentalId === rentalId && video.phase === "after_return") ?? null;

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{t("vehicleCondition")}</Text>
      <Hint>{t("conditionHint")}</Hint>
      <ConditionCard rentalId={rentalId} phase="before_pickup" video={before} />
      <ConditionCard rentalId={rentalId} phase="after_return" video={after} />
    </View>
  );
}

const phaseKeys: Record<ConditionPhase, CopyKey> = {
  before_pickup: "beforePickup",
  after_return: "afterReturn",
};

const statusKeys: Record<BackupStatus, CopyKey> = {
  saved_on_phone: "savedOnPhone",
  uploading: "uploading",
  backed_up: "backedUp",
  upload_failed: "uploadFailed",
};

function phaseKey(phase: ConditionPhase): CopyKey {
  return phaseKeys[phase];
}

function statusKey(status: BackupStatus): CopyKey {
  return statusKeys[status];
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
