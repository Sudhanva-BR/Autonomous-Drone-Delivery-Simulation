"""
Tests for the simulator app.
"""
import json
import subprocess
from unittest.mock import patch, MagicMock

import pytest
from django.test import Client


@pytest.fixture
def client():
    """Django test client fixture."""
    return Client()


@pytest.mark.django_db
class TestRunSimulation:
    """Test cases for the /api/run/ endpoint."""
    
    def test_valid_input(self, client):
        """Test with valid input and successful solver execution."""
        # Mock subprocess.run to simulate successful solver execution
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = json.dumps({
            "time": 12,
            "path": [
                {"row": 0, "col": 0, "battery": 10, "time": 0},
                {"row": 0, "col": 1, "battery": 9, "time": 1},
                {"row": 1, "col": 1, "battery": 8, "time": 2}
            ]
        })
        mock_result.stderr = ""
        
        with patch('subprocess.run', return_value=mock_result):
            # Valid input example with integer grid
            input_data = "3 3 10 5\n0 1 0\n0 2 1\n1 0 0\n1\n1 1"
            
            response = client.post(
                '/api/run/',
                data=input_data,
                content_type='text/plain'
            )
            
            # Should return 200 with JSON containing "time" and "path"
            assert response.status_code == 200
            data = response.json()
            assert "time" in data
            assert "path" in data
            assert isinstance(data["time"], (int, float))
            assert isinstance(data["path"], list)
            if len(data["path"]) > 0:
                # Verify path entries have correct structure
                assert "row" in data["path"][0]
                assert "col" in data["path"][0]
                assert "battery" in data["path"][0]
                assert "time" in data["path"][0]
    
    def test_invalid_input_format(self, client):
        """Test with invalid input format."""
        # Input with wrong number of parameters in first line (missing K)
        invalid_input = "5 5 10\n0 1 0 0 0\n0 1 0 0 0\n0 1 0 0 0\n0 1 0 0 0\n0 1 0 0 0\n0"
        
        response = client.post(
            '/api/run/',
            data=invalid_input,
            content_type='text/plain'
        )
        
        # Should return 400 for invalid input
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
    
    def test_input_too_large(self, client):
        """Test with input exceeding size limit."""
        # Create input larger than 64KB - grid of 1000x1000 integers
        large_input = "1000 1000 10 5\n" + (" ".join(["0"] * 1000) + "\n") * 1000 + "0"
        
        response = client.post(
            '/api/run/',
            data=large_input,
            content_type='text/plain'
        )
        
        # Should return 400 for input too large
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "exceeds maximum" in data["error"]
    
    def test_solver_timeout(self, client):
        """Test solver execution timeout."""
        # Mock subprocess.run to raise TimeoutExpired
        with patch('subprocess.run', side_effect=subprocess.TimeoutExpired('solver', 10)):
            input_data = "3 3 10 5\n0 1 0\n0 2 1\n1 0 0\n1\n1 1"
            
            response = client.post(
                '/api/run/',
                data=input_data,
                content_type='text/plain'
            )
            
            # Should return 504 for timeout
            assert response.status_code == 504
            data = response.json()
            assert "error" in data
            assert "timeout" in data["error"].lower()
    
    def test_solver_crash(self, client):
        """Test solver crash (non-zero exit code)."""
        # Mock subprocess.run to simulate solver crash
        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stdout = ""
        mock_result.stderr = "Segmentation fault"
        
        with patch('subprocess.run', return_value=mock_result):
            input_data = "3 3 10 5\n0 1 0\n0 2 1\n1 0 0\n1\n1 1"
            
            response = client.post(
                '/api/run/',
                data=input_data,
                content_type='text/plain'
            )
            
            # Should return 500 for solver crash
            assert response.status_code == 500
            data = response.json()
            assert "error" in data
    
    def test_invalid_json_output(self, client):
        """Test solver returning invalid JSON."""
        # Mock subprocess.run to return non-JSON output
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = "This is not JSON"
        mock_result.stderr = ""
        
        with patch('subprocess.run', return_value=mock_result):
            input_data = "3 3 10 5\n0 1 0\n0 2 1\n1 0 0\n1\n1 1"
            
            response = client.post(
                '/api/run/',
                data=input_data,
                content_type='text/plain'
            )
            
            # Should return 500 for invalid JSON
            assert response.status_code == 500
            data = response.json()
            assert "error" in data
            assert "not valid JSON" in data["error"]
    
    def test_grid_dimension_validation(self, client):
        """Test validation of grid dimensions."""
        # Grid has wrong number of integers per row
        invalid_grid = "3 3 10 5\n0 1\n0 2 1\n1 0 0\n0"
        
        response = client.post(
            '/api/run/',
            data=invalid_grid,
            content_type='text/plain'
        )
        
        # Should return 400
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
