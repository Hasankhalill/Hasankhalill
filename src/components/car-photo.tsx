import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { readCarPhoto, saveCarPhoto } from "@/data/car-photo-store";
import { useLocale } from "@/lib/locale";
import { colors } from "@/theme";

function decodeBase64(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function choosePhoto(carId: string): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.72,
    base64: true,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const bytes = asset.base64
    ? decodeBase64(asset.base64)
    : new Uint8Array(await (await fetch(asset.uri)).arrayBuffer());
  return saveCarPhoto(carId, bytes, asset.mimeType || "image/jpeg");
}

export function CarPhoto({
  carId,
  name,
  variant = "banner",
}: {
  carId: string;
  name: string;
  variant?: "banner" | "thumb";
}) {
  const { t } = useLocale();
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let live = true;
    void readCarPhoto(carId).then((next) => {
      if (live) setUri(next);
    });
    return () => {
      live = false;
    };
  }, [carId, revision]);

  async function onPick() {
    setBusy(true);
    try {
      const next = await choosePhoto(carId);
      if (next) {
        setUri(next);
        setRevision((value) => value + 1);
      }
    } finally {
      setBusy(false);
    }
  }

  if (variant === "thumb") {
    return uri ? (
      <Image source={{ uri }} style={styles.thumb} contentFit="cover" accessibilityLabel={name} />
    ) : (
      <View style={styles.thumbFallback}>
        <Text style={styles.thumbLetter}>{name.slice(0, 1)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} contentFit="cover" accessibilityLabel={name} />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.letter}>{name.slice(0, 1)}</Text>
          <Text style={styles.fallbackName}>{name}</Text>
        </View>
      )}
      <Pressable accessibilityRole="button" onPress={() => void onPick()} style={styles.chip} disabled={busy}>
        <Text style={styles.chipText}>{busy ? t("saving") : uri ? t("changePicture") : t("addPicture")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { height: 188, backgroundColor: colors.photo, borderRadius: 16, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  letter: { color: colors.gold, fontSize: 54, fontWeight: "800", lineHeight: 60 },
  fallbackName: { color: colors.onPhoto, fontSize: 15, fontWeight: "700" },
  chip: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(16, 33, 28, 0.88)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { color: colors.onPhoto, fontWeight: "800", fontSize: 14 },
  thumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: colors.photo },
  thumbFallback: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.photo,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbLetter: { color: colors.gold, fontSize: 20, fontWeight: "800" },
});
