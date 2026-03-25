import os
import json
from dotenv import load_dotenv
from upstash_vector import Index

# Load credentials from your .env file
load_dotenv()

# Initialize the Upstash Index
index = Index(
    url=os.getenv("UPSTASH_VECTOR_REST_URL"), 
    token=os.getenv("UPSTASH_VECTOR_REST_TOKEN")
)

def sync_to_cloud():
    # Load your enhanced JSON data (35 items)
    try:
        with open("data/food_data.json", "r") as f:
            food_items = json.load(f)
        
        print(f"🔄 Starting sync: {len(food_items)} items found...")
        
        for item in food_items:
            # We send: (ID, Text, Metadata)
            # Upstash automatically creates the embedding for the 'text'
            index.upsert(
                vectors=[
                    (item['id'], item['text'], {"id": item['id']})
                ]
            )
            print(f"✅ Synced ID: {item['id']}")
            
        print("\n🎉 ALL DATA IS NOW IN THE CLOUD!")
        
    except FileNotFoundError:
        print("❌ Error: data/food_data.json not found. Check your folder structure.")
    except Exception as e:
        print(f"❌ Sync failed: {e}")

if __name__ == "__main__":
    sync_to_cloud()