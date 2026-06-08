CREATE TABLE IF NOT EXISTS trips (
    id      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id uuid        NOT NULL,
    title   text        NOT NULL,
    status  text        NOT NULL DEFAULT 'planned',
    created_at  timestamptz  NOT NULL DEFAULT now() 
);

CREATE TABLE IF NOT EXISTS trip_members (
    id          uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id     uuid            NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id     uuid            NOT NULL,
    role        text            NOT NULL DEFAULT 'rider',
    joined_at   timestamptz     NOT NULL DEFAULT now(),
    UNIQUE (trip_id, user_id)
);