import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { addDays, isIsoDate, shiftMonth } from "@/domain/dates";
import { formatMonth } from "@/domain/format";
import { colors, space } from "@/theme";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function cellsFor(month: string): { iso: string; inMonth: boolean }[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const pad = first.getUTCDay();
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells: { iso: string; inMonth: boolean }[] = [];
  const firstIso = `${month}-01`;
  for (let index = 0; index < pad; index += 1) {
    cells.push({ iso: addDays(firstIso, index - pad), inMonth: false });
  }
  for (let day = 1; day <= count; day += 1) {
    cells.push({
      iso: `${month}-${String(day).padStart(2, "0")}`,
      inMonth: true,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ iso: addDays(cells[cells.length - 1].iso, 1), inMonth: false });
  }
  return cells;
}

export function CalendarModal({
  visible,
  value,
  month,
  onMonth,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: string;
  month: string;
  onMonth: (month: string) => void;
  onSelect: (iso: string) => void;
  onClose: () => void;
}) {
  const cells = cellsFor(month);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close calendar" style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => onMonth(shiftMonth(month, -1))} style={styles.nav}>
            <Text style={styles.navText}>‹</Text>
          </Pressable>
          <Text style={styles.title}>{formatMonth(month)}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => onMonth(shiftMonth(month, 1))} style={styles.nav}>
            <Text style={styles.navText}>›</Text>
          </Pressable>
        </View>
        <View style={styles.week}>
          {WEEKDAYS.map((day, index) => (
            <Text key={`${day}-${index}`} style={styles.weekday}>
              {day}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((cell) => {
            const selected = cell.iso === value && isIsoDate(value);
            return (
              <Pressable
                key={cell.iso}
                accessibilityRole="button"
                accessibilityLabel={cell.iso}
                onPress={() => onSelect(cell.iso)}
                style={[styles.day, selected && styles.selected]}
              >
                <Text style={[styles.dayText, !cell.inMonth && styles.outside, selected && styles.selectedText]}>
                  {Number(cell.iso.slice(-2))}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(28, 25, 21, 0.35)" },
  sheet: {
    backgroundColor: colors.card,
    padding: space.lg,
    paddingBottom: 28,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 18, fontWeight: "800", color: colors.ink },
  nav: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  navText: { fontSize: 28, color: colors.brand, fontWeight: "700" },
  week: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center", color: colors.muted, fontWeight: "700", paddingVertical: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  day: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  dayText: { fontSize: 16, color: colors.ink },
  outside: { color: "#A8B0BC" },
  selected: { backgroundColor: colors.brand, borderRadius: 999 },
  selectedText: { color: colors.white, fontWeight: "800" },
});
