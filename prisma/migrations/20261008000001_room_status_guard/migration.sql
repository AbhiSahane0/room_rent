-- A room that has an ACTIVE tenant cannot be marked Vacant or Under maintenance: move the tenant out first.
CREATE OR REPLACE FUNCTION guard_room_status() RETURNS trigger AS $$
BEGIN
  IF NEW."status" <> 'OCCUPIED' AND EXISTS (SELECT 1 FROM "room_assignments" WHERE "room_id" = NEW."id" AND "status" = 'ACTIVE') THEN
    RAISE EXCEPTION 'Room % has a tenant living in it: move the tenant out before changing the room status', NEW."room_number";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "rooms_status_guard"
  BEFORE UPDATE OF "status" ON "rooms"
  FOR EACH ROW EXECUTE FUNCTION guard_room_status();
