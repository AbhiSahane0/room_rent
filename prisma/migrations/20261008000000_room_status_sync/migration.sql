-- A room is OCCUPIED exactly when it has an ACTIVE assignment. The app already keeps these in step; this makes the database enforce it,
-- so a room can never show "Vacant" while a tenant is living in it (or "Occupied" with nobody), whichever way data was changed.

-- 1. Repair any rooms that are already out of step.
UPDATE "rooms" r SET "status" = 'OCCUPIED'
 WHERE r."status" <> 'OCCUPIED' AND EXISTS (SELECT 1 FROM "room_assignments" a WHERE a."room_id" = r."id" AND a."status" = 'ACTIVE');
UPDATE "rooms" r SET "status" = 'VACANT'
 WHERE r."status" = 'OCCUPIED' AND NOT EXISTS (SELECT 1 FROM "room_assignments" a WHERE a."room_id" = r."id" AND a."status" = 'ACTIVE');

-- 2. Keep them in step from now on.
CREATE OR REPLACE FUNCTION sync_room_status() RETURNS trigger AS $$
BEGIN
  IF NEW."status" = 'ACTIVE' THEN
    UPDATE "rooms" SET "status" = 'OCCUPIED' WHERE "id" = NEW."room_id" AND "status" <> 'OCCUPIED';
  ELSIF NOT EXISTS (SELECT 1 FROM "room_assignments" WHERE "room_id" = NEW."room_id" AND "status" = 'ACTIVE') THEN
    UPDATE "rooms" SET "status" = 'VACANT' WHERE "id" = NEW."room_id" AND "status" = 'OCCUPIED';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "room_assignments_sync_room_status"
  AFTER INSERT OR UPDATE OF "status", "room_id" ON "room_assignments"
  FOR EACH ROW EXECUTE FUNCTION sync_room_status();
