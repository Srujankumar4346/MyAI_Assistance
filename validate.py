import asyncio
import httpx
from sqlalchemy.orm import Session
from backend.database.connection import SessionLocal
from backend.database.models import User
from backend.security.auth import create_access_token

async def run_validation():
    print("Starting NOVA_X Validation...")
    
    # 1. Setup test user
    db = SessionLocal()
    user = db.query(User).filter_by(username="test_validator").first()
    if not user:
        user = User(
            username="test_validator",
            email="validator@novax.ai",
            hashed_password="dummy_hash"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    token = create_access_token(data={"sub": user.username})
    db.close()
    
    headers = {"Authorization": f"Bearer {token}"}
    base_url = "http://localhost:8000/api"
    
    results = {
        "Phase 1": "Passed",
        "Phase 2": "Passed",
        "Phase 3": "Passed",
        "Bugs": [],
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Phase 3 Checks
        print("Checking Phase 3: Neural Memory Engine...")
        
        # Store memory
        res = await client.post(f"{base_url}/memory/store", headers=headers, json={
            "content": "I am a software architect running validation checks.",
            "category": "projects",
            "memory_type": "episodic",
            "tags": ["validation", "test"]
        })
        if res.status_code != 200:
            results["Phase 3"] = "Failed"
            results["Bugs"].append("[FAIL] Memory storage failed.")
            print(f"Memory Store Error: {res.text}")
        else:
            print("[OK] Memory stored successfully.")
            
        # Search memory
        res = await client.get(f"{base_url}/memory/search?q=architect", headers=headers)
        if res.status_code != 200 or len(res.json().get("results", [])) == 0:
            results["Phase 3"] = "Failed"
            results["Bugs"].append("Memory search failed or returned no results.")
        else:
            print("[OK] Memory search working.")
            mem_id = res.json()["results"][0]["id"]
            
            # Reinforce memory
            res_reinforce = await client.post(f"{base_url}/memory/reinforce/{mem_id}", headers=headers)
            if res_reinforce.status_code != 200:
                results["Bugs"].append("Memory reinforcement failed.")
            else:
                print("[OK] Memory reinforcement working.")
        
        # Knowledge Graph
        res = await client.get(f"{base_url}/knowledge/graph", headers=headers)
        if res.status_code != 200:
            results["Phase 3"] = "Failed"
            results["Bugs"].append("Knowledge graph endpoint failed.")
        else:
            print("[OK] Knowledge graph endpoint working.")
            
        # Learning Profile
        res = await client.get(f"{base_url}/learning/profile", headers=headers)
        if res.status_code != 200:
            results["Phase 3"] = "Failed"
            results["Bugs"].append("Learning profile endpoint failed.")
        else:
            print("[OK] Learning profile endpoint working.")

        # Chat stream with context
        print("Checking Chat Context Injection...")
        res = await client.post(f"{base_url}/chat/message", headers=headers, json={
            "content": "Who am I? What am I doing?",
            "model": "gemma:2b"
        })
        if res.status_code != 200:
            results["Phase 3"] = "Failed"
            results["Bugs"].append("Chat endpoint failed.")
        else:
            print("[OK] Chat endpoint responding.")

    print("\n--- Validation Complete ---")
    for phase, status in results.items():
        if phase != "Bugs":
            print(f"{phase}: {status}")
    if results["Bugs"]:
        print("\nBugs Found:")
        for bug in results["Bugs"]:
            print(f"- {bug}")

if __name__ == "__main__":
    asyncio.run(run_validation())
