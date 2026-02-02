#!/bin/sh

# Default to empty object if file doesn't exist
echo "window.__ENV = {" > /app/public/env-config.js

# Inject API_URL
if [ -n "$NEXT_PUBLIC_API_URL" ]; then
  echo "  API_URL: \"$NEXT_PUBLIC_API_URL\"," >> /app/public/env-config.js
else
  # Fallback to defaults if env var is missing (e.g. local dev)
  echo "  API_URL: \"http://localhost:4000/api\"," >> /app/public/env-config.js
fi

echo "};" >> /app/public/env-config.js

# Execute the main command (passed as arguments to this script)
exec "$@"
