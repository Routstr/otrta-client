# Setting Up the ecash-402-client Service

This guide explains how to set up the ecash-402-client service to run Docker containers in the background.

## Step 1: Create a systemd Service File

1. Create a new file under `/etc/systemd/system/`, for example, `ecash-402-client.service`:
   ```bash
   sudo nano /etc/systemd/system/ecash-402-client.service
   ```
2. Add the following content to the file:
   ```markdown
   [Unit]
   Description=ecash-402-client Docker Compose Service
   After=docker.service
   Requires=docker.service

   [Service]
   User=$USER
   WorkingDirectory=$PWD
   ExecStart=/usr/bin/docker-compose up -d
   ExecStop=/usr/bin/docker-compose down

   [Install]
   WantedBy=multi-user.target
   ```

## Step 2: Reload systemd Daemon and Enable the Service

1. Reload the systemd daemon:
   ```bash
   sudo systemctl daemon-reload
   ```
2. Enable the service:
   ```bash
   sudo systemctl enable ecash-402-client.service
   ```

## Step 3: Start the Service

1. Start the service:
   ```bash
   sudo systemctl start ecash-402-client.service
   ```

## Verifying the Service

To verify that the Docker containers are running, use the following command:
```bash
docker ps
```

This will list all running containers, including the ones started by the ecash-402-client service.