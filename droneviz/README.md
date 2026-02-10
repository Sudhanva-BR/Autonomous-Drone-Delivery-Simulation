# DroneViz - Autonomous Drone Delivery Path Optimizer

DroneViz is a Django-based web application that visualizes autonomous drone delivery paths. It runs a C++ pathfinding algorithm as a subprocess and displays the optimized delivery routes on an interactive grid interface.

## Features

- 🚁 **Autonomous Path Planning**: Runs C++ solver for optimal delivery routes
- 🎨 **Modern UI**: Beautiful, responsive interface with real-time visualization
- ⚡ **Fast & Efficient**: Subprocess-based execution with 3-concurrent solver limit
- 🔒 **Secure**: Input validation, size limits, and timeout protection
- 📊 **Visual Feedback**: Interactive grid canvas with path animation
- ✅ **Testing**: Comprehensive pytest test suite

## Project Structure

```
droneviz/
├── manage.py                 # Django management script
├── bin/
│   └── solver               # Compiled C++ solver binary (you need to compile)
├── droneviz/
│   ├── __init__.py
│   ├── settings.py          # Django settings
│   ├── urls.py              # Main URL routing
│   └── wsgi.py              # WSGI configuration
├── simulator/
│   ├── __init__.py
│   ├── apps.py              # App configuration
│   ├── views.py             # API endpoint logic
│   ├── urls.py              # API routing
│   └── tests.py             # Test suite
├── templates/
│   └── index.html           # Frontend interface
├── static/
│   ├── css/
│   │   └── style.css        # Styles
│   └── js/
│       └── app.js           # Frontend logic
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Requirements

- **Python**: 3.9 or higher
- **Django**: 4.2 or higher
- **C++ Compiler**: g++ with C++17 support (for compiling solver)
- **Browser**: Modern browser with ES6 support

## Installation & Setup

### 1. Install Python Dependencies

```bash
# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Run Django Migrations

```bash
python manage.py migrate
```

### 3. Compile the C++ Solver

**IMPORTANT**: You must provide your C++ solver algorithm and compile it before running the application.

Place your solver source code in `solver/solver.cpp` (or any location), then compile it:

```bash
# Windows (using MinGW or similar)
g++ -std=c++17 -O2 solver/solver.cpp -o bin/solver.exe

# macOS/Linux
g++ -std=c++17 -O2 solver/solver.cpp -o bin/solver
chmod +x bin/solver
```

**Solver Requirements:**
- Must read input from **stdin**
- Must output JSON to **stdout** with format: `{"time": float, "path": [[r, c], ...]}`
- Must handle the input format:
  ```
  N M R C
  <N lines of M characters each>
  ```
  Where:
  - `N` = number of rows
  - `M` = number of columns
  - `R` = recharge station row
  - `C` = recharge station column
  - Grid characters: `.` (empty), `#` (obstacle), `D` (delivery), `R` (recharge)

### 4. Run the Development Server

```bash
python manage.py runserver
```

The application will be available at: **http://127.0.0.1:8000/**

## Usage

### Web Interface

1. **Navigate to** `http://127.0.0.1:8000/`
2. **Configure grid parameters**:
   - Set grid dimensions (N x M)
   - Set recharge station coordinates (R, C)
   - Enter grid layout or click "Generate Random Grid"
3. **Click "Run Simulation"** to execute the solver
4. **View results**:
   - Execution time
   - Path length
   - Number of deliveries
   - Visual path on grid canvas

### API Endpoint

**POST** `/api/run/`

**Request:**
```
Content-Type: text/plain

5 5 2 2
.....
.D#..
..R..
..#D.
.....
```

**Success Response (200):**
```json
{
  "time": 0.123,
  "path": [[2, 2], [1, 1], [3, 3]]
}
```

**Error Responses:**
- `400`: Invalid input format
- `500`: Solver crashed or returned invalid JSON
- `504`: Solver execution timeout (>10s)

## API Implementation Details

### Input Validation
- Maximum input size: **64 KB**
- Validates first line contains exactly 4 integers
- Validates grid dimensions match N and M
- Validates recharge station coordinates are within bounds

### Security Features
- No shell execution (`shell=False`)
- Input size limits
- Timeout protection (10 seconds)
- CSRF exemption for API endpoint only
- Input validation before subprocess execution

### Concurrency Control
- Maximum **3 concurrent solver executions** using `threading.Semaphore`
- Prevents resource exhaustion
- Graceful queuing of requests

## Testing

Run the test suite:

```bash
# Run all tests
pytest simulator/tests.py -v

# Run specific test
pytest simulator/tests.py::TestRunSimulation::test_valid_input -v

# Run with coverage
pytest simulator/tests.py --cov=simulator
```

**Test Coverage:**
- ✅ Valid input handling
- ✅ Invalid input format detection
- ✅ Input size limit enforcement
- ✅ Solver timeout handling
- ✅ Solver crash handling
- ✅ Invalid JSON output handling
- ✅ Grid dimension validation

## Configuration

### Solver Path

The solver path is configured in `simulator/views.py`:

```python
SOLVER_PATH = BASE_DIR / 'bin' / 'solver'
```

### Timeout

Adjust the solver timeout in `simulator/views.py`:

```python
SOLVER_TIMEOUT = 10  # seconds
```

### Concurrency Limit

Adjust concurrent executions in `simulator/views.py`:

```python
solver_semaphore = threading.Semaphore(3)  # max 3 concurrent
```

### Input Size Limit

Adjust max input size in `simulator/views.py`:

```python
MAX_INPUT_SIZE = 64 * 1024  # 64 KB
```

## Troubleshooting

### "Solver not found" Error

**Problem**: The compiled solver binary doesn't exist.

**Solution**: Compile your C++ solver and place it at `bin/solver` (or `bin/solver.exe` on Windows).

### Solver Timeout

**Problem**: Solver takes longer than 10 seconds.

**Solution**: 
- Optimize your algorithm
- Increase `SOLVER_TIMEOUT` in `simulator/views.py`
- Use smaller grids for testing

### Invalid JSON Output

**Problem**: Solver doesn't output valid JSON.

**Solution**: Ensure your solver outputs exactly:
```json
{"time": 1.23, "path": [[0, 0], [1, 1]]}
```

### Port Already in Use

**Problem**: Port 8000 is already in use.

**Solution**: Run on a different port:
```bash
python manage.py runserver 8080
```

## Development

### Adding New Features

1. **Backend**: Edit `simulator/views.py`
2. **Frontend**: Edit `templates/index.html`, `static/css/style.css`, `static/js/app.js`
3. **Tests**: Add tests to `simulator/tests.py`

### Code Style

- Follow PEP 8 for Python code
- Use meaningful variable names
- Add comments for complex logic
- Write tests for new features

## License

This project is provided as-is for educational and development purposes.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the solver requirements
3. Verify all setup steps were completed
4. Check Django logs for detailed error messages

---

**Built with Django 4.x • Designed for high-performance drone delivery optimization**
