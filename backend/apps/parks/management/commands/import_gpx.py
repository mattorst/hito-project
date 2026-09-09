from pathlib import Path
import xml.etree.ElementTree as ET
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.parks.models import Trail


class Command(BaseCommand):
    help = "Importa una ruta GPX y la almacena como GeoJSON en un Trail."

    def add_arguments(self, parser):
        parser.add_argument(
            "trail_id",
            type=int,
            help="ID del Trail al que se asociará la ruta.",
        )
        parser.add_argument(
            "gpx_file",
            type=str,
            help="Ruta del archivo GPX.",
        )

    def handle(self, *args, **options):
        trail_id = options["trail_id"]
        gpx_file = Path(options["gpx_file"])

        try:
            trail = Trail.objects.get(pk=trail_id)
        except Trail.DoesNotExist:
            raise CommandError(
                f"No existe un Trail con ID {trail_id}."
            )

        if not gpx_file.exists():
            raise CommandError(
                f"No existe el archivo GPX: {gpx_file}"
            )

        if not gpx_file.is_file():
            raise CommandError(
                f"La ruta indicada no corresponde a un archivo: {gpx_file}"
            )

        try:
            coordinates = self._extract_coordinates(gpx_file)
        except ET.ParseError as exc:
            raise CommandError(
                f"El archivo GPX no contiene XML válido: {exc}"
            ) from exc
        except OSError as exc:
            raise CommandError(
                f"No fue posible leer el archivo GPX: {exc}"
            ) from exc

        if len(coordinates) < 2:
            raise CommandError(
                "El archivo GPX debe contener al menos dos puntos "
                "válidos para construir una ruta."
            )

        route_geojson = {
            "type": "LineString",
            "coordinates": coordinates,
        }

        with transaction.atomic():
            trail.route_geojson = route_geojson
            trail.save(update_fields=["route_geojson"])

        self.stdout.write(
            self.style.SUCCESS(
                f"Ruta GPX importada correctamente en Trail "
                f"'{trail.name}' (ID: {trail.id})."
            )
        )
        self.stdout.write(f"Puntos importados: {len(coordinates)}")

    def _extract_coordinates(self, gpx_file):
        tree = ET.parse(gpx_file)
        root = tree.getroot()

        coordinates = []

        for element in root.iter():
            if self._local_name(element.tag) != "trkpt":
                continue

            latitude = self._parse_coordinate(
                element.attrib.get("lat")
            )
            longitude = self._parse_coordinate(
                element.attrib.get("lon")
            )

            if latitude is None or longitude is None:
                continue

            if not -90 <= latitude <= 90:
                continue

            if not -180 <= longitude <= 180:
                continue

            # GeoJSON requiere [longitud, latitud]
            coordinates.append([longitude, latitude])

        return coordinates

    @staticmethod
    def _parse_coordinate(value):
        if value is None:
            return None

        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _local_name(tag):
        return tag.split("}")[-1]