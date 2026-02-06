-- Reset Premium Status for a specific user
UPDATE "public"."users"
SET 
  "isPremium" = false, 
  "premiumExpiryDate" = NULL
WHERE 
  "email" = 'surapurajujagadeeswarraju12@gmail.com'; 

-- Verify the change
SELECT * FROM "public"."users" WHERE "email" = 'surapurajujagadeeswarraju12@gmail.com';
