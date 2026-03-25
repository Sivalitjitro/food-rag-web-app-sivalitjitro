import os
from dotenv import load_dotenv
from upstash_vector import Index
from groq import Groq

# Load environment variables from .env file
load_dotenv()

# 2. Initialize clients
index = Index(
    url=os.getenv("UPSTASH_VECTOR_REST_URL"),
    token=os.getenv("UPSTASH_VECTOR_REST_TOKEN"),
)
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def run_verify():
    print("🚀 Connecting to Cloud...")
    # Get the question from YOU
    user_query = input("🤔 What is your question? ") 
    
    try:
        # Step 1: Check Upstash Connection using YOUR question
        res = index.query(data=user_query, top_k=1, include_metadata=True)
        print("✅ Upstash Authenticated!")

        context = res[0].data if res else "No data found for that topic."

        # Step 2: Check Groq Connection
        chat = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": f"Context: {context}\n\nQuestion: {user_query}"}]
        )
        print(f"\n🤖 AI Answer: {chat.choices[0].message.content}")

    except Exception as e:
        print(f"❌ AUTH FAILED: {e}")
        print("\nNote: If you still see 'Unauthorized', go to Upstash, click the COPY ICON")
        print("next to the token, and paste the WHOLE thing.")

if __name__ == "__main__":
    run_verify()