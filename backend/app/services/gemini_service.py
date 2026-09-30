import os
import re
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional, Tuple
import google.generativeai as genai
from app.config import settings

logger = logging.getLogger("uvicorn.error")

class GeminiService:
    """
    Google Gemini AI Service for Meeting Intelligence:
    - Primary summarization engine (Purpose, Discussion Points, Decisions, Next Steps)
    - Action item extraction with ownership, deadlines, and priorities
    - Multi-model fallback (gemini-3.8-flash -> gemini-2.5-flash -> gemini-1.5-flash)
    - Fallback-ready: Raises or returns None if unavailable so Local NLP Engine takes over.
    """
    def __init__(self):
        self.api_key = (
            settings.GEMINI_API_KEY
            or os.environ.get("GEMINI_API_KEY", "")
            or os.environ.get("GOOGLE_API_KEY", "")
        ).strip()
        
        self.primary_model_name = settings.GEMINI_MODEL or "gemini-3.8-flash"
        # Candidates for fallback if a model is deprecated or unavailable in user region
        self.candidate_models = [
            self.primary_model_name,
            "gemini-3.8-flash",
            "gemini-2.5-flash",
            "gemini-1.5-flash",
            "gemini-2.0-flash",
            "gemini-flash"
        ]
        # Remove duplicates while preserving order
        seen = set()
        self.candidate_models = [m for m in self.candidate_models if not (m in seen or seen.add(m))]

    def is_available(self) -> bool:
        """Returns True if a valid Gemini API key is present."""
        self.api_key = (
            settings.GEMINI_API_KEY
            or os.environ.get("GEMINI_API_KEY", "")
            or os.environ.get("GOOGLE_API_KEY", "")
        ).strip()
        return bool(self.api_key)

    def _configure(self):
        if not self.is_available():
            raise ValueError("GEMINI_API_KEY is not configured in .env or environment settings.")
        genai.configure(api_key=self.api_key)

    async def generate_summary(
        self,
        text: str,
        title: str = "Meeting Summary",
        style: str = "executive"
    ) -> Tuple[Dict[str, Any], str]:
        """
        Step 4 & 5: Generates structured summary using Google Gemini AI.
        Provides:
        1. Purpose / Executive Overview
        2. Key Discussion Points
        3. Decisions
        4. Action Items & Deliverables
        5. Next Steps
        
        Returns: (structured_data_dict, model_display_name)
        Raises: Exception if Gemini fails (triggering Step 6 Local NLP Engine Fallback).
        """
        self._configure()
        truncated_text = text[:15000].strip()

        style_instruction = {
            "executive": "Deliver a high-level executive summary focused on strategic decisions, overarching purpose, and key outcomes.",
            "detailed": "Deliver an in-depth breakdown capturing detailed technical arguments, deliberations, and comprehensive context.",
            "action_focused": "Highlight tangible deliverables, tactical next steps, task ownership, and strict project deadlines."
        }.get(style.lower(), "Provide a balanced, professional executive summary.")

        prompt = f"""You are an enterprise AI meeting intelligence engine.
Summarize the following meeting transcript / document text and extract structured intelligence.

Meeting / Document Title: {title}
Summary Style: {style} ({style_instruction})

Transcript / Content:
{truncated_text}

Provide:
1. Purpose & Executive Overview
2. Key Discussion Points
3. Decisions
4. Action Items
5. Next Steps

Return ONLY a valid JSON object matching this schema exactly without any markdown fences, backticks, or extra commentary:
{{
  "overview": "Clear statement of meeting purpose, scope, and executive summary (3-4 sentences).",
  "key_points": [
    "Key discussion topic or insight 1",
    "Key discussion topic or insight 2"
  ],
  "decisions": [
    "Decision or consensus reached 1",
    "Decision or consensus reached 2"
  ],
  "action_items": [
    {{
      "task": "Specific actionable task description",
      "owner": "Assigned Person or Role (e.g. David, Frontend Team, Core Team)",
      "deadline": "Clear timeframe or date (e.g. Friday EOD, Next Sprint, Tomorrow)",
      "priority": "High"
    }}
  ],
  "next_steps": [
    "Milestone or upcoming follow-up item 1",
    "Milestone or upcoming follow-up item 2"
  ]
}}
"""

        last_error = None
        for model_name in self.candidate_models:
            try:
                logger.info(f"[GeminiService] Generating summary with model '{model_name}'...")
                model = genai.GenerativeModel(model_name)
                response = await asyncio.to_thread(model.generate_content, prompt)
                
                raw_text = response.text.strip()
                data = self._parse_json_or_text(raw_text, title, text)
                logger.info(f"[GeminiService] Successfully generated summary using Gemini ({model_name})")
                return data, f"Google Gemini ({model_name})"
            except Exception as e:
                err_str = str(e)
                logger.warning(f"[GeminiService] Attempt with model '{model_name}' failed: {err_str}")
                last_error = e
                # If model is deprecated or not found (404), try next candidate
                if "404" in err_str or "not found" in err_str.lower() or "deprecated" in err_str.lower():
                    continue
                # If it's a quota or rate limit error, break to fallback immediately
                break

        raise last_error or RuntimeError("Gemini AI failed across all candidate models.")

    async def extract_action_items(
        self,
        text: str,
        title: str = "Meeting Session"
    ) -> Tuple[List[Dict[str, Any]], str]:
        """
        Extracts action items (task, assigned_to, deadline, priority) using Gemini.
        Returns: (items_list, model_display_name)
        Raises: Exception if Gemini fails (triggering Local NLP Fallback).
        """
        self._configure()
        truncated_text = text[:15000].strip()

        prompt = f"""You are an enterprise AI meeting intelligence engine.
Analyze the following meeting transcript and extract ALL concrete action items, deliverables, and assignments.

Title: {title}
Transcript:
{truncated_text}

For each action item, determine:
- task: Actionable description of what needs to be done
- assigned_to: The specific person or team responsible (or 'Unassigned')
- deadline: Target timeframe or date mentioned (e.g. Friday EOD, Tomorrow, Next Week)
- priority: 'High' | 'Medium' | 'Low'

Return ONLY a valid JSON object matching this schema without markdown fences:
{{
  "action_items": [
    {{
      "task": "Task description",
      "assigned_to": "Person or Team name",
      "deadline": "Timeframe",
      "priority": "High"
    }}
  ]
}}
"""
        last_error = None
        for model_name in self.candidate_models:
            try:
                logger.info(f"[GeminiService] Extracting action items with model '{model_name}'...")
                model = genai.GenerativeModel(model_name)
                response = await asyncio.to_thread(model.generate_content, prompt)
                
                raw_text = response.text.strip()
                items = self._parse_action_items_json(raw_text)
                logger.info(f"[GeminiService] Extracted {len(items)} action items using Gemini ({model_name})")
                return items, f"Google Gemini ({model_name})"
            except Exception as e:
                err_str = str(e)
                logger.warning(f"[GeminiService] Action item extraction failed on '{model_name}': {err_str}")
                last_error = e
                if "404" in err_str or "not found" in err_str.lower() or "deprecated" in err_str.lower():
                    continue
                break

        raise last_error or RuntimeError("Gemini AI action item extraction failed across all models.")

    def _parse_json_or_text(self, raw_text: str, title: str, original_text: str) -> Dict[str, Any]:
        """Cleans and parses JSON output from Gemini, handling markdown code fences."""
        cleaned = raw_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            data = json.loads(cleaned)
            return self._normalize_summary_data(data, title)
        except Exception:
            # Fallback regex extraction if Gemini returned semi-formatted text
            return self._extract_sections_from_raw_text(raw_text, title)

    def _parse_action_items_json(self, raw_text: str) -> List[Dict[str, Any]]:
        """Parses action items JSON."""
        cleaned = raw_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        data = json.loads(cleaned)
        raw_items = data.get("action_items", [])
        normalized = []
        for item in raw_items:
            if isinstance(item, dict):
                prio = item.get("priority", "Medium").capitalize()
                if prio not in ["High", "Medium", "Low"]:
                    prio = "Medium"
                normalized.append({
                    "task": item.get("task", "Action item"),
                    "assigned_to": item.get("assigned_to") or item.get("owner") or "Unassigned",
                    "deadline": item.get("deadline", "Upcoming"),
                    "priority": prio
                })
        return normalized

    def _normalize_summary_data(self, data: Dict[str, Any], title: str) -> Dict[str, Any]:
        """Validates and ensures all required fields exist."""
        overview = data.get("overview") or data.get("purpose") or f"Executive summary covering key topics discussed during {title}."
        key_points = data.get("key_points") or data.get("key_discussion_points") or [f"Primary discussion regarding {title}"]
        decisions = data.get("decisions") or ["Consensus reached on core milestones."]
        
        raw_actions = data.get("action_items") or []
        action_items = []
        for item in raw_actions:
            if isinstance(item, dict):
                prio = item.get("priority", "Medium").capitalize()
                if prio not in ["High", "Medium", "Low"]:
                    prio = "Medium"
                action_items.append({
                    "task": item.get("task") or "Review discussion points",
                    "owner": item.get("owner") or item.get("assigned_to") or "Unassigned",
                    "deadline": item.get("deadline") or "Next Sprint",
                    "status": item.get("status") or "Pending",
                    "priority": prio
                })
            elif isinstance(item, str):
                action_items.append({
                    "task": item,
                    "owner": "Team",
                    "deadline": "Upcoming",
                    "status": "Pending",
                    "priority": "Medium"
                })

        next_steps = data.get("next_steps") or ["Schedule follow-up sync to review action item progress."]

        return {
            "overview": overview,
            "key_points": key_points,
            "decisions": decisions,
            "action_items": action_items,
            "next_steps": next_steps
        }

    def _extract_sections_from_raw_text(self, text: str, title: str) -> Dict[str, Any]:
        """Heuristic parser if Gemini returns formatted markdown or plain text."""
        overview = f"Executive summary covering key topics discussed during {title}."
        key_points = []
        decisions = []
        action_items = []
        next_steps = []

        lines = [line.strip() for line in text.split("\n") if line.strip()]
        current_section = "overview"

        for line in lines:
            lower = line.lower()
            if "purpose" in lower or "overview" in lower:
                current_section = "overview"
                continue
            elif "key discussion" in lower or "key points" in lower or "discussion points" in lower:
                current_section = "key_points"
                continue
            elif "decision" in lower:
                current_section = "decisions"
                continue
            elif "action item" in lower:
                current_section = "action_items"
                continue
            elif "next step" in lower:
                current_section = "next_steps"
                continue

            cleaned_line = re.sub(r'^[#*\-\d.]+\s*', '', line).strip()
            if not cleaned_line:
                continue

            if current_section == "overview":
                overview = cleaned_line
            elif current_section == "key_points":
                key_points.append(cleaned_line)
            elif current_section == "decisions":
                decisions.append(cleaned_line)
            elif current_section == "action_items":
                action_items.append({
                    "task": cleaned_line,
                    "owner": "Team",
                    "deadline": "Upcoming",
                    "status": "Pending",
                    "priority": "Medium"
                })
            elif current_section == "next_steps":
                next_steps.append(cleaned_line)

        return {
            "overview": overview,
            "key_points": key_points or [f"Core discussion on {title}"],
            "decisions": decisions or ["Milestones established and agreed upon."],
            "action_items": action_items or [{"task": f"Follow up on {title}", "owner": "Team", "deadline": "Next Sprint", "status": "Pending", "priority": "Medium"}],
            "next_steps": next_steps or ["Verify completion of agreed milestones."]
        }

gemini_service = GeminiService()
