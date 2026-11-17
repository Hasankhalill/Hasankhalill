import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useLocale } from "@/lib/locale";
import { colors } from "@/theme";

export function LanguageSwitch() {
  const { locale, setLocale } = useLocale();
  const track = (
    <View style={styles.track}>
      <Choice label="EN" selected={locale === "en"} onPress={() => setLocale("en")} />
      <Choice label="عربي" selected={locale === "ar"} onPress={() => setLocale("ar")} />
    </View>
  );
  if (Platform.OS === "web") {
    return (
      <div dir="ltr" style={{ display: "flex" }}>
        {track}
      </div>
    );
  }
  return track;
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.selected]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: "#F8EDE6",
    borderRadius: 999,
    padding: 3,
    gap: 2,
  },
  choice: {
    minWidth: 52,
    minHeight: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  selected: { backgroundColor: colors.brand },
  label: { color: colors.brand, fontWeight: "800", fontSize: 14 },
  selectedLabel: { color: colors.white },
});
