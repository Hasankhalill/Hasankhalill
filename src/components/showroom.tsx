import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";

import { colors } from "@/theme";

const STYLE_ID = "jazzar-showroom-css";

const CSS = `
.jazzar-showroom{position:absolute;inset:0;overflow:hidden;pointer-events:none;
  background:
    radial-gradient(ellipse 48% 36% at 50% 12%, rgba(224,161,90,.28), transparent 64%),
    radial-gradient(ellipse 70% 28% at 50% 78%, rgba(196,98,45,.16), transparent 70%),
    linear-gradient(180deg,#101720 0%,#1B2430 46%,#0C1218 100%);
}
.jazzar-beam{position:absolute;top:-30%;left:-40%;width:26%;height:58%;
  background:linear-gradient(100deg,transparent,rgba(255,244,230,.28),transparent);
  animation:jazzar-sweep 18s ease-in-out infinite;
}
.jazzar-floor{position:absolute;left:6%;right:6%;top:128px;height:18px;border-radius:999px;
  background:linear-gradient(90deg,transparent,rgba(224,161,90,.45),rgba(255,255,255,.35),rgba(224,161,90,.45),transparent);
  filter:blur(0.4px);
}
.jazzar-car{position:absolute;top:18px;left:50%;width:300px;margin-left:-150px;
  animation:jazzar-glide 22s ease-in-out infinite;
}
.jazzar-reflect{margin-top:-8px;transform:scaleY(-0.55);opacity:.22;filter:blur(0.6px);
  -webkit-mask-image:linear-gradient(#000,transparent 78%);
  mask-image:linear-gradient(#000,transparent 78%);
}
.jazzar-wheel{transform-box:fill-box;transform-origin:center;animation:jazzar-spin 2.4s linear infinite;}
@keyframes jazzar-sweep{0%{transform:translateX(0)}50%{transform:translateX(280%)}100%{transform:translateX(0)}}
@keyframes jazzar-glide{0%,100%{transform:translateX(-56px)}50%{transform:translateX(56px)}}
@keyframes jazzar-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){
  .jazzar-beam,.jazzar-car,.jazzar-wheel{animation:none}
}
`;

function useShowroomCss() {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }, []);
}

function Sedan({ reflect = false }: { reflect?: boolean }) {
  return (
    <svg viewBox="0 0 300 96" width="300" height="96" aria-hidden="true">
      <path
        d="M28 70
           C44 70 52 62 64 54
           C78 44 96 36 118 34
           H168
           C188 34 206 40 220 50
           L246 66
           C252 70 258 72 266 72
           H274
           C278 72 280 76 276 78
           H24
           C20 78 18 74 22 72 Z"
        fill="#F6F3EE"
      />
      <path d="M112 40h28c4 6 4 12 2 18h-36c0-6 2-12 6-18z" fill="#243044" />
      <path d="M148 38h46c10 0 18 6 24 16H146c0-6 0-12 2-16z" fill="#243044" />
      <path d="M40 66h16" stroke="#E0A15A" strokeWidth="3" strokeLinecap="round" />
      <path d="M258 66h14" stroke={reflect ? "#E0A15A" : "#C4622D"} strokeWidth="3" strokeLinecap="round" />
      <g className="jazzar-wheel">
        <circle cx="86" cy="74" r="14" fill="#141B24" stroke="#E0A15A" strokeWidth="3" />
        <circle cx="86" cy="74" r="4" fill="#E0A15A" />
      </g>
      <g className="jazzar-wheel">
        <circle cx="214" cy="74" r="14" fill="#141B24" stroke="#E0A15A" strokeWidth="3" />
        <circle cx="214" cy="74" r="4" fill="#E0A15A" />
      </g>
    </svg>
  );
}

function WebShowroom() {
  useShowroomCss();
  return (
    <div className="jazzar-showroom" aria-hidden="true">
      <div className="jazzar-beam" />
      <div className="jazzar-car">
        <Sedan />
        <div className="jazzar-reflect">
          <Sedan reflect />
        </div>
      </div>
      <div className="jazzar-floor" />
    </div>
  );
}

function NativeShowroom() {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-40, 40] });
  return (
    <View style={styles.native} pointerEvents="none">
      <View style={styles.glow} />
      <Animated.View style={[styles.nativeCar, { transform: [{ translateX }] }]}>
        <View style={styles.body} />
        <View style={styles.cabin} />
        <View style={styles.wheels}>
          <View style={styles.wheel} />
          <View style={styles.wheel} />
        </View>
      </Animated.View>
      <View style={styles.nativeFloor} />
    </View>
  );
}

export function ShowroomBackdrop() {
  if (Platform.OS === "web") return <WebShowroom />;
  return <NativeShowroom />;
}

const styles = StyleSheet.create({
  native: { ...StyleSheet.absoluteFill, overflow: "hidden", backgroundColor: colors.page },
  glow: {
    position: "absolute",
    top: -40,
    alignSelf: "center",
    width: 280,
    height: 160,
    borderRadius: 140,
    backgroundColor: "rgba(224,161,90,0.18)",
  },
  nativeCar: { position: "absolute", top: 36, alignSelf: "center", width: 220, alignItems: "center" },
  body: { width: 210, height: 36, borderRadius: 18, backgroundColor: "#F6F3EE", marginTop: 18 },
  cabin: {
    position: "absolute",
    top: 0,
    width: 96,
    height: 28,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: "#243044",
  },
  wheels: { position: "absolute", top: 40, width: 180, flexDirection: "row", justifyContent: "space-between" },
  wheel: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#141B24", borderWidth: 2, borderColor: colors.gold },
  nativeFloor: {
    position: "absolute",
    top: 108,
    left: "12%",
    right: "12%",
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(224,161,90,0.45)",
  },
});
