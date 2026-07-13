"use client";

import { useEffect, useMemo, useState } from "react";
import { Crosshair, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import mapData from "@/data/world-map.json";

type MapFeature = {
  type: "Feature";
  id: string | number;
  properties: {
    name?: string;
  };
  geometry: GeoJSON.Geometry;
};

type CountryMarker = {
  code: string;
  mapKey: string;
  countryJa: string;
  lat: number;
  lng: number;
  quizNumber: number;
};

export type MarkerStatus = "ok" | "ng" | "empty";

type Props = {
  countries: CountryMarker[];
  activeCountry?: CountryMarker;
  markerStatuses?: Record<string, MarkerStatus>;
  onSelectCountry?: (code: string) => void;
};

const width = 1000;
const height = 560;
const zoomLevels = [1, 1.8, 3.2, 5, 7, 10, 12.5, 15, 20, 25, 30] as const;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export default function WorldMap({
  countries,
  activeCountry,
  markerStatuses,
  onSelectCountry,
}: Props) {
  const [zoomIndex, setZoomIndex] = useState(0);
  const [center, setCenter] = useState({ x: width / 2, y: height / 2 });
  const [isCompactViewport, setIsCompactViewport] = useState(false);

  const { paths, markers } = useMemo(() => {
    const topology = mapData as unknown as {
      objects: { countries: unknown };
    };
    const collection = feature(
      mapData as never,
      topology.objects.countries as never
    ) as unknown as GeoJSON.FeatureCollection<GeoJSON.Geometry>;
    const fitCollection: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
      ...collection,
      features: collection.features.filter(
        (feature) => String(feature.id) !== "010"
      ),
    };
    const projection = geoMercator().fitExtent(
      [
        [14, 14],
        [width - 14, height - 14],
      ],
      fitCollection
    );
    const path = geoPath(projection);
    const featurePaths = collection.features.map((feature, index) => ({
      id: String(feature.id),
      key: `${String(feature.id)}-${index}`,
      name: (feature as MapFeature).properties?.name ?? String(feature.id),
      path: path(feature) ?? "",
    }));
    const markerPoints = countries
      .map((country) => {
        const projected = projection([country.lng, country.lat]);
        if (!projected) {
          return null;
        }

        return {
          ...country,
          x: projected[0],
          y: projected[1],
        };
      })
      .filter(Boolean) as (CountryMarker & { x: number; y: number })[];

    return { paths: featurePaths, markers: markerPoints };
  }, [countries]);

  const activeMarker = markers.find(
    (marker) => marker.code === activeCountry?.code
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 720px)");
    const updateViewportMode = () => {
      setIsCompactViewport(mediaQuery.matches);
    };
    const timer = window.setTimeout(updateViewportMode, 0);

    mediaQuery.addEventListener("change", updateViewportMode);

    return () => {
      window.clearTimeout(timer);
      mediaQuery.removeEventListener("change", updateViewportMode);
    };
  }, []);

  useEffect(() => {
    if (!activeMarker || zoomIndex === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCenter({ x: activeMarker.x, y: activeMarker.y });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeMarker, zoomIndex]);

  const zoom = zoomLevels[zoomIndex];
  const viewWidth = width / zoom;
  const viewHeight = height / zoom;
  const viewX = clamp(center.x - viewWidth / 2, 0, width - viewWidth);
  const viewY = clamp(center.y - viewHeight / 2, 0, height - viewHeight);
  const viewBox = `${viewX} ${viewY} ${viewWidth} ${viewHeight}`;
  const markerRadius = (isCompactViewport ? 14 : 12) / zoom;
  const activeMarkerRadius = (isCompactViewport ? 16 : 14) / zoom;
  const markerFontSize = (isCompactViewport ? 11 : 9.5) / zoom;
  const activeMarkerFontSize = (isCompactViewport ? 12 : 10.5) / zoom;
  const zoomLabel = Number.isInteger(zoom) ? String(zoom) : zoom.toString();

  const focusActiveMarker = () => {
    if (activeMarker) {
      setCenter({ x: activeMarker.x, y: activeMarker.y });
    }
  };

  const zoomIn = () => {
    setZoomIndex((current) => Math.min(current + 1, zoomLevels.length - 1));
    focusActiveMarker();
  };

  const zoomOut = () => {
    setZoomIndex((current) => Math.max(current - 1, 0));
  };

  const resetZoom = () => {
    setZoomIndex(0);
    setCenter({ x: width / 2, y: height / 2 });
  };

  return (
    <div className="map-card">
      <div className="map-tools" aria-label="地図操作">
        <button
          aria-label="拡大"
          disabled={zoomIndex === zoomLevels.length - 1}
          onClick={zoomIn}
          title="拡大"
          type="button"
        >
          <ZoomIn size={18} />
        </button>
        <button
          aria-label="縮小"
          disabled={zoomIndex === 0}
          onClick={zoomOut}
          title="縮小"
          type="button"
        >
          <ZoomOut size={18} />
        </button>
        <button
          aria-label="選択中の番号へ移動"
          disabled={!activeMarker}
          onClick={focusActiveMarker}
          title="選択中の番号へ移動"
          type="button"
        >
          <Crosshair size={18} />
        </button>
        <button
          aria-label="表示をリセット"
          onClick={resetZoom}
          title="表示をリセット"
          type="button"
        >
          <RotateCcw size={18} />
        </button>
        <label className="zoom-meter">
          <span>{zoomLabel}x</span>
          <input
            aria-label="拡大倍率"
            max={zoomLevels.length - 1}
            min={0}
            onChange={(event) => setZoomIndex(Number(event.currentTarget.value))}
            step={1}
            type="range"
            value={zoomIndex}
          />
        </label>
      </div>

      <svg
        aria-label="世界地図"
        className="world-map"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        viewBox={viewBox}
      >
        <rect className="map-ocean" height={height} width={width} />
        <g>
          {paths.map((feature) => (
            <path
              className={`country-shape ${
                feature.id === activeCountry?.mapKey ? "active" : ""
              }`}
              d={feature.path}
              key={feature.key}
            >
              <title>{feature.name}</title>
            </path>
          ))}
        </g>
        <g className="marker-layer">
          {markers.map((marker) => {
            const status = markerStatuses?.[marker.code];
            const isActive = marker.code === activeCountry?.code;
            return (
              <g
                className={`country-marker ${
                  isActive ? "active" : ""
                } ${status ? `status-${status}` : ""}`}
                key={marker.code}
                onClick={() => onSelectCountry?.(marker.code)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectCountry?.(marker.code);
                  }
                }}
                role={onSelectCountry ? "button" : undefined}
                tabIndex={onSelectCountry ? 0 : undefined}
                transform={`translate(${marker.x}, ${marker.y})`}
              >
                <circle r={isActive ? activeMarkerRadius : markerRadius} />
                <text
                  dy="0.34em"
                  style={{
                    fontSize: `${isActive ? activeMarkerFontSize : markerFontSize}px`,
                  }}
                >
                  {marker.quizNumber}
                </text>
                <title>{`${marker.quizNumber}. ${marker.countryJa}`}</title>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
