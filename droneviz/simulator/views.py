"""
Views for the simulator app.

Provides API endpoint to run the C++ drone delivery solver as a subprocess.
"""
import json
import platform
import subprocess
import threading
from pathlib import Path

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

# Path to the compiled C++ solver binary
BASE_DIR = Path(__file__).resolve().parent.parent
if platform.system() == 'Windows':
    SOLVER_PATH = BASE_DIR / 'bin' / 'solver.exe'
else:
    SOLVER_PATH = BASE_DIR / 'bin' / 'solver'

# Maximum input size: 64 KB
MAX_INPUT_SIZE = 64 * 1024

# Timeout for solver execution in seconds
SOLVER_TIMEOUT = 10

# Semaphore to limit concurrent solver executions to 3
solver_semaphore = threading.Semaphore(3)


def validate_input_format(input_text):
    """
    Validate the input format for the solver.
    
    Expected format:
    - First line: N M B K (four integers - dimensions, battery, recharge amount)
    - Next N lines: M integers per line (building heights)
    - Next line: S (number of recharge stations)
    - Next S lines: r c (recharge station coordinates, 0-indexed)
    
    Args:
        input_text: Raw input string
        
    Returns:
        tuple: (is_valid, error_message)
    """
    try:
        lines = input_text.strip().split('\n')
        
        if len(lines) < 1:
            return False, "Input is empty"
        
        # Parse first line: N M B K
        first_line_parts = lines[0].split()
        if len(first_line_parts) != 4:
            return False, "First line must contain exactly 4 integers (N M B K)"
        
        try:
            N, M, B, K = map(int, first_line_parts)
        except ValueError:
            return False, "First line must contain valid integers"
        
        # Validate dimensions
        if N <= 0 or M <= 0:
            return False, "Grid dimensions (N, M) must be positive"
        
        if N > 1000 or M > 1000:
            return False, "Grid dimensions too large (max 1000x1000)"
        
        # Validate battery parameters
        if B <= 0:
            return False, "Maximum battery (B) must be positive"
        
        if K <= 0:
            return False, "Recharge amount (K) must be positive"
        
        # Validate we have enough lines for the grid
        if len(lines) < N + 1:
            return False, f"Expected at least {N} grid lines, got {len(lines) - 1}"
        
        # Validate grid lines (integers)
        for i in range(1, N + 1):
            if i >= len(lines):
                return False, f"Missing grid line {i}"
            
            height_parts = lines[i].split()
            if len(height_parts) != M:
                return False, f"Grid line {i} has {len(height_parts)} integers, expected {M}"
            
            # Validate all are non-negative integers
            try:
                heights = [int(h) for h in height_parts]
                if any(h < 0 for h in heights):
                    return False, f"Grid line {i} contains negative heights"
            except ValueError:
                return False, f"Grid line {i} contains invalid integers"
        
        # Validate recharge stations section
        if len(lines) < N + 2:
            return False, "Missing recharge station count (S)"
        
        try:
            S = int(lines[N + 1])
        except ValueError:
            return False, "Recharge station count (S) must be an integer"
        
        if S < 0:
            return False, "Number of recharge stations cannot be negative"
        
        # Validate recharge station coordinates
        if len(lines) < N + 2 + S:
            return False, f"Expected {S} recharge station coordinates, got {len(lines) - N - 2}"
        
        for i in range(S):
            station_line = lines[N + 2 + i].split()
            if len(station_line) != 2:
                return False, f"Recharge station {i+1} must have 2 coordinates (r c)"
            
            try:
                r, c = map(int, station_line)
                if not (0 <= r < N and 0 <= c < M):
                    return False, f"Recharge station {i+1} at ({r}, {c}) is outside grid bounds"
            except ValueError:
                return False, f"Recharge station {i+1} coordinates must be integers"
        
        return True, None
        
    except Exception as e:
        return False, f"Input validation error: {str(e)}"


@csrf_exempt
@require_http_methods(["POST"])
def run_simulation(request):
    """
    API endpoint to run the drone delivery solver.
    
    Method: POST
    URL: /api/run/
    
    Request:
        - Body: Raw text input for the solver
        - Content-Type: text/plain or application/json
    
    Response:
        - 200: JSON output from solver (e.g., {"time": 1.23, "path": [[0,0], [1,0]]})
        - 400: Invalid input format
        - 500: Solver crashed or returned invalid JSON
        - 504: Solver timeout
    """
    # Read raw request body
    try:
        input_data = request.body.decode('utf-8')
    except UnicodeDecodeError:
        return JsonResponse(
            {'error': 'Invalid UTF-8 encoding in request body'},
            status=400
        )
    
    # Enforce maximum input size
    if len(input_data) > MAX_INPUT_SIZE:
        return JsonResponse(
            {'error': f'Input size exceeds maximum of {MAX_INPUT_SIZE} bytes'},
            status=400
        )
    
    # Validate input format
    is_valid, error_msg = validate_input_format(input_data)
    if not is_valid:
        return JsonResponse(
            {'error': f'Invalid input format: {error_msg}'},
            status=400
        )
    
    # Check if solver exists
    if not SOLVER_PATH.exists():
        return JsonResponse(
            {'error': f'Solver not found at {SOLVER_PATH}. Please compile the solver first.'},
            status=500
        )
    
    # Acquire semaphore to limit concurrent executions
    acquired = solver_semaphore.acquire(blocking=True)
    
    try:
        # Run the C++ solver as a subprocess
        # - shell=False for security
        # - stdin=PIPE to pass input
        # - stdout=PIPE and stderr=PIPE to capture output
        # - timeout to prevent hanging
        result = subprocess.run(
            [str(SOLVER_PATH)],
            input=input_data,
            capture_output=True,
            text=True,
            timeout=SOLVER_TIMEOUT,
            shell=False
        )
        
        # Check if solver exited successfully
        if result.returncode != 0:
            # Solver crashed or returned error
            return JsonResponse(
                {
                    'error': 'Solver execution failed',
                    'stderr': result.stderr,
                    'returncode': result.returncode
                },
                status=500
            )
        
        # Parse JSON output from solver
        try:
            solver_output = json.loads(result.stdout)
        except json.JSONDecodeError as e:
            return JsonResponse(
                {
                    'error': 'Solver output is not valid JSON',
                    'stdout': result.stdout,
                    'parse_error': str(e)
                },
                status=500
            )
        
        # Return solver output as JSON response
        return JsonResponse(solver_output, status=200)
        
    except subprocess.TimeoutExpired:
        # Solver execution exceeded timeout
        return JsonResponse(
            {'error': f'Solver execution timeout (>{SOLVER_TIMEOUT}s)'},
            status=504
        )
        
    except Exception as e:
        # Unexpected error
        return JsonResponse(
            {'error': f'Unexpected error: {str(e)}'},
            status=500
        )
        
    finally:
        # Always release the semaphore
        if acquired:
            solver_semaphore.release()
