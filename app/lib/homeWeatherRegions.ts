/** Fixed representative cities; no user geolocation or personal data. */
export const HOME_WEATHER_REGIONS = [
  {
    "id": "seoul",
    "label": "서울",
    "lat": "37.5665",
    "lon": "126.9780",
    "airSido": "서울",
    "airStation": "중구"
  },
  {
    "id": "gyeonggi",
    "label": "경기·수원",
    "lat": "37.2636",
    "lon": "127.0286",
    "airSido": "경기",
    "airStation": null
  },
  {
    "id": "incheon",
    "label": "인천",
    "lat": "37.4563",
    "lon": "126.7052",
    "airSido": "인천",
    "airStation": null
  },
  {
    "id": "busan",
    "label": "부산",
    "lat": "35.1796",
    "lon": "129.0756",
    "airSido": "부산",
    "airStation": null
  },
  {
    "id": "daegu",
    "label": "대구",
    "lat": "35.8714",
    "lon": "128.6014",
    "airSido": "대구",
    "airStation": null
  },
  {
    "id": "daejeon",
    "label": "대전",
    "lat": "36.3504",
    "lon": "127.3845",
    "airSido": "대전",
    "airStation": null
  },
  {
    "id": "gwangju",
    "label": "광주",
    "lat": "35.1595",
    "lon": "126.8526",
    "airSido": "광주",
    "airStation": null
  },
  {
    "id": "ulsan",
    "label": "울산",
    "lat": "35.5384",
    "lon": "129.3114",
    "airSido": "울산",
    "airStation": null
  },
  {
    "id": "sejong",
    "label": "세종",
    "lat": "36.4800",
    "lon": "127.2890",
    "airSido": "세종",
    "airStation": null
  },
  {
    "id": "gangwon",
    "label": "강원·춘천",
    "lat": "37.8813",
    "lon": "127.7300",
    "airSido": "강원",
    "airStation": null
  },
  {
    "id": "chungbuk",
    "label": "충북·청주",
    "lat": "36.6424",
    "lon": "127.4890",
    "airSido": "충북",
    "airStation": null
  },
  {
    "id": "chungnam",
    "label": "충남·천안",
    "lat": "36.8151",
    "lon": "127.1139",
    "airSido": "충남",
    "airStation": null
  },
  {
    "id": "jeonbuk",
    "label": "전북·전주",
    "lat": "35.8242",
    "lon": "127.1480",
    "airSido": "전북",
    "airStation": null
  },
  {
    "id": "jeonnam",
    "label": "전남·무안",
    "lat": "34.9904",
    "lon": "126.4817",
    "airSido": "전남",
    "airStation": null
  },
  {
    "id": "gyeongbuk",
    "label": "경북·안동",
    "lat": "36.5684",
    "lon": "128.7294",
    "airSido": "경북",
    "airStation": null
  },
  {
    "id": "gyeongnam",
    "label": "경남·창원",
    "lat": "35.2279",
    "lon": "128.6811",
    "airSido": "경남",
    "airStation": null
  },
  {
    "id": "jeju",
    "label": "제주",
    "lat": "33.4996",
    "lon": "126.5312",
    "airSido": "제주",
    "airStation": null
  }
] as const;
export type HomeWeatherRegion = (typeof HOME_WEATHER_REGIONS)[number];
export type HomeWeatherRegionId = HomeWeatherRegion["id"];
export const DEFAULT_HOME_WEATHER_REGION: HomeWeatherRegionId = "seoul";
export function getHomeWeatherRegion(id: string | null | undefined): HomeWeatherRegion | undefined {
  return HOME_WEATHER_REGIONS.find(region => region.id === id);
}
