import os
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

if __name__ == "__main__":
	host = os.getenv("API_HOST", "0.0.0.0")
	port = int(os.getenv("API_PORT", "8000"))
	log_level = os.getenv("LOG_LEVEL", "info")
	
	uvicorn.run(
		"app.main:app",
		host=host,
		port=port,
		reload=False,
		log_level=log_level,
	)

