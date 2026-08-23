"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Crosshair,
  Globe2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import mapData from "@/data/world-map.json";
import { unwrapDatelinePoints } from "../lib/map-view";

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
  concealCountryNames?: boolean;
  highlightActiveCountry?: boolean;
};

const width = 1000;
const height = 560;
const zoomLevels = [1, 1.8, 3.2, 5, 7, 10, 12.5, 15, 20, 25, 30] as const;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

type ProjectedMarker = CountryMarker & { x: number; y: number };

const getFitView = (markers: ProjectedMarker[]) => {
  if (!markers.length) {
    return { center: { x: width / 2, y: height / 2 }, zoomIndex: 0 };
  }

  const xs = markers.map((marker) => marker.x);
  const ys = markers.map((marker) => marker.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const contentWidth = Math.max(maxX - minX, 38);
  const contentHeight = Math.max(maxY - minY, 30);
  const maximumFitZoom = Math.min(
    width / (contentWidth + 100),
    height / (contentHeight + 78),
    markers.length === 1 ? 10 : 15
  );
  let zoomIndex = 0;

  zoomLevels.forEach((level, index) => {
    if (level <= maximumFitZoom) {
      zoomIndex = index;
    }
  });

  return {
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    zoomIndex,
  };
};

const findDirectionalMarker = (
  markers: ProjectedMarker[],
  currentCode: string,
  key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown"
) => {
  const current = markers.find((marker) => marker.code === currentCode);
  if (!current) {
    return markers[0];
  }

  const candidates = markers.flatMap((marker) => {
    if (marker.code === current.code) {
      return [];
    }

    const dx = marker.x - current.x;
    const dy = marker.y - current.y;
    const isInDirection =
      (key === "ArrowLeft" && dx < 0) ||
      (key === "ArrowRight" && dx > 0) ||
      (key === "ArrowUp" && dy < 0) ||
      (key === "ArrowDown" && dy > 0);
    if (!isInDirection) {
      return [];
    }

    const primaryDistance =
      key === "ArrowLeft" || key === "ArrowRight" ? Math.abs(dx) : Math.abs(dy);
    const crossDistance =
      key === "ArrowLeft" || key === "ArrowRight" ? Math.abs(dy) : Math.abs(dx);

    return [{ marker, score: primaryDistance + crossDistance * 1.8 }];
  });

  return candidates.sort((a, b) => a.score - b.score)[0]?.marker;
};

export default function WorldMap({
  countries,
  activeCountry,
  markerStatuses,
  onSelectCountry,
  concealCountryNames = false,
  highlightActiveCountry = true,
}: Props) {
  const [zoomIndex, setZoomIndex] = useState(0);
  const [center, setCenter] = useState({ x: width / 2, y: height / 2 });
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [rovingCode, setRovingCode] = useState(activeCountry?.code ?? "");
  const markerRefs = useRef<Record<string, SVGGElement | null>>({});

  const { paths, markers, wrapsDateline } = useMemo(() => {
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
    const projectedMarkers = countries
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
      .filter(Boolean) as ProjectedMarker[];
    const unwrapped = unwrapDatelinePoints(projectedMarkers, width);

    return {
      paths: featurePaths,
      markers: unwrapped.points,
      wrapsDateline: unwrapped.wrapsDateline,
    };
  }, [countries]);

  const activeMarker = markers.find(
    (marker) => marker.code === activeCountry?.code
  );
  const fitView = useMemo(() => getFitView(markers), [markers]);

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
    const timer = window.setTimeout(() => {
      setZoomIndex(fitView.zoomIndex);
      setCenter(fitView.center);
      setRovingCode((current) =>
        markers.some((marker) => marker.code === current)
          ? current
          : markers[0]?.code ?? ""
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fitView, markers]);

  useEffect(() => {
    if (!activeCountry?.code) {
      return;
    }

    const timer = window.setTimeout(() => setRovingCode(activeCountry.code), 0);
    return () => window.clearTimeout(timer);
  }, [activeCountry?.code]);

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
  const mapWidth = wrapsDateline ? width * 2 : width;
  const viewX = clamp(center.x - viewWidth / 2, 0, mapWidth - viewWidth);
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

  const resetToFit = () => {
    setZoomIndex(fitView.zoomIndex);
    setCenter(fitView.center);
  };

  const showWorld = () => {
    setZoomIndex(0);
    setCenter({ x: wrapsDateline ? width : width / 2, y: height / 2 });
  };

  const moveMarkerFocus = (
    currentCode: string,
    key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown"
  ) => {
    const next = findDirectionalMarker(markers, currentCode, key);
    if (!next) {
      return;
    }

    setRovingCode(next.code);
    markerRefs.current[next.code]?.focus();
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
          aria-label="出題範囲に戻す"
          onClick={resetToFit}
          title="出題範囲に戻す"
          type="button"
        >
          <RotateCcw size={18} />
        </button>
        <button
          aria-label="世界全体を表示"
          onClick={showWorld}
          title="世界全体を表示"
          type="button"
        >
          <Globe2 size={18} />
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
        role={onSelectCountry ? "group" : "img"}
        viewBox={viewBox}
      >
        <rect
          className="map-ocean"
          height={height}
          width={wrapsDateline ? width * 2 : width}
        />
        <g>
          {paths.map((feature) => (
            <path
              className={`country-shape ${
                highlightActiveCountry && feature.id === activeCountry?.mapKey
                  ? "active"
                  : ""
              }`}
              d={feature.path}
              key={feature.key}
            >
              {concealCountryNames ? null : <title>{feature.name}</title>}
            </path>
          ))}
        </g>
        {wrapsDateline ? (
          <g aria-hidden="true" transform={`translate(${width}, 0)`}>
            {paths.map((feature) => (
              <path
                className={`country-shape ${
                  highlightActiveCountry &&
                  feature.id === activeCountry?.mapKey
                    ? "active"
                    : ""
                }`}
                d={feature.path}
                key={`wrapped-${feature.key}`}
              />
            ))}
          </g>
        ) : null}
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
                onFocus={() => setRovingCode(marker.code)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectCountry?.(marker.code);
                    return;
                  }

                  if (
                    event.key === "ArrowLeft" ||
                    event.key === "ArrowRight" ||
                    event.key === "ArrowUp" ||
                    event.key === "ArrowDown"
                  ) {
                    event.preventDefault();
                    moveMarkerFocus(marker.code, event.key);
                  }
                }}
                aria-label={
                  onSelectCountry
                    ? concealCountryNames
                      ? `候補位置 ${marker.quizNumber}を選択`
                      : `${marker.quizNumber}番 ${marker.countryJa}を選択`
                    : undefined
                }
                aria-pressed={onSelectCountry ? isActive : undefined}
                role={onSelectCountry ? "button" : undefined}
                ref={(element) => {
                  markerRefs.current[marker.code] = element;
                }}
                tabIndex={
                  onSelectCountry
                    ? marker.code ===
                      (rovingCode || activeCountry?.code || markers[0]?.code)
                      ? 0
                      : -1
                    : undefined
                }
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
                <title>
                  {concealCountryNames
                    ? `候補位置 ${marker.quizNumber}`
                    : `${marker.quizNumber}. ${marker.countryJa}`}
                </title>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
