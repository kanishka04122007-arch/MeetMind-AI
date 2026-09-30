import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

logger = logging.getLogger("uvicorn.error")

class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_instance = Database()

async def get_database() -> AsyncIOMotorDatabase:
    return db_instance.db

def get_users_collection():
    return db_instance.db["users"]

def get_meetings_collection():
    return db_instance.db["meetings"]

def get_documents_collection():
    return db_instance.db["documents"]

# Alias for PDF collection matching Module 2 prompt
get_pdfs_collection = get_documents_collection

def get_files_collection():
    return db_instance.db["files"]

def get_summaries_collection():
    return db_instance.db["summaries"]

def get_action_items_collection():
    return db_instance.db["action_items"]

def get_extracted_text_collection():
    return db_instance.db["extracted_text"]

def get_transcripts_collection():
    return db_instance.db["transcripts"]

async def connect_to_mongo():
    logger.info(f"Connecting to MongoDB at {settings.MONGO_URI}...")
    try:
        db_instance.client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
        db_instance.db = db_instance.client[settings.DB_NAME]
        
        # Ping the database
        await db_instance.client.admin.command('ping')
        logger.info(f"Successfully connected to MongoDB database '{settings.DB_NAME}'")
        
        # Ensure unique index on email
        users_col = db_instance.db["users"]
        await users_col.create_index("email", unique=True)
        logger.info("Unique index on 'email' verified/created.")

        # Ensure index on files collection (Module 1 requirement)
        files_col = db_instance.db["files"]
        await files_col.create_index("file_id")
        await files_col.create_index([("user_id", 1), ("uploaded_at", -1)])
        logger.info("Index on 'files' collection verified/created.")

        # Ensure index on meetings collection
        meetings_col = db_instance.db["meetings"]
        await meetings_col.create_index([("user_id", 1), ("created_at", -1)])
        logger.info("Index on 'meetings' collection verified/created.")

        # Ensure index on documents / pdf collection
        documents_col = db_instance.db["documents"]
        await documents_col.create_index([("user_id", 1), ("uploadDate", -1)])
        logger.info("Index on 'documents' (PDF) collection verified/created.")

        # Ensure index on extracted_text collection (Module 2 & 3 requirement)
        extracted_text_col = db_instance.db["extracted_text"]
        await extracted_text_col.create_index("file_id")
        await extracted_text_col.create_index([("user_id", 1), ("createdAt", -1)])
        logger.info("Index on 'extracted_text' collection verified/created.")

        # Ensure index on transcripts collection (Module 2 & 3 requirement)
        transcripts_col = db_instance.db["transcripts"]
        await transcripts_col.create_index("file_id")
        await transcripts_col.create_index([("user_id", 1), ("createdAt", -1)])
        logger.info("Index on 'transcripts' collection verified/created.")

        # Ensure index on summaries collection (Module 3)
        summaries_col = db_instance.db["summaries"]
        await summaries_col.create_index([("user_id", 1), ("created_at", -1)])
        await summaries_col.create_index([("source_id", 1)])
        await summaries_col.create_index([("file_id", 1)])
        logger.info("Index on 'summaries' collection verified/created.")

        # Ensure index on action_items collection (Module 4)
        tasks_col = db_instance.db["action_items"]
        await tasks_col.create_index([("user_id", 1), ("created_at", -1)])
        await tasks_col.create_index([("user_id", 1), ("status", 1)])
        await tasks_col.create_index([("source_id", 1)])
        logger.info("Index on 'action_items' collection verified/created.")

        # Automatic synchronization: backfill files, extracted_text, and transcripts from existing data
        try:
            async for doc in documents_col.find():
                fid = str(doc.get("_id"))
                fname = doc.get("fileName") or doc.get("filename") or doc.get("title") or "document.pdf"
                uid = str(doc.get("user_id", ""))
                dt = doc.get("created_at") or doc.get("uploadDate") or ""
                txt = doc.get("extracted_text") or ""
                await files_col.update_one(
                    {"file_id": fid},
                    {"$setOnInsert": {
                        "_id": fid,
                        "file_id": fid,
                        "file_name": fname,
                        "fileName": fname,
                        "file_type": "pdf",
                        "fileType": "pdf",
                        "uploaded_at": dt,
                        "uploadedAt": dt,
                        "user_id": uid,
                        "status": "Completed"
                    }},
                    upsert=True
                )
                if txt:
                    await extracted_text_col.update_one(
                        {"file_id": fid},
                        {"$set": {
                            "file_id": fid,
                            "file_name": fname,
                            "fileName": fname,
                            "text": txt,
                            "created_at": dt,
                            "createdAt": dt,
                            "user_id": uid
                        }},
                        upsert=True
                    )

            async for mtg in meetings_col.find():
                mid = str(mtg.get("_id"))
                mfname = mtg.get("fileName") or mtg.get("filename") or mtg.get("title") or "meeting.mp3"
                muid = str(mtg.get("user_id", ""))
                mdt = mtg.get("created_at") or mtg.get("uploadDate") or ""
                mtr = mtg.get("transcript_text") or ""
                await files_col.update_one(
                    {"file_id": mid},
                    {"$setOnInsert": {
                        "_id": mid,
                        "file_id": mid,
                        "file_name": mfname,
                        "fileName": mfname,
                        "file_type": "audio",
                        "fileType": "audio",
                        "uploaded_at": mdt,
                        "uploadedAt": mdt,
                        "user_id": muid,
                        "status": "Completed"
                    }},
                    upsert=True
                )
                if mtr:
                    await transcripts_col.update_one(
                        {"file_id": mid},
                        {"$set": {
                            "file_id": mid,
                            "file_name": mfname,
                            "fileName": mfname,
                            "transcript": mtr,
                            "text": mtr,
                            "created_at": mdt,
                            "createdAt": mdt,
                            "user_id": muid
                        }},
                        upsert=True
                    )
        except Exception as sync_err:
            logger.warning(f"Non-critical synchronization notice: {sync_err}")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        pass

async def close_mongo_connection():
    if db_instance.client:
        logger.info("Closing MongoDB connection...")
        db_instance.client.close()
        logger.info("MongoDB connection closed.")
