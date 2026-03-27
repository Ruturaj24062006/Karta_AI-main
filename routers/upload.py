import asyncio
from datetime import datetime

from fastapi import APIRouter, Form, File, UploadFile, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from models.company import Company
from models.analysis import Analysis
from models.user import User
from utils.file_handler import save_upload_file, get_file_size_mb
from routers.ws import manager
from services import ocr_service
from services.activity_log_service import activity_log_service
from services.auth_security import get_current_user_optional

router = APIRouter()


async def _run_phase1_smart_ingestor(analysis_id: int, file_paths: list[str]) -> None:
    """Runs Phase-1 Smart Data Ingestor (OCR) right after upload."""
    db = SessionLocal()
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        db.close()
        return

    try:
        # Keep status pending so /api/analyze can still start the full pipeline (Phase 3+).
        analysis.analysis_status = "pending"
        analysis.progress = 10.0
        db.commit()

        await manager.send_personal_message(
            {
                "step_number": 1,
                "step_name": "Upload Complete",
                "step_detail": "Documents received and queued for Smart Data Ingestor",
                "percentage": 10,
                "status": "completed",
                "timestamp": datetime.now().isoformat(),
            },
            str(analysis_id),
        )

        loop = asyncio.get_running_loop()
        ocr_result = await asyncio.to_thread(
            ocr_service.extract_financial_data,
            file_paths,
            str(analysis_id),
            loop,
        )

        if ocr_result.get("error"):
            analysis.analysis_status = "failed"
            analysis.failure_reason = ocr_result.get("error_message") or ocr_result.get("error")
            analysis.progress = 100.0
            db.commit()

            await manager.send_personal_message(
                {
                    "step_number": -1,
                    "step_name": "Phase 1 Failed",
                    "step_detail": analysis.failure_reason or "Smart Data Ingestor failed",
                    "percentage": 100,
                    "status": "failed",
                    "timestamp": datetime.now().isoformat(),
                },
                str(analysis_id),
            )
            return

        if ocr_result.get("error_detected"):
            # Soft OCR failure: keep pipeline alive and let later stages use fallbacks/defaults.
            analysis.data_quality_score = ocr_result.get("data_quality_score", 0.0)
            analysis.analysis_status = "pending"
            analysis.progress = 20.0
            analysis.failure_reason = None
            db.commit()

            await manager.send_personal_message(
                {
                    "step_number": 2,
                    "step_name": "PdfTable OCR Engine",
                    "step_detail": ocr_result.get("error_message", "Document format is atypical. Proceeding with fallback extraction."),
                    "percentage": 20,
                    "status": "completed",
                    "timestamp": datetime.now().isoformat(),
                },
                str(analysis_id),
            )
            return

        analysis.data_quality_score = ocr_result.get("data_quality_score", 0.0)
        analysis.analysis_status = "pending"
        analysis.progress = 30.0
        db.commit()

        await manager.send_personal_message(
            {
                "step_number": 2,
                "step_name": "PdfTable OCR Engine",
                "step_detail": "Phase 1 complete. PaddleOCR extraction output is ready.",
                "percentage": 30,
                "status": "completed",
                "timestamp": datetime.now().isoformat(),
            },
            str(analysis_id),
        )

    except Exception as e:
        db.rollback()
        analysis.analysis_status = "failed"
        analysis.failure_reason = str(e)
        analysis.progress = 100.0
        db.commit()
        await manager.send_personal_message(
            {
                "step_number": -1,
                "step_name": "Phase 1 Failed",
                "step_detail": str(e),
                "percentage": 100,
                "status": "failed",
                "timestamp": datetime.now().isoformat(),
            },
            str(analysis_id),
        )
    finally:
        db.close()

@router.post("/upload")
@router.post("/api/upload")
async def upload_files(
    background_tasks: BackgroundTasks,
    company_name: str = Form(...),
    cin_number: str = Form(...),
    gstin_number: str = Form(...),
    pan_number: str = Form(...),
    loan_amount: float = Form(...),
    balance_sheet: UploadFile = File(...),
    bank_statement: UploadFile = File(...),
    gst_filing: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    try:
        # Save the uploaded files to disk
        bs_path   = save_upload_file(balance_sheet)
        bs_size   = get_file_size_mb(balance_sheet)
        bank_path = save_upload_file(bank_statement)
        bank_size = get_file_size_mb(bank_statement)
        gst_path  = save_upload_file(gst_filing)
        gst_size  = get_file_size_mb(gst_filing)

        # --- UPSERT: reuse existing company record if CIN already exists ---
        existing = db.query(Company).filter(Company.cin_number == cin_number).first()

        if existing:
            # Update file paths and loan amount in case they changed
            existing.bs_file_path         = bs_path
            existing.bank_file_path       = bank_path
            existing.gst_file_path        = gst_path
            existing.loan_amount_requested = loan_amount
            existing.status               = "pending"
            db.commit()
            db.refresh(existing)
            company = existing
        else:
            company = Company(
                company_name=company_name,
                cin_number=cin_number,
                gstin_number=gstin_number,
                pan_number=pan_number,
                loan_amount_requested=loan_amount,
                bs_file_path=bs_path,
                bank_file_path=bank_path,
                gst_file_path=gst_path,
                status="pending"
            )
            db.add(company)
            db.commit()
            db.refresh(company)

        # Always create a fresh analysis for each submission
        new_analysis = Analysis(
            company_id=company.id,
            analysis_status="pending"
        )
        db.add(new_analysis)
        db.commit()
        db.refresh(new_analysis)

        # Unique task id for frontend tracking (same key used by /ws/analysis/{task_id}).
        task_id = str(new_analysis.id)

        # Trigger Phase-1 OCR pipeline immediately after upload.
        background_tasks.add_task(
            _run_phase1_smart_ingestor,
            new_analysis.id,
            [bs_path, bank_path, gst_path],
        )

        actor = current_user.username if current_user else "unknown"
        activity_log_service.log(
            actor,
            "upload",
            f"Uploaded financial documents for {company.company_name} (analysis_id={new_analysis.id})",
        )

        return {
            "success": True,
            "task_id": task_id,
            "company_id": company.id,
            "analysis_id": new_analysis.id,
            "message": "Files uploaded. Phase 1 Smart Data Ingestor started.",
            "ws_channel": f"/ws/analysis/{task_id}",
            "uploaded_files": [
                {"name": balance_sheet.filename, "size_mb": round(bs_size, 2)},
                {"name": bank_statement.filename, "size_mb": round(bank_size, 2)},
                {"name": gst_filing.filename,     "size_mb": round(gst_size, 2)},
            ],
            "next_step": f"Subscribe to /ws/analysis/{task_id} and track progress with task_id {task_id}"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

