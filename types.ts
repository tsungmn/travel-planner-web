export type Trip = {
  id: string;
  title: string;
  destination: string;
  dest_lat: number | null;
  dest_lng: number | null;
  start_date: string;
  end_date: string;
  share_token: string | null;
  num_days: number;
  stop_count: number;
};

export type Stop = {
  id: string;
  trip_id: string;
  day_index: number;
  sort_order: number;
  name: string;
  address_text: string | null;
  lat: number;
  lng: number;
  provider: string;
  provider_place_id: string | null;
  memo: string | null;
};

export type Flight = {
  id: string;
  trip_id: string;
  direction: "outbound" | "inbound";
  flight_no: string;
  dep_airport: string | null;
  arr_airport: string | null;
  dep_local: string | null;
  arr_local: string | null;
  dep_tz: string | null;
  arr_tz: string | null;
};

export type Lodging = {
  id: string;
  trip_id: string;
  name: string;
  address_text: string | null;
  lat: number;
  lng: number;
  provider: string;
  provider_place_id: string | null;
  check_in: string | null;
  check_out: string | null;
  memo: string | null;
};

export type PlaceResult = {
  provider: string;
  provider_place_id: string;
  name: string;
  address_text: string | null;
  lat: number;
  lng: number;
};

export type SearchMode = "suggest" | "full";

export type PlaceSearchOut = {
  items: PlaceResult[];
  attribution: string;
};

export type TripDetail = {
  trip: Trip;
  stops: Stop[];
  flights: Flight[];
  lodgings: Lodging[];
};
