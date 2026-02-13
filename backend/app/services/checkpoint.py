"""
Checkpoint Management Service.
Handles saving and loading of intermediate results for resumable processing.
"""
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List
from collections import defaultdict

from app.config import get_settings

logger = logging.getLogger(__name__)


class CheckpointManager:
    """Manages checkpoint saving and loading for multi-agent pipeline."""

    def __init__(
        self,
        pdf_path: str,
        sector: str,
        provider: str,
        model: str,
        checkpoint_dir: Optional[str] = None,
        use_checkpoints: bool = True
    ):
        """
        Initialize checkpoint manager.

        Args:
            pdf_path: Path to the PDF being processed
            sector: Sector being analyzed
            provider: LLM provider being used
            model: Model name being used
            checkpoint_dir: Directory for checkpoints (default from settings)
            use_checkpoints: Master switch for checkpoint usage
        """
        settings = get_settings()
        self.checkpoint_dir = Path(checkpoint_dir or settings.checkpoint_dir)
        self.checkpoint_dir.mkdir(exist_ok=True)

        self.pdf_path = pdf_path
        self.pdf_name = Path(pdf_path).stem
        self.sector = sector
        self.provider = provider
        self.model = model
        self.use_checkpoints = use_checkpoints

        logger.info(f"Checkpoint manager initialized for {self.pdf_name} ({sector})")

    def get_checkpoint_path(self, agent_name: str) -> Path:
        """
        Generate timestamped checkpoint file path for an agent.

        Args:
            agent_name: Name of the agent (e.g., 'agent1', 'agent2', 'agent3_1')

        Returns:
            Path to timestamped checkpoint file
        """
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"{agent_name}_{self.pdf_name}_{self.sector}_{timestamp}.json"
        return self.checkpoint_dir / filename

    def find_latest_checkpoint(self, agent_name: str) -> Optional[Path]:
        """
        Find the most recent checkpoint for a given agent.

        Args:
            agent_name: Name of the agent

        Returns:
            Path to the latest checkpoint file or None
        """
        pattern = f"{agent_name}_{self.pdf_name}_{self.sector}_*.json"
        matching_files = list(self.checkpoint_dir.glob(pattern))

        if not matching_files:
            return None

        return max(matching_files, key=lambda p: p.stat().st_mtime)

    def save_checkpoint(self, agent_name: str, data: Dict[str, Any]) -> Path:
        """
        Save agent output to timestamped checkpoint file.

        Args:
            agent_name: Name of the agent
            data: Data to save

        Returns:
            Path to saved checkpoint
        """
        checkpoint_path = self.get_checkpoint_path(agent_name)

        checkpoint_data = {
            "timestamp": datetime.now().isoformat(),
            "provider": self.provider,
            "model": self.model,
            "pdf_path": self.pdf_path,
            "sector": self.sector,
            "data": data
        }

        with open(checkpoint_path, 'w', encoding='utf-8') as f:
            json.dump(checkpoint_data, f, ensure_ascii=False, indent=2)

        logger.info(f"Checkpoint saved: {checkpoint_path.name}")
        return checkpoint_path

    def load_checkpoint(self, agent_name: str) -> Optional[Dict[str, Any]]:
        """
        Load the latest checkpoint for an agent.

        Args:
            agent_name: Name of the agent

        Returns:
            Loaded data or None if checkpoint doesn't exist
        """
        if not self.use_checkpoints:
            return None

        checkpoint_path = self.find_latest_checkpoint(agent_name)

        if checkpoint_path is None:
            return None

        try:
            with open(checkpoint_path, 'r', encoding='utf-8') as f:
                checkpoint_data = json.load(f)

            logger.info(f"Loaded checkpoint: {checkpoint_path.name}")
            return checkpoint_data["data"]

        except Exception as e:
            logger.warning(f"Failed to load checkpoint: {e}")
            return None

    def count_checkpoints(self) -> Dict[str, int]:
        """
        Count checkpoints for current PDF/sector combination.

        Returns:
            Dict with checkpoint counts per agent
        """
        all_agents = (
            ["agent1", "agent2"] +
            [f"agent3_{i}" for i in range(1, 12)] +
            [f"agent4_{i}" for i in range(1, 4)] +
            ["agent5"]
        )

        counts = {}
        for agent in all_agents:
            pattern = f"{agent}_{self.pdf_name}_{self.sector}_*.json"
            matching_files = list(self.checkpoint_dir.glob(pattern))
            counts[agent] = len(matching_files)

        return counts

    def is_new_analysis(self) -> bool:
        """
        Check if this is a new PDF analysis (no checkpoints exist).

        Returns:
            True if no checkpoints exist for the current PDF
        """
        counts = self.count_checkpoints()
        return sum(counts.values()) == 0

    def get_status(self) -> Dict[str, Any]:
        """
        Get checkpoint status for current PDF/sector.

        Returns:
            Status information including counts and completion state
        """
        counts = self.count_checkpoints()
        total = sum(counts.values())

        agent3_complete = all(counts.get(f"agent3_{i}", 0) > 0 for i in range(1, 12))
        agent4_complete = all(counts.get(f"agent4_{i}", 0) > 0 for i in range(1, 4))

        return {
            "pdf_name": self.pdf_name,
            "sector": self.sector,
            "is_new_analysis": total == 0,
            "total_checkpoints": total,
            "agent1_complete": counts.get("agent1", 0) > 0,
            "agent2_complete": counts.get("agent2", 0) > 0,
            "agent3_complete": agent3_complete,
            "agent3_progress": f"{sum(1 for i in range(1, 12) if counts.get(f'agent3_{i}', 0) > 0)}/11",
            "agent4_complete": agent4_complete,
            "agent4_progress": f"{sum(1 for i in range(1, 4) if counts.get(f'agent4_{i}', 0) > 0)}/3",
            "agent5_complete": counts.get("agent5", 0) > 0
        }

    def cleanup_old_checkpoints(self, keep_latest: int = 3) -> int:
        """
        Delete old checkpoints, keeping only the N most recent.

        Args:
            keep_latest: Number of recent checkpoints to keep

        Returns:
            Number of deleted checkpoints
        """
        all_agents = (
            ["agent1", "agent2"] +
            [f"agent3_{i}" for i in range(1, 12)] +
            [f"agent4_{i}" for i in range(1, 4)] +
            ["agent5"]
        )

        total_deleted = 0

        for agent in all_agents:
            pattern = f"{agent}_{self.pdf_name}_{self.sector}_*.json"
            matching_files = sorted(
                self.checkpoint_dir.glob(pattern),
                key=lambda p: p.stat().st_mtime,
                reverse=True
            )

            for cp in matching_files[keep_latest:]:
                cp.unlink()
                logger.info(f"Deleted old checkpoint: {cp.name}")
                total_deleted += 1

        return total_deleted

    def clear_all_checkpoints(self) -> int:
        """
        Delete all checkpoints for current PDF/sector.

        Returns:
            Number of deleted checkpoints
        """
        pattern = f"*_{self.pdf_name}_{self.sector}_*.json"
        matching_files = list(self.checkpoint_dir.glob(pattern))

        for cp in matching_files:
            cp.unlink()
            logger.info(f"Deleted checkpoint: {cp.name}")

        return len(matching_files)

    def list_all_checkpoints(self) -> Dict[str, List[Dict]]:
        """
        List all checkpoints grouped by agent.

        Returns:
            Dict mapping agent names to list of checkpoint info
        """
        checkpoints = list(self.checkpoint_dir.glob("*.json"))
        grouped = defaultdict(list)

        for cp in sorted(checkpoints):
            parts = cp.name.split('_')
            if parts[0] in ["agent3", "agent4"] and len(parts) > 1 and parts[1].isdigit():
                agent = f"{parts[0]}_{parts[1]}"
            else:
                agent = parts[0]

            try:
                with open(cp, 'r') as f:
                    data = json.load(f)
                grouped[agent].append({
                    "filename": cp.name,
                    "timestamp": data.get("timestamp", "unknown"),
                    "provider": data.get("provider", "unknown"),
                    "model": data.get("model", "unknown")
                })
            except Exception:
                grouped[agent].append({
                    "filename": cp.name,
                    "timestamp": "unknown",
                    "provider": "unknown",
                    "model": "unknown",
                    "error": "corrupted"
                })

        return dict(grouped)
