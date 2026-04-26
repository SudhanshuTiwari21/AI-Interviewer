DELETE FROM "coaches"
WHERE "id" IN ('coach-1', 'coach-2', 'coach-3')
   OR "email" IN (
     'diana.park@selectwise.app',
     'marcus.lee@selectwise.app',
     'sara.okonkwo@selectwise.app'
   );
