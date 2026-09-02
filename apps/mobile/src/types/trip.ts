type Trip = {
  id: string;
  title: string;
  status: string;
  host_id: string;
  created_at: string;
};

type TripMember = {
  user_id: string;
  role: string;
  joined_at: string;
};

type TripDetails = {
  trip: Trip;
  members: TripMember[];
};

export { Trip, TripDetails, TripMember };
