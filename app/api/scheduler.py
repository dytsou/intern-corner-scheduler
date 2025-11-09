import sys
import os

# Add parent directory to path to import scheduler from python package
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv
from python.scheduler import schedule

# Load environment variables
load_dotenv()

router = APIRouter()


class PairInput(BaseModel):
    """Pair input model"""
    u: int = Field(..., ge=1, description="First participant ID")
    v: int = Field(..., ge=1, description="Second participant ID")


class ScheduleRequest(BaseModel):
    """Schedule request model"""
    participants: int = Field(..., ge=1, description="Number of participants (1..a)")
    tables: int = Field(..., ge=1, description="Number of tables (1..b)")
    rounds: int = Field(..., ge=1, description="Number of rounds")
    same_once_pairs: List[PairInput] = Field(default_factory=list, description="Pairs that should meet exactly once")
    never_together_pairs: List[PairInput] = Field(default_factory=list, description="Pairs that must never be together")
    time_limit_seconds: Optional[int] = Field(default=None, ge=1, le=300, description="Solver time limit in seconds")

    @field_validator('tables')
    @classmethod
    def validate_tables(cls, v, info):
        participants = info.data.get('participants')
        if participants and v > participants:
            raise ValueError(f"Number of tables ({v}) cannot exceed number of participants ({participants})")
        return v


class ScheduleResponse(BaseModel):
    """Schedule response model"""
    participants: int
    tables: int
    rounds: int
    table_sizes: List[int]
    table_sizes_per_round: List[List[int]]
    assignments: List[List[List[int]]]
    satisfied_same_once_pairs: List[List[int]]
    unsatisfied_same_once_pairs: List[List[int]]
    never_together_violations: List[List[int]]
    objective_value: int
    solver_status: str


@router.post("/schedule", response_model=ScheduleResponse)
async def create_schedule(request: ScheduleRequest):
    """
    Create a round-table schedule based on the provided constraints.

    - **participants**: Number of participants (1..a)
    - **tables**: Number of tables (1..b); participants 1..b are hosts
    - **rounds**: Number of rounds
    - **same_once_pairs**: Pairs that should be seated together exactly once
    - **never_together_pairs**: Pairs that must never be seated together
    - **time_limit_seconds**: Maximum time for the solver (default: 60)
    """
    try:
        # Convert PairInput to tuples
        same_once = [(p.u, p.v) for p in request.same_once_pairs]
        never_together = [(p.u, p.v) for p in request.never_together_pairs]

        # Get time limit from request or environment variable
        default_time_limit = int(os.getenv("DEFAULT_TIME_LIMIT_SECONDS", "60"))
        time_limit = request.time_limit_seconds or default_time_limit

        # Call the scheduler
        result = schedule(
            num_participants=request.participants,
            num_tables=request.tables,
            num_rounds=request.rounds,
            same_once_pairs=same_once,
            never_together_pairs=never_together,
            time_limit_seconds=time_limit,
        )

        return ScheduleResponse(**result)
    except AssertionError as e:
        raise HTTPException(status_code=400, detail=f"Invalid input constraints: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating schedule: {str(e)}")
