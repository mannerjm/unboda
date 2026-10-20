import boundary from "./weatherDistrictBoundaries2018.json";

type Area = { name: string; code: string; arcs: number[][][] };
type BoundaryData = { scale: [number, number]; translate: [number, number]; arcs: number[][][]; areas: Area[] };
const topo = boundary as unknown as BoundaryData;

// Offline, server-only lookup. It does not contact a reverse-geocoding vendor.
const arcPoints: Array<Array<[number, number]>> = topo.arcs.map((arc) => {
  let x = 0, y = 0;
  return arc.map(([dx, dy]): [number, number] => {
    x += dx;
    y += dy;
    return [x * topo.scale[0] + topo.translate[0], y * topo.scale[1] + topo.translate[1]];
  });
});

function containsRing(lon: number, lat: number, arcIds: number[]): boolean {
  let inside = false;
  let previous: [number, number] | undefined;
  let first: [number, number] | undefined;
  for (const index of arcIds) {
    const vertices = index >= 0 ? arcPoints[index] : arcPoints[~index].slice().reverse();
    for (const point of vertices) {
      if (!first) first = point;
      if (previous) {
        const [ax, ay] = previous, [bx, by] = point;
        if ((ay > lat) !== (by > lat) && lon < (bx - ax) * (lat - ay) / (by - ay) + ax) inside = !inside;
      }
      previous = point;
    }
  }
  if (first && previous) {
    const [ax, ay] = previous, [bx, by] = first;
    if ((ay > lat) !== (by > lat) && lon < (bx - ax) * (lat - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

const provinces: Record<string, string> = {
  "11": "서울", "21": "부산", "22": "대구", "23": "인천",
  "24": "광주", "25": "대전", "26": "울산", "29": "세종",
  "31": "경기", "32": "강원", "33": "충북", "34": "충남",
  "35": "전북", "36": "전남", "37": "경북", "38": "경남", "39": "제주",
};

/** Resolve approximate WGS84 coordinates to a Korean si/gun/gu label. */
export function resolveWeatherDistrict(lat: number, lon: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const area = topo.areas.find((candidate) => candidate.arcs.some((poly) =>
    poly.length > 0 && containsRing(lon, lat, poly[0])
    && !poly.slice(1).some((hole) => containsRing(lon, lat, hole))
  ));
  if (!area) return null;
  const province = provinces[area.code.slice(0, 2)];
  if (!province) return null;
  // Remove a subordinate 'gu' after a city name: 천안시서북구 -> 천안시.
  const city = area.name.match(/^(.+?시).+구$/)?.[1] ?? area.name;
  return province === "세종" ? "세종시" : province + " " + city;
}
