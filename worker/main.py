from solana.rpc.api import Client
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.transaction import Transaction
from solders.instruction import Instruction, AccountMeta
from solders.message import Message
import struct
import base64
import time
import json
import requests
import hashlib
import zipfile
import io
from datetime import datetime
from typing import List, Dict, Optional
import signal
import sys
import os

NET_URL = os.getenv("SOLANA_RPC_URL")
IPFS_GATEWAY = "https://ipfs.io/ipfs/"

AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
LAMBDA_FUNCTION_NAME = "solana-job-executor"

PINATA_JWT = os.getenv("PINATA_JWT")

client = Client(NET_URL)
running = True

def signal_handler(sig, frame):
    global running
    print("\n\nShutting down...")
    running = False

signal.signal(signal.SIGINT, signal_handler)

LAMBDA_CODE = '''
import json
import sys
import io
import traceback
import time
from contextlib import redirect_stdout, redirect_stderr

def lambda_handler(event, context):
    start_time = time.time()
    
    try:
        code = event.get('code', '')
        job_title = event.get('job_title', 'Unnamed Job')
        job_type = event.get('job_type', 'MANUAL')
        owner = event.get('owner', 'unknown')
        
        if not code:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'status': 'error',
                    'error': 'No code provided',
                    'execution_time_ms': 0
                })
            }
        
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()
        
        # Use a "safe" builtins but include __import__ for import statements
        safe_builtins = {
            'print': print, 'len': len, 'range': range, 'str': str,
            'int': int, 'float': float, 'bool': bool, 'list': list,
            'dict': dict, 'tuple': tuple, 'set': set, 'sum': sum,
            'max': max, 'min': min, 'abs': abs, 'round': round,
            'sorted': sorted, 'enumerate': enumerate, 'zip': zip,
            'map': map, 'filter': filter, 'any': any, 'all': all,
            '__import__': __import__,  # <--- allow imports
        }
        
        # Preloaded globals (can add more modules if needed)
        safe_globals = {
            '__builtins__': safe_builtins,
            'json': json,
            'time': time,
        }
        
        exec_start = time.time()
        
        try:
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                exec(code, safe_globals)
            
            exec_time = time.time() - exec_start
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'status': 'success',
                    'job_title': job_title,
                    'job_type': job_type,
                    'owner': owner,
                    'execution_time_ms': int(exec_time * 1000),
                    'total_time_ms': int((time.time() - start_time) * 1000),
                    'stdout': stdout_capture.getvalue(),
                    'stderr': stderr_capture.getvalue(),
                    'code_size': len(code),
                    'timestamp': int(time.time())
                })
            }
            
        except Exception as e:
            exec_time = time.time() - exec_start
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'status': 'error',
                    'job_title': job_title,
                    'error': str(e),
                    'error_type': type(e).__name__,
                    'traceback': traceback.format_exc(),
                    'execution_time_ms': int(exec_time * 1000),
                    'stdout': stdout_capture.getvalue(),
                    'stderr': stderr_capture.getvalue(),
                    'timestamp': int(time.time())
                })
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'status': 'error',
                'error': str(e),
                'traceback': traceback.format_exc(),
                'timestamp': int(time.time())
            })
        }
'''

class JobStatus:
    PENDING = 0
    COMPLETED = 1
    CANCELLED = 2
    
    @staticmethod
    def to_string(status: int) -> str:
        return {0: "PENDING", 1: "COMPLETED", 2: "CANCELLED"}.get(status, f"UNKNOWN({status})")

class JobType:
    CRON = 0
    API = 1
    MANUAL = 2
    
    @staticmethod
    def to_string(job_type: int) -> str:
        return {0: "CRON", 1: "API", 2: "MANUAL"}.get(job_type, f"UNKNOWN({job_type})")

def create_lambda_function():
    """Automatically create Lambda function using boto3"""
    try:
        import boto3
        from botocore.exceptions import ClientError
        
        print("="*70)
        print("Creating AWS Lambda Function")
        print("="*70)
        
        # Initialize clients
        lambda_client = boto3.client(
            'lambda',
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_KEY,
            region_name=AWS_REGION
        )
        
        iam_client = boto3.client(
            'iam',
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_KEY,
            region_name=AWS_REGION
        )
        
        role_name = 'solana-lambda-execution-role'
        role_arn = None
        
        try:
            print(f"\n1. Checking IAM role: {role_name}")
            role = iam_client.get_role(RoleName=role_name)
            role_arn = role['Role']['Arn']
            print(f"   ✓ Role exists: {role_arn}")
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchEntity':
                print(f"   Creating IAM role...")
                
                trust_policy = {
                    "Version": "2012-10-17",
                    "Statement": [{
                        "Effect": "Allow",
                        "Principal": {"Service": "lambda.amazonaws.com"},
                        "Action": "sts:AssumeRole"
                    }]
                }
                
                role = iam_client.create_role(
                    RoleName=role_name,
                    AssumeRolePolicyDocument=json.dumps(trust_policy),
                    Description='Execution role for Solana job processor Lambda'
                )
                role_arn = role['Role']['Arn']
                
                # Attach basic execution policy
                iam_client.attach_role_policy(
                    RoleName=role_name,
                    PolicyArn='arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
                )
                
                print(f"   ✓ Role created: {role_arn}")
                print(f"   ⏳ Waiting 10s for role to propagate...")
                time.sleep(10)
        
        print(f"\n2. Creating deployment package")
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            zip_file.writestr('lambda_function.py', LAMBDA_CODE)
        zip_buffer.seek(0)
        zip_content = zip_buffer.read()
        print(f"   ✓ Package created ({len(zip_content)} bytes)")
        
        print(f"\n3. Deploying Lambda function: {LAMBDA_FUNCTION_NAME}")
        
        try:
            lambda_client.get_function(FunctionName=LAMBDA_FUNCTION_NAME)
            
            # Update existing function
            print(f"   Updating existing function...")
            response = lambda_client.update_function_code(
                FunctionName=LAMBDA_FUNCTION_NAME,
                ZipFile=zip_content
            )
            print(f"   ✓ Function updated")
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                # Create new function
                print(f"   Creating new function...")
                response = lambda_client.create_function(
                    FunctionName=LAMBDA_FUNCTION_NAME,
                    Runtime='python3.11',
                    Role=role_arn,
                    Handler='lambda_function.lambda_handler',
                    Code={'ZipFile': zip_content},
                    Timeout=30,
                    MemorySize=512,
                    Description='Solana job executor',
                )
                print(f"   ✓ Function created")
            else:
                raise
        
        print(f"\n4. Testing Lambda function")
        test_payload = {
            "code": "result = 5 + 5\nprint(f'Test result: {result}')",
            "job_title": "Test Job",
            "job_type": "MANUAL",
            "owner": "test"
        }
        
        response = lambda_client.invoke(
            FunctionName=LAMBDA_FUNCTION_NAME,
            InvocationType='RequestResponse',
            Payload=json.dumps(test_payload)
        )
        
        result = json.loads(response['Payload'].read())
        test_result = json.loads(result.get('body', '{}'))
        
        if test_result.get('status') == 'success':
            print(f"   ✓ Test successful!")
            print(f"   Output: {test_result.get('stdout', '').strip()}")
        else:
            print(f"   ✗ Test failed: {test_result.get('error', 'Unknown error')}")
            return False
        
        print(f"\n{'='*70}")
        print(f"✓ Lambda function ready!")
        print(f"{'='*70}\n")
        return True
        
    except ImportError:
        print("✗ boto3 not installed. Install with: pip install boto3")
        return False
    except Exception as e:
        print(f"✗ Error creating Lambda: {e}")
        import traceback
        traceback.print_exc()
        return False

def load_keypair(path: str) -> Keypair:
    """Load keypair from JSON file"""
    with open(path, 'r') as f:
        secret = json.load(f)
    return Keypair.from_bytes(bytes(secret))

def deserialize_string(data: bytes, offset: int) -> tuple:
    """Deserialize Rust String"""
    length = struct.unpack_from('<I', data, offset)[0]
    offset += 4
    if length > 0:
        string_value = data[offset:offset + length].decode('utf-8')
        offset += length
    else:
        string_value = ""
    return string_value, offset

def deserialize_job(data: bytes) -> Optional[Dict]:
    """Deserialize Job account"""
    try:
        offset = 8
        owner_bytes = data[offset:offset + 32]
        owner = str(Pubkey(owner_bytes))
        offset += 32
        
        title, offset = deserialize_string(data, offset)
        code_cid, offset = deserialize_string(data, offset)
        result_cid, offset = deserialize_string(data, offset)
        
        start_time = struct.unpack_from('<q', data, offset)[0]
        offset += 8
        end_time = struct.unpack_from('<q', data, offset)[0]
        offset += 8
        status = struct.unpack_from('<B', data, offset)[0]
        offset += 1
        job_type = struct.unpack_from('<B', data, offset)[0]
        offset += 1
        cost = struct.unpack_from('<Q', data, offset)[0]
        offset += 8
        cost_paid = bool(struct.unpack_from('<B', data, offset)[0])
        offset += 1
        bump = struct.unpack_from('<B', data, offset)[0]
        
        return {
            "owner": owner, "title": title, "code_cid": code_cid,
            "result_cid": result_cid, "start_time": start_time,
            "end_time": end_time, "status": status,
            "status_name": JobStatus.to_string(status),
            "job_type": job_type,
            "job_type_name": JobType.to_string(job_type),
            "cost": cost, "cost_paid": cost_paid, "bump": bump
        }
    except Exception as e:
        return None

def fetch_pending_jobs(program_id: str) -> List[Dict]:
    """Fetch pending jobs"""
    try:
        prog_id = Pubkey.from_string(program_id)
        response = client.get_program_accounts(prog_id, encoding="base64")
        
        if not response.value:
            return []
        
        jobs = []
        for account_info in response.value:
            try:
                pubkey = account_info.pubkey
                account = account_info.account
                
                if isinstance(account.data, (list, tuple)):
                    data = base64.b64decode(account.data[0])
                else:
                    data = account.data
                
                job = deserialize_job(data)
                
                if job and job["status"] == JobStatus.PENDING:
                    job["account_address"] = str(pubkey)
                    jobs.append(job)
            except:
                continue
        
        return jobs
    except Exception as e:
        print(f"Error fetching jobs: {e}")
        return []

def fetch_from_ipfs(cid: str) -> Optional[str]:
    """Fetch content from IPFS"""
    try:
        print(f"  Fetching from IPFS: {cid}")
        url = f"{IPFS_GATEWAY}{cid}"
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        print(f"  ✓ Fetched {len(response.text)} bytes")
        return response.text
    except Exception as e:
        print(f"  ✗ IPFS fetch error: {e}")
        return None

def execute_on_lambda(code: str, job: Dict) -> Optional[Dict]:
    """Execute code on AWS Lambda"""
    try:
        import boto3
        
        print(f"  Executing on Lambda...")
        
        lambda_client = boto3.client(
            'lambda',
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_KEY,
            region_name=AWS_REGION
        )
        
        payload = {
            "code": code,
            "job_title": job['title'],
            "job_type": job['job_type_name'],
            "owner": job['owner'],
        }
        
        response = lambda_client.invoke(
            FunctionName=LAMBDA_FUNCTION_NAME,
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )
        
        response_payload = json.loads(response['Payload'].read())
        result = json.loads(response_payload.get('body', '{}'))
        
        if result.get('status') == 'success':
            print(f"  ✓ Execution successful ({result.get('execution_time_ms', 0)}ms)")
            if result.get('stdout'):
                print(f"  Output: {result['stdout'].strip()[:100]}")
        else:
            print(f"  ✗ Execution failed: {result.get('error', 'Unknown')}")
        
        return result
        
    except Exception as e:
        print(f"  ✗ Lambda error: {e}")
        return None

def upload_to_pinata(data: Dict) -> Optional[str]:
    """Upload result to Pinata"""
    try:
        print(f"  Uploading to Pinata...")
        
        url = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
        headers = {
            "Authorization": f"Bearer {PINATA_JWT}",
            "Content-Type": "application/json"
        }
        payload = {
            "pinataContent": data,
            "pinataMetadata": {"name": f"job_result_{int(time.time())}.json"}
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        if response.status_code == 200:
            cid = response.json()['IpfsHash']
            print(f"  ✓ Uploaded: {cid}")
            return cid
        else:
            raise Exception(f"Status {response.status_code}")
            
    except Exception as e:
        print(f"  ✗ Upload error: {e}")
        json_data = json.dumps(data)
        cid = "Qm" + hashlib.sha256(json_data.encode()).hexdigest()[:44]
        print(f"  → Fallback CID: {cid}")
        return cid

def calculate_cost(code_size: int, result_size: int, execution_time: float) -> int:
    """Calculate job cost"""
    BASE_COST = 1_000_000
    SIZE_RATE = 10
    TIME_RATE = 100
    
    total = BASE_COST + (code_size + result_size) * SIZE_RATE + int(execution_time * TIME_RATE)
    print(f"  Cost: {total / 1_000_000_000:.9f} SOL ({total} lamports)")
    return total

def complete_job_onchain(
    program_id: str, job_address: str, job_data: Dict,
    worker: Keypair, result_cid: str, cost: int
) -> bool:
    """Complete job on-chain"""
    try:
        print(f"  Sending transaction...")
        
        prog_id = Pubkey.from_string(program_id)
        job_pubkey = Pubkey.from_string(job_address)
        
        discriminator = hashlib.sha256(b"global:complete_job").digest()[:8]
        result_bytes = result_cid.encode('utf-8')
        
        instruction_data = (
            discriminator +
            struct.pack('<I', len(result_bytes)) +
            result_bytes +
            struct.pack('<Q', cost)
        )
        
        accounts = [
            AccountMeta(pubkey=job_pubkey, is_signer=False, is_writable=True),
            AccountMeta(pubkey=worker.pubkey(), is_signer=True, is_writable=False),
        ]
        
        ix = Instruction(prog_id, instruction_data, accounts)
        blockhash_resp = client.get_latest_blockhash()
        blockhash = blockhash_resp.value.blockhash
        
        msg = Message.new_with_blockhash([ix], worker.pubkey(), blockhash)
        tx = Transaction([worker], msg, blockhash)
        
        result = client.send_transaction(tx)
        sig = result.value
        
        print(f"  ✓ Transaction: {sig}")
        time.sleep(2)
        
        from solders.signature import Signature
        sig_obj = Signature.from_string(str(sig))
        confirmation = client.get_signature_statuses([sig_obj])
        
        if confirmation.value and confirmation.value[0]:
            print(f"  ✓ Confirmed!")
            return True
        
        return False
            
    except Exception as e:
        print(f"  ✗ Transaction error: {e}")
        return False

def process_job(job: Dict, program_id: str, worker: Keypair) -> bool:
    """Process a single job"""
    print(f"\n{'='*70}")
    print(f"Processing: {job['title']}")
    print(f"{'='*70}")
    
    start = time.time()
    
    code = fetch_from_ipfs(job['code_cid'])
    if not code:
        return False
    
    result = execute_on_lambda(code, job)
    if not result:
        return False
    
    result_cid = upload_to_pinata(result)
    if not result_cid:
        return False
    
    exec_time = result.get('execution_time_ms', 100) / 1000
    code_size = len(code.encode('utf-8'))
    result_size = len(json.dumps(result).encode('utf-8'))
    
    cost = calculate_cost(code_size, result_size, exec_time)
    
    success = complete_job_onchain(
        program_id, job['account_address'], job,
        worker, result_cid, cost
    )
    
    elapsed = time.time() - start
    
    if success:
        print(f"\n✓ Completed in {elapsed:.2f}s")
        return True
    else:
        print(f"\n✗ Failed after {elapsed:.2f}s")
        return False

def main(program_id: str, keypair_path: str, interval: int = 10):
    """Main processing loop"""
    global running
    
    if AWS_ACCESS_KEY and AWS_SECRET_KEY:
        if not create_lambda_function():
            print("Failed to create Lambda function. Exiting.")
            return
    else:
        print("✗ AWS credentials not set. Please set:")
        print("  export AWS_ACCESS_KEY_ID='your_key'")
        print("  export AWS_SECRET_ACCESS_KEY='your_secret'")
        return
    
    if not PINATA_JWT:
        print("⚠ Warning: PINATA_JWT not set. Results will use fallback CIDs")
        print("  export PINATA_JWT='your_jwt'\n")
    
    print("="*70)
    print("Solana Job Processor")
    print("="*70)
    print(f"Program: {program_id}")
    print(f"Lambda: {LAMBDA_FUNCTION_NAME}")
    print(f"Interval: {interval}s\n")
    
    worker = load_keypair(keypair_path)
    print(f"Worker: {worker.pubkey()}\n")
    
    try:
        version = client.get_version()
        print(f"✓ Connected to Solana! Version: {version.value}\n")
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return
    
    processed = 0
    iteration = 0
    
    while running:
        iteration += 1
        print(f"\n{'#'*70}")
        print(f"Check #{iteration} - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'#'*70}")
        
        jobs = fetch_pending_jobs(program_id)
        
        if jobs:
            print(f"\nFound {len(jobs)} pending job(s)")
            for job in jobs:
                if not running:
                    break
                if process_job(job, program_id, worker):
                    processed += 1
                time.sleep(2)
        else:
            print("\nNo pending jobs")
        
        print(f"\n📊 Total processed: {processed}")
        
        if running:
            print(f"\nWaiting {interval}s...")
            for _ in range(interval):
                if not running:
                    break
                time.sleep(1)
    
    print("\nGoodbye!")

if __name__ == "__main__":
    PROGRAM_ID = "YOUR_PROGRAM_ID"
    KEYPAIR_PATH = os.path.expanduser("~/.config/solana/id.json")
    
    if len(sys.argv) > 1:
        PROGRAM_ID = sys.argv[1]
    if len(sys.argv) > 2:
        KEYPAIR_PATH = sys.argv[2]
    
    if PROGRAM_ID == "YOUR_PROGRAM_ID":
        print("Usage: python script.py <PROGRAM_ID> [KEYPAIR_PATH]")
        sys.exit(1)
    
    main(PROGRAM_ID, KEYPAIR_PATH)