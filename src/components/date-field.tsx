import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CalendarModal } from "@/components/calendar-modal";
import { currentMonth, isIsoDate } from "@/domain/dates";
import { formatDate } from "@/domain/format";
import { colors } from "@/theme";

export function DateField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value && isIsoDate(value) ? value.slice(0, 7) : currentMonth());

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value || "not set"}`}
        onPress={() => {
          setMonth(value && isIsoDate(value) ? value.slice(0, 7) : currentMonth());
          setOpen(true);
        }}
        style={styles.input}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value && isIsoDate(value) ? formatDate(value) : "Choose a date"}
        </Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <CalendarModal
        visible={open}
        value={value}
        month={month}
        onMonth={setMonth}
        onClose={() => setOpen(false)}
        onSelect={(iso) => {
          onChange(iso);
          setOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  input: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  value: { fontSize: 17, color: colors.ink },
  placeholder: { color: colors.muted },
  error: { color: colors.danger, fontSize: 14 },
});
