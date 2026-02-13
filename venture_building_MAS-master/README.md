# Multi-Agent Business Idea Generation System

Production-ready multi-agent system for extracting insights from PDFs, generating business ideas, and evaluating opportunities.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install langchain langchain-ollama langchain-anthropic langchain-openai langchain-groq pymupdf python-dotenv
```

### 2. Set Up API Keys

Create a `.env` file in this directory:

```bash
# Get free Groq key at: https://console.groq.com
GROQ_API_KEY=gsk_your_groq_api_key_here
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key_here
OPENAI_API_KEY=sk-your_openai_key_here
```

**Important:** Create a `.gitignore` file to protect your keys:

```bash
.env
checkpoints/
results_*.json
__pycache__/
*.pyc
.ipynb_checkpoints/
```

### 3. Open the Notebook

```bash
jupyter notebook simple_multiagent_test.ipynb
```

### 4. Run All Cells

The notebook is **self-contained** with complete documentation inside. Just execute cells in order.

---

## 📖 What It Does

**5-Agent Pipeline:**

1. **Agent 1**: Extracts key information from PDF
2. **Agent 2**: Generates detailed business ideas
3. **Agent 3**: 11 specialized dimensional evaluations (3.1 - 3.11)
4. **Agent 4**: 3 specialized synthesis sub-agents (4.1: summary, 4.2: strengths, 4.3: concerns)
5. **Agent 5**: Final consolidation and JSON report generation

**Key Features:**

- ✅ **Multi-Provider Support**: Ollama, Groq, Anthropic, OpenAI
- ✅ **Smart Checkpoints**: Auto-save/resume to skip completed work (17 checkpoints total)
- ✅ **PDF-Specific Checkpoints**: Automatic handling of multiple documents
- ✅ **11-Dimension Evaluation**: Comprehensive business assessment
- ✅ **Modular Synthesis**: Separate agents ensure quality outputs
- ✅ **Weighted Scoring**: Configurable importance per dimension
- ✅ **JSON Output**: Structured final report with recommendations
- ✅ **Self-Contained**: All documentation inside the notebook

---

## ⚙️ Configuration

Edit the configuration cell in the notebook:

```python
# Provider: "ollama", "groq", "anthropic", or "openai"
PROVIDER = "groq"  # Recommended for free experimentation

# Your data
PDF_PATH = "data/sample_mobility_report.pdf"
SECTOR = "mobility"
NUM_IDEAS = 3
```

---

## 🆓 Provider Options

| Provider | Speed | Cost | Use Case |
|----------|-------|------|----------|
| **Groq** | ⚡ 1-2 sec | FREE | Development/testing |
| **Ollama** | 🐢 5-60 sec | FREE | Local/private |
| **Anthropic** | ⚡ 2-3 sec | ~$0.75/250K | Production |
| **OpenAI** | ⚡ 2-3 sec | ~$0.62/250K | Production |

---

## 💾 Checkpoint System

Checkpoints save automatically after each agent completes. This lets you:

- ✅ Resume after crashes
- ✅ Skip re-running completed agents
- ✅ Test different prompts without re-processing
- ✅ **17 total checkpoints**: agent1, agent2, agent3_1-11, agent4_1-3, agent5
- ✅ **PDF-specific**: Separate checkpoints for each document
- ✅ **Automatic detection**: New PDF triggers full pipeline automatically

**Example:** Run Agent 1 once (5 sec), then test 100 different dimensional evaluation prompts (instant!)

### Multiple PDF Support

The checkpoint system **automatically handles different PDFs**:

- Checkpoints are named: `agent1_{pdf_name}_{sector}_timestamp.json`
- Switching PDFs in config automatically triggers new analysis
- Old and new PDF checkpoints coexist peacefully
- No manual cleanup needed when changing documents

**Example:**
```python
# First analysis
PDF_PATH = "data/sample_mobility_report.pdf"
# Creates: agent1_sample_mobility_report_mobility_*.json

# Second analysis (different PDF)
PDF_PATH = "data/EITUM_MDS-study_long (3).pdf"
# Creates: agent1_EITUM_MDS-study_long (3)_mobility_*.json
# Automatically detects new PDF and runs full pipeline
```

### Configuration

```python
USE_CHECKPOINTS = True  # Master switch
USE_CHECKPOINT_AGENT1 = True   # Per-agent control
USE_CHECKPOINT_AGENT2 = False  # Force this agent to re-run
USE_CHECKPOINT_AGENT3 = True   # Controls all 11 dimensional sub-agents
```

### Checkpoint Status Display

When you run the notebook, it automatically shows:
- Which PDF is being analyzed
- Whether it's a new analysis or continuation
- Breakdown of existing checkpoints (if any)
- Which agents will run vs. skip

---

## 📁 Project Structure

```
basic_test_jupyter_notebook/
├── simple_multiagent_test.ipynb  ← Self-contained notebook (START HERE)
├── README.md                      ← This file
├── .env                           ← Your API keys (create this)
├── .gitignore                     ← Prevents key leakage (create this)
├── data/
│   ├── sample_mobility_report.pdf
│   └── EITUM_MDS-study_long (3).pdf
└── checkpoints/                   ← Auto-created, PDF-specific
    ├── agent1_{pdf_name}_{sector}_*.json      ← PDF extraction
    ├── agent2_{pdf_name}_{sector}_*.json      ← Business ideas
    ├── agent3_1_{pdf_name}_{sector}_*.json    ← Dimension 1: Market Potential
    ├── agent3_2_{pdf_name}_{sector}_*.json    ← Dimension 2: Positioning
    ├── ...                                     ← Dimensions 3-10
    ├── agent3_11_{pdf_name}_{sector}_*.json   ← Dimension 11: Subscription
    ├── agent4_1_{pdf_name}_{sector}_*.json    ← Business summary
    ├── agent4_2_{pdf_name}_{sector}_*.json    ← Key strengths
    ├── agent4_3_{pdf_name}_{sector}_*.json    ← Key concerns
    ├── agent5_{pdf_name}_{sector}_*.json      ← Final consolidated report
    └── results_{sector}_*.json                 ← Final JSON output file
```

**Note:** Checkpoint files include `{pdf_name}` and `{sector}` in their names, allowing multiple PDFs to be analyzed without conflicts.

---

## 📊 11 Evaluation Dimensions

Each business idea is evaluated across 11 specialized dimensions (1-10 scale):

1. **Market Potential** - Market size, growth, monetization capacity
2. **Differentiated Approach & Positioning** - Clarity and uniqueness
3. **Sustainable Competitive Advantage** - Long-term defensibility
4. **Differentiating Element** - Single strongest feature
5. **Technical Feasibility** - Technical achievability
6. **Affordable & Rapid Implementation** - Time and cost to MVP
7. **AI Enablement for Core Value** - Meaningful AI enhancement
8. **Barrier to Entry** - Difficulty for competitors
9. **Scalable Technology & Operations** - Non-linear growth potential
10. **Product-Focused Output** - Repeatable product vs service
11. **Subscription-Based Platform Access** - Recurring revenue quality

**Final Score**: Weighted average of all dimensions with configurable weights (default: Market Potential 12%, Barrier to Entry 11%, etc.)

**Recommendation Tiers**:
- 8.0-10.0: STRONG_PROCEED
- 6.0-7.9: CONDITIONAL_PROCEED
- 4.0-5.9: REQUIRES_REFINEMENT
- 0.0-3.9: REJECT

---

## 🎯 Common Workflows

### Experimentation (FREE)

```python
PROVIDER = "groq"
USE_CHECKPOINTS = True
# Test prompts instantly with checkpoint loading
```

### Production Runs

```python
PROVIDER = "anthropic"
USE_CHECKPOINTS = False  # Force fresh run
```

### Process New PDFs

```python
PDF_PATH = "data/your_report.pdf"
SECTOR = "healthcare"
# New checkpoints created automatically
```

---

## 🐛 Troubleshooting

**"API key not found"**
- Create `.env` file with your API key
- Or set environment variable
- Or notebook will prompt for manual entry

**"Checkpoint not loading"**
- Check `USE_CHECKPOINTS = True`
- Check per-agent flags
- Run `list_checkpoints()` in notebook

**"Ollama not responding"**
- Check Ollama is running: `ollama list`
- Pull model: `ollama pull mistral`

---

## 📖 Documentation

**All documentation is inside the notebook.** The notebook includes:

- Detailed markdown cells explaining each section
- Inline code comments
- Configuration instructions
- Usage examples
- Troubleshooting tips

**This README provides only the essential quick-start information.**

---

## 🎓 Learning Path

1. **Read** the notebook's markdown cells (don't skip them!)
2. **Run** all cells in order
3. **Experiment** with different configurations
4. **Iterate** on prompts using checkpoints

The notebook is designed to be self-explanatory. Every feature is documented where it's implemented.

---

## 💡 Why This Approach?

- **Self-Contained**: Everything you need is in one notebook
- **Executable Documentation**: Code and explanations together
- **Easy to Share**: Just share the notebook file
- **No Context Switching**: Learn by doing, not by reading separate docs

---

## 🚀 Get Started

```bash
# 1. Install dependencies
pip install langchain langchain-ollama langchain-anthropic langchain-openai langchain-groq pymupdf python-dotenv

# 2. Create .env file with API key
echo "GROQ_API_KEY=your_key_here" > .env

# 3. Open notebook
jupyter notebook simple_multiagent_test.ipynb

# 4. Run all cells and explore! 🎉
```

---

**The notebook contains all the details. This README gets you started. Happy experimenting!** 🎯
