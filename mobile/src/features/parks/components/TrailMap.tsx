import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import { GeoJSONLineString } from '../types';
import { Checkpoint } from '../types';

interface TrailMapProps {
  routeGeoJSON: GeoJSONLineString | null;
  checkpoints: Checkpoint[];
}

export const TrailMap: React.FC<TrailMapProps> = () => {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: -35.4264, // Coordenada referencial inicial (ej. Talca/Chile o región base)
          longitude: -71.6554,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 300,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 10,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});