CREATE TABLE IF NOT EXISTS locations (
    id          uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id     text                NOT NULL,
    user_id     text                NOT NULL,
    lat         double precision    NOT NULL,
    lng         double precision    NOT NULL,
    recorded_at timestamptz         NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS locations_trip_idx ON locations (trip_id, recorded_at);