"""Tests for the FastAPI endpoints"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Create a test client"""
    return TestClient(app)


class TestRootEndpoint:
    """Tests for root endpoint"""

    def test_root(self, client):
        """Test root endpoint returns correct information"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Round-Table Scheduler API"
        assert data["version"] == "1.0.0"
        assert "docs" in data


class TestHealthEndpoint:
    """Tests for health check endpoint"""

    def test_health(self, client):
        """Test health endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestScheduleEndpoint:
    """Tests for schedule endpoint"""

    def test_schedule_basic(self, client):
        """Test basic schedule request"""
        request_data = {
            "participants": 6,
            "tables": 2,
            "rounds": 2,
            "same_once_pairs": [],
            "never_together_pairs": []
        }
        response = client.post("/api/schedule", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["participants"] == 6
        assert data["tables"] == 2
        assert data["rounds"] == 2
        assert len(data["assignments"]) == 2
        assert "solver_status" in data

    def test_schedule_with_constraints(self, client):
        """Test schedule with constraints"""
        request_data = {
            "participants": 6,
            "tables": 2,
            "rounds": 3,
            "same_once_pairs": [{"u": 3, "v": 5}],
            "never_together_pairs": [{"u": 4, "v": 6}]
        }
        response = client.post("/api/schedule", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["participants"] == 6
        assert len(data["assignments"]) == 3

    def test_schedule_with_time_limit(self, client):
        """Test schedule with custom time limit"""
        request_data = {
            "participants": 4,
            "tables": 2,
            "rounds": 2,
            "same_once_pairs": [],
            "never_together_pairs": [],
            "time_limit_seconds": 5
        }
        response = client.post("/api/schedule", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert data["solver_status"] in ["OPTIMAL", "FEASIBLE", "UNKNOWN"]

    def test_schedule_validation_errors(self, client):
        """Test validation errors"""
        # Invalid: tables > participants
        request_data = {
            "participants": 3,
            "tables": 5,
            "rounds": 1,
            "same_once_pairs": [],
            "never_together_pairs": []
        }
        response = client.post("/api/schedule", json=request_data)
        assert response.status_code == 422  # Validation error

    def test_schedule_invalid_participant_id(self, client):
        """Test with invalid participant ID in pairs"""
        request_data = {
            "participants": 4,
            "tables": 2,
            "rounds": 1,
            "same_once_pairs": [{"u": 1, "v": 10}],  # 10 > 4
            "never_together_pairs": []
        }
        response = client.post("/api/schedule", json=request_data)
        # Should still work, invalid pairs are filtered
        assert response.status_code == 200

    def test_schedule_missing_required_fields(self, client):
        """Test missing required fields"""
        request_data = {
            "participants": 4,
            # Missing tables and rounds
        }
        response = client.post("/api/schedule", json=request_data)
        assert response.status_code == 422

    def test_schedule_negative_values(self, client):
        """Test negative values are rejected"""
        request_data = {
            "participants": -1,
            "tables": 2,
            "rounds": 1,
            "same_once_pairs": [],
            "never_together_pairs": []
        }
        response = client.post("/api/schedule", json=request_data)
        assert response.status_code == 422

    def test_schedule_zero_values(self, client):
        """Test zero values are rejected"""
        request_data = {
            "participants": 0,
            "tables": 2,
            "rounds": 1,
            "same_once_pairs": [],
            "never_together_pairs": []
        }
        response = client.post("/api/schedule", json=request_data)
        assert response.status_code == 422
