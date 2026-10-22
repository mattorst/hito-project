
import React from "react";
import {
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Marker } from "react-native-maps";

import type { Checkpoint } from "../types";

const COLORS = {
  surface: "#17181B",
  lime: "#C8FF00",
};

interface CheckpointMarkerProps {
  checkpoint: Checkpoint;
  latitude: number;
  longitude: number;
}

function CheckpointMarker({
  checkpoint,
  latitude,
  longitude,
}: CheckpointMarkerProps) {
  return (
    <Marker
      coordinate={{
        latitude,
        longitude,
      }}
      title={checkpoint.name}
      anchor={{
        x: 0.5,
        y: 0.5,
      }}
      tracksViewChanges={false}
    >
      <View style={styles.marker}>
        <Ionicons
          name="scan-outline"
          size={18}
          color={COLORS.lime}
        />
      </View>
    </Marker>
  );
}

export default React.memo(CheckpointMarker);

const styles = StyleSheet.create({
  marker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.lime,
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 5,
  },
});
