import asyncio
from services.db_service import supabase

async def check():
    res = supabase.table("news").select("*").limit(1).execute()
    print(res.data)

if __name__ == "__main__":
    asyncio.run(check())
