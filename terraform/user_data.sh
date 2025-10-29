#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install dependencies
apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    curl \
    jq \
    awscli

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i -E ./amazon-cloudwatch-agent.deb
rm amazon-cloudwatch-agent.deb

# Create cloudmesh user
useradd -m -s /bin/bash cloudmesh

# Create application directory
mkdir -p /opt/cloudmesh/worker
chown -R cloudmesh:cloudmesh /opt/cloudmesh

# Switch to cloudmesh user for setup
sudo -u cloudmesh bash << 'EOF'
cd /opt/cloudmesh

# Clone or setup worker code (you'll need to update this with your actual repo)
# git clone https://github.com/MercyShark/CloudMesh.git
# For now, we'll create the structure manually

mkdir -p /opt/cloudmesh/worker
cd /opt/cloudmesh/worker

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
cat > requirements.txt << 'REQUIREMENTS'
solana==0.30.2
anchorpy==0.19.1
requests==2.31.0
python-dotenv==1.0.0
REQUIREMENTS

pip install -r requirements.txt

# Retrieve secrets from AWS Secrets Manager
WORKER_KEYPAIR=$(aws secretsmanager get-secret-value \
    --secret-id ${worker_keypair_secret} \
    --region ${aws_region} \
    --query SecretString \
    --output text)

PINATA_JWT=$(aws secretsmanager get-secret-value \
    --secret-id ${pinata_jwt_secret} \
    --region ${aws_region} \
    --query SecretString \
    --output text)

# Save worker keypair
echo "$WORKER_KEYPAIR" > /opt/cloudmesh/worker/worker-keypair.json
chmod 600 /opt/cloudmesh/worker/worker-keypair.json

# Create .env file
cat > /opt/cloudmesh/worker/.env << ENVFILE
SOLANA_RPC_URL=${solana_rpc_url}
PROGRAM_ID=${program_id}
WORKER_KEYPAIR_PATH=/opt/cloudmesh/worker/worker-keypair.json
PINATA_JWT=$PINATA_JWT
PINATA_GATEWAY=https://gateway.pinata.cloud
ENVIRONMENT=${environment}
ENVFILE

chmod 600 /opt/cloudmesh/worker/.env

EOF

# Create worker Python script (main.py)
cat > /opt/cloudmesh/worker/main.py << 'PYTHON_SCRIPT'
import os
import json
import time
import logging
import requests
from pathlib import Path
from dotenv import load_dotenv
from solana.rpc.api import Client
from solders.keypair import Keypair
from anchorpy import Provider, Wallet, Program

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/cloudmesh-worker.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CloudMeshWorker:
    def __init__(self):
        self.rpc_url = os.getenv('SOLANA_RPC_URL')
        self.program_id = os.getenv('PROGRAM_ID')
        self.keypair_path = os.getenv('WORKER_KEYPAIR_PATH')
        self.pinata_jwt = os.getenv('PINATA_JWT')
        
        # Initialize Solana connection
        self.client = Client(self.rpc_url)
        
        # Load worker keypair
        with open(self.keypair_path, 'r') as f:
            keypair_data = json.load(f)
        self.keypair = Keypair.from_bytes(bytes(keypair_data))
        
        logger.info(f"Worker initialized with address: {self.keypair.pubkey()}")
    
    def fetch_pending_jobs(self):
        """Fetch pending jobs from Solana program"""
        try:
            # Implementation to fetch jobs from program
            logger.info("Fetching pending jobs...")
            # Add your job fetching logic here
            return []
        except Exception as e:
            logger.error(f"Error fetching jobs: {e}")
            return []
    
    def execute_job(self, job):
        """Execute a job and upload results to IPFS"""
        try:
            logger.info(f"Executing job: {job}")
            # Add your job execution logic here
            return True
        except Exception as e:
            logger.error(f"Error executing job: {e}")
            return False
    
    def run(self):
        """Main worker loop"""
        logger.info("CloudMesh worker started")
        
        while True:
            try:
                jobs = self.fetch_pending_jobs()
                
                for job in jobs:
                    self.execute_job(job)
                
                time.sleep(10)  # Poll every 10 seconds
                
            except Exception as e:
                logger.error(f"Error in worker loop: {e}")
                time.sleep(30)

if __name__ == "__main__":
    worker = CloudMeshWorker()
    worker.run()
PYTHON_SCRIPT

chown cloudmesh:cloudmesh /opt/cloudmesh/worker/main.py

# Create systemd service
cat > /etc/systemd/system/cloudmesh-worker.service << 'SERVICE'
[Unit]
Description=CloudMesh Worker Service
After=network.target

[Service]
Type=simple
User=cloudmesh
WorkingDirectory=/opt/cloudmesh/worker
Environment="PATH=/opt/cloudmesh/worker/venv/bin"
ExecStart=/opt/cloudmesh/worker/venv/bin/python /opt/cloudmesh/worker/main.py
Restart=always
RestartSec=10
StandardOutput=append:/var/log/cloudmesh-worker.log
StandardError=append:/var/log/cloudmesh-worker-error.log

[Install]
WantedBy=multi-user.target
SERVICE

# Create log files
touch /var/log/cloudmesh-worker.log
touch /var/log/cloudmesh-worker-error.log
chown cloudmesh:cloudmesh /var/log/cloudmesh-worker*.log

# Configure CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/cloudwatch-config.json << 'CWCONFIG'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/cloudmesh-worker.log",
            "log_group_name": "/aws/ec2/${project_name}-worker",
            "log_stream_name": "{instance_id}/worker.log"
          },
          {
            "file_path": "/var/log/cloudmesh-worker-error.log",
            "log_group_name": "/aws/ec2/${project_name}-worker",
            "log_stream_name": "{instance_id}/worker-error.log"
          }
        ]
      }
    }
  }
}
CWCONFIG

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -s \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/cloudwatch-config.json

# Enable and start the service
systemctl daemon-reload
systemctl enable cloudmesh-worker
systemctl start cloudmesh-worker

logger "CloudMesh worker installation completed"
