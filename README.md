# VB Idea Scorer

AI-powered venture builder idea scoring system that analyzes business ideas across 11 critical dimensions using OpenAI GPT-4o.

## Overview

The VB Idea Scorer helps venture studios and investors evaluate business ideas by:
- Fetching content from URLs containing business idea information
- Analyzing the idea using GPT-4o across 11 venture-specific dimensions
- Providing weighted scores, detailed reasoning, and actionable recommendations
- Visualizing results in an intuitive React dashboard

## Scoring Dimensions

Each dimension is scored 0-10 with weighted importance:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Market Potential | 1.2 | International market viability and growth potential |
| Differentiated Approach | 1.0 | Uniqueness of approach and market positioning |
| Sustainable Competitive Advantage | 1.3 | 2-3 year defensibility and barriers to imitation |
| Differentiating Element | 1.1 | Core unique element that sets this apart |
| Technical Feasibility | 1.0 | Technical viability and implementation complexity |
| **Rapid Prototype Validation** | **1.4** | Can be prototyped and validated in 4-6 weeks |
| AI Enablement | 1.2 | AI leverage potential for building and scaling |
| Barrier to Entry | 1.1 | Difficulty for competitors to replicate |
| **Scalability** | **1.3** | Scalable technology and business model |
| Product-Focused Output | 0.9 | Product vs service business orientation |
| Subscription Model | 1.0 | Recurring revenue potential |

## Tech Stack

### Backend
- **FastAPI** - Modern Python async API framework
- **OpenAI GPT-4o** - AI analysis and scoring
- **httpx + BeautifulSoup4** - URL content fetching and parsing
- **Pydantic** - Data validation

### Frontend
- **React 18 + TypeScript** - UI framework with type safety
- **Vite** - Fast build tool and dev server
- **TanStack Query** - Data fetching and caching
- **Recharts** - Data visualization
- **Tailwind CSS** - Utility-first styling

## Project Structure

```
vb-ideation/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── config.py            # Configuration management
│   │   ├── models/
│   │   │   └── score.py         # Data models
│   │   ├── services/
│   │   │   ├── url_fetcher.py   # URL content fetching
│   │   │   ├── openai_service.py # OpenAI API integration
│   │   │   └── scorer.py        # Main scoring orchestration
│   │   ├── routers/
│   │   │   └── scoring.py       # API endpoints
│   │   └── utils/
│   │       ├── prompts.py       # Scoring dimensions and prompts
│   │       └── aggregation.py   # Score aggregation logic
│   ├── config/
│   │   └── urls.json            # URL configuration
│   ├── requirements.txt
│   └── .env                     # Environment variables (create from .env.example)
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── services/            # API client
│   │   ├── types/               # TypeScript types
│   │   └── App.tsx
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- **OpenAI API Key** - Get one from [OpenAI Platform](https://platform.openai.com)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create environment file:
```bash
cp .env.example .env
```

5. Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-api-key-here
```

6. (Optional) Configure URLs in `config/urls.json`:
```json
{
  "urls": [
    "https://example.com/your-business-idea"
  ]
}
```

7. Start the backend server:
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/v1/health`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Usage

### Using the Web Interface

1. Ensure both backend and frontend are running
2. Open `http://localhost:5173` in your browser
3. Choose input method:
   - **Config File**: Uses URLs from `backend/config/urls.json`
   - **Manual Entry**: Enter URLs directly in the interface
4. Click "Score Business Idea"
5. Wait 30-60 seconds while the AI analyzes the content
6. Review the results:
   - Overall score and recommendation
   - Radar chart visualization
   - Detailed dimension scores with reasoning
   - Key strengths and concerns

### Using the API Directly

Score an idea from config:
```bash
curl -X POST http://localhost:8000/api/v1/score \
  -H "Content-Type: application/json" \
  -d '{"url_source": "config"}'
```

Score an idea from custom URLs:
```bash
curl -X POST http://localhost:8000/api/v1/score \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://example.com/business-idea"]}'
```

## API Endpoints

### POST /api/v1/score
Score a business idea

**Request Body:**
```json
{
  "urls": ["https://example.com/idea"],  // Optional: list of URLs
  "url_source": "config"                  // Optional: use "config" to load from file
}
```

**Response:**
```json
{
  "idea_summary": "...",
  "url_source": "...",
  "dimension_scores": [...],
  "overall_score": 7.8,
  "recommendation": "Strong Pursue",
  "key_strengths": [...],
  "key_concerns": [...],
  "timestamp": "2026-01-14T10:30:00Z"
}
```

### GET /api/v1/urls
Get URLs from config file

### POST /api/v1/urls
Update URLs in config file

### GET /api/v1/health
Health check endpoint

## Recommendation Logic

The system provides four recommendation levels:

- **Strong Pursue**: Overall ≥7.5 AND critical dimensions ≥7
  - High confidence in success potential
  - All critical factors align favorably

- **Consider with Modifications**: Overall ≥6.0 AND critical dimensions ≥5
  - Promising but needs adjustments
  - Some concerns that can be addressed

- **Further Research Needed**: Overall ≥4.5
  - Insufficient information or mixed signals
  - Requires deeper investigation

- **Pass**: Overall <4.5 OR critical dimensions <4
  - Significant concerns outweigh potential
  - Not recommended for pursuit

Critical dimensions: Rapid Prototype Validation, Technical Feasibility, Market Potential, Scalability

## Development

### Backend Development

Run tests:
```bash
cd backend
pytest  # (tests to be added)
```

Check code formatting:
```bash
black app/
flake8 app/
```

### Frontend Development

Run in development mode:
```bash
cd frontend
npm run dev
```

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Configuration

### Backend Configuration (.env)

```
OPENAI_API_KEY=your_key_here
URLS_CONFIG_PATH=config/urls.json
ENVIRONMENT=development
DEBUG=True
```

### Frontend Configuration

The frontend is configured to connect to `http://localhost:8000` by default. To change this, edit `frontend/src/services/api.ts`:

```typescript
const API_BASE = 'http://your-backend-url/api/v1';
```

## Troubleshooting

### Backend Issues

**"OpenAI API key not configured"**
- Ensure `.env` file exists with valid `OPENAI_API_KEY`
- Restart the backend server after adding the key

**"Failed to fetch URL"**
- Check if the URL is accessible
- Some sites may block automated requests
- Try with a different URL

**"Module not found" errors**
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt` again

### Frontend Issues

**"Failed to connect to backend"**
- Ensure backend is running on port 8000
- Check CORS configuration in `backend/app/main.py`

**Blank page or component errors**
- Check browser console for errors
- Ensure all dependencies are installed: `npm install`
- Clear browser cache and reload

## Cost Considerations

Using GPT-4o API incurs costs:
- Each analysis scores 11 dimensions + summary + insights
- Approximately 13 API calls per idea
- Estimated cost: $0.15-0.30 per business idea analyzed
- Monitor usage at [OpenAI Usage Dashboard](https://platform.openai.com/usage)

## Future Enhancements

- [ ] Batch processing for multiple ideas
- [ ] Historical tracking and comparison
- [ ] Custom dimension configuration
- [ ] PDF report export
- [ ] User authentication
- [ ] Caching for repeated URLs
- [ ] Competitor analysis integration

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## Support

For issues or questions, please open an issue on GitHub.
