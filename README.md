# Codeway-Backend

This is the backedn repository of the case study. I use node.js in this repository. There are 4 different endpoints which are GET, UPDATE, DELETE, ADD. Since I have been using firestore's real time onSnapshot listener, I did not used GET endpoint in the frontend. But this is the main endpoint that the application users will use to retrieve the config files of the applications they used. Each endpoint checks first firebase authentication token to be sure that sended request comes from a legitimate user. After this control, custom API key is also checked to be sure that only the users that have the API key can send a request. Concurrency check is made by timestamping. When a record is updated or added, the created user, updated user and updated time informaiton is stored alongisde its value and description. If the incoming change did not fetch yet the new change, then request is rejected, changes are fetched and user is prompted about the situation. New values are shown in the screen of the user. I used firestore as database. When server starts, the default values are injected into the database which is totally optional and only used in dev environment. In production, this function should not be used. It is only for demonstrating given parameters. 

# Endpoints

# GET /config
Retrieve all parameters (cached for 60 seconds). It supports country overrides.
Query Params: country (optional): e.g. TR, US

Example:
curl -X GET "https://codeway-backend-production-3ffb.up.railway.app/config?country=TR" \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN" \
  -H "x-api-key: API_KEY"

API_KEY will be sent via email, auth token can be sent if requested since it is only valid for 1 hour

# POST /config
Create a new configuration parameter
Headers:Authorization: Bearer <ID Token>
x-api-key: your-api-key

Body:
{
  "key": "feature_enabled",
  "value": "true",
  "description": "Feature toggle for new UI"
}

curl -X POST "https://codeway-backend-production-3ffb.up.railway.app/config" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"key":"feature_enabled","value":"true","description":"Feature toggle for new UI"}'

# PUT /config/:key
Update an existing parameter
Requires updatedAt to prevent conflicts.
Body:
{
  "value": "false",
  "description": "Temporarily disabled",
  "updatedAt": "2025-06-30T10:30:00.000Z",
  "countryOverrides": [
    { "country": "TR", "value": "true" },
    { "country": "US", "value": "false" }
  ]
}

Example:
curl -X PUT "https://codeway-backend-production-3ffb.up.railway.app/config/feature_enabled" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{ "value": "false", "description": "Temp off", "updatedAt": "2025-06-30T10:30:00.000Z" }'

# DELETE /config/:key
Delete a configuration parameter by key

Example:
curl -X DELETE "https://codeway-backend-production-3ffb.up.railway.app/config/feature_enabled" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "x-api-key: your-api-key"

# Deployment

I deployed the frontend using netlify and backend using railway. They are both deploying from github repos using Docker. I manually created environment variables in both services using the variables in .env files. A user can edit the environment variables easily to deploy the project anywhhere at anytime. There is no any hardcoded deployment variables in both backend and frontend. 
