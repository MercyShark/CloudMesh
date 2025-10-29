# CloudMesh Worker

Python worker that monitors and executes pending jobs from the CloudMesh Solana program.

## Features

✅ **Automatic Job Monitoring** - Polls blockchain every 10 seconds for pending jobs
✅ **IPFS Integration** - Downloads code from IPFS and uploads results
✅ **Python Execution** - Safely executes Python code with 60s timeout
✅ **Blockchain Updates** - Marks jobs as complete with result CID and cost
✅ **Error Handling** - Comprehensive error handling and logging

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update:

```bash
cp .env.example .env
```

Edit `.env`:
```env
SOLANA_RPC_URL=http://localhost:8899
VITE_PINATA_JWT=your_pinata_jwt_token_here
WORKER_KEYPAIR_PATH=./worker-keypair.json
```

### 3. Fund Worker Wallet

The worker will create a keypair on first run. You need to airdrop SOL for transaction fees:

```bash
# Run worker once to generate keypair
python3 main.py

# It will print the worker address, then airdrop SOL:
solana airdrop 2 <WORKER_ADDRESS> --url localhost
```

### 4. Run Worker

```bash
python3 main.py
```

## How It Works

1. **Poll** - Every 10 seconds, fetches all pending jobs from Solana
2. **Download** - Downloads Python code from IPFS using the code CID
3. **Execute** - Runs the Python code in a subprocess with 60s timeout
4. **Upload** - Uploads execution result (stdout/stderr/returncode) to IPFS
5. **Update** - Calls `complete_job` on Solana with result CID and cost

## Job Processing Flow

```
┌─────────────────┐
│  Pending Job    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Download Code   │ ← IPFS (code_cid)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Execute Code   │ → Python subprocess
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Upload Result   │ → IPFS (result_cid)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Complete Job    │ → Solana transaction
└─────────────────┘
```

## Output Format

Results are stored as JSON in IPFS:

```json
{
  "stdout": "Hello from CloudMesh!\n",
  "stderr": "",
  "returncode": 0,
  "executed_at": "2025-10-28T10:30:00.123456"
}
```

## Security Notes

- Code executes in subprocess with 60s timeout
- Worker keypair should be kept secure
- Only processes jobs from the configured program ID
- Results are publicly visible on IPFS

## Configuration

- `POLL_INTERVAL` - Seconds between job checks (default: 10)
- Execution timeout - 60 seconds per job
- Cost calculation - Fixed at 1,000,000 lamports (can be customized)

## Troubleshooting

**Worker not finding jobs:**
- Ensure solana-test-validator is running
- Check program ID matches deployed program
- Verify jobs exist with `solana account <JOB_ADDRESS>`

**IPFS upload fails:**
- Check PINATA_JWT is valid
- Verify network connectivity
- Check Pinata account limits

**Transaction fails:**
- Ensure worker has SOL for fees
- Check worker is authorized in program
- Verify job is in Pending status
