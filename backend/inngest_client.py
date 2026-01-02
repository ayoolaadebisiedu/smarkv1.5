"""
Inngest client initialization for Smark backend.
"""
import os
from inngest import Inngest

# Get Inngest keys from environment variables
INNGEST_EVENT_KEY = os.getenv("INNGEST_EVENT_KEY")
INNGEST_SIGNING_KEY = os.getenv("INNGEST_SIGNING_KEY")

# Initialize Inngest client only if signing key is available
# The signing key is required for inngest_serve() to work
if INNGEST_SIGNING_KEY:
    inngest_client = Inngest(
        app_id="smark-backend",
        event_key=INNGEST_EVENT_KEY,  # Optional: for Inngest Cloud
        signing_key=INNGEST_SIGNING_KEY  # Required for webhook signature verification
    )
else:
    # Set to None if not configured - the app will skip Inngest initialization
    inngest_client = None
