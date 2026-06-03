import json
import os
from dotenv import load_dotenv
import scrapegraph_py

load_dotenv()

print(f"scrapegraph-py version: {scrapegraph_py.__version__}")

# v2 API
from scrapegraph_py import Client

client = Client(api_key=os.environ["SGAI_API_KEY"])

response = client.smartscraper(
    website_url="https://quotes.toscrape.com",
    user_prompt="Extract the first 3 quotes with their authors",
)

print(json.dumps(response, indent=2, default=str))
